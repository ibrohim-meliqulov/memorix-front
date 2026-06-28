"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Flashcard {
  id: number;
  frontText: string;
  backText: string;
  example?: string;
}

interface Deck {
  id: number;
  title: string;
  description?: string;
  flashcards?: Flashcard[];
  _count?: { flashcards: number };
}

interface Stats {
  totalDecks: number;
  totalFlashcards: number;
  plan: string;
  streak: number;
  totalStudied: number;
  weekly: number[];
  limits?: { decks: number; cards: number };
}

interface User {
  firstName?: string;
  lastName?: string;
  telegramId?: string;
}

interface QuizScore {
  correct: number;
  wrong: number;
}

type Screen = "home" | "create" | "study" | "quiz" | "pro" | "account" | "progress";
type Lang = "english" | "russian" | "korean";
type InputMethod = "text" | "image";
type PricingType = "monthly" | "yearly";
type QuizMode = "choice" | "typing" | "mixed" | null;

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const API_BASE = "https://memorix-r9gk.onrender.com";

const DECK_ICONS = ["purple", "blue", "teal", "pink", "amber"] as const;
const DECK_EMOJIS = ["📚", "🌟", "🎯", "🔥", "💡", "🎨", "🚀", "💎", "🌈", "⚡"];
const LANG_LABELS: Record<Lang, string> = {
  english: "🇬🇧 Ingliz",
  russian: "🇷🇺 Rus",
  korean: "🇰🇷 Koreys",
};
const LANG_SPEECH: Record<Lang, string> = {
  english: "en-US",
  russian: "ru-RU",
  korean: "ko-KR",
};

const OB_SLIDES = [
  {
    icon: "🧠",
    title: "Memorix ga xush kelibsiz!",
    desc: "AI yordamida so'zlarni oson va tez o'rganing. Duolingo kabi — lekin o'zbek tiliga moslashgan!",
    type: "intro",
    features: null,
  },
  {
    icon: "✨",
    title: "AI bilan flashcard yarating",
    desc: null,
    type: "features",
    features: [
      { icon: "📝", title: "Matn yuboring", desc: "AI o'zi muhim so'zlarni ajratadi" },
      { icon: "📷", title: "Rasm yuklang", desc: "Lug'at sahifasi yoki ekran surati" },
      { icon: "🌐", title: "3 ta til", desc: "Ingliz, Rus, Koreys tillarida" },
    ],
  },
  {
    icon: "🎯",
    title: "O'rganish usullari",
    desc: null,
    type: "features",
    features: [
      { icon: "🔄", title: "Flip kartalar", desc: "So'z → bosing → tarjima ko'ring" },
      { icon: "🎮", title: "Quiz rejimi", desc: "4 variant yoki yozish bilan test" },
      { icon: "🔊", title: "Talaffuz", desc: "To'g'ri talaffuzni eshiting" },
    ],
  },
  {
    icon: "🚀",
    title: "Boshlashga tayyormisiz?",
    desc: "Birinchi to'plamingizni yarating va bugundan o'rganishni boshlang!",
    type: "final",
    features: null,
  },
];

const PLAN_FEATURES = [
  { icon: "📚", name: "To'plamlar", free: "3", starter: "10", pro: "Cheksiz", freeNo: false, starterNo: false, freeOk: true, starterOk: true, proOk: true },
  { icon: "📝", name: "So'zlar", free: "30", starter: "100", pro: "Cheksiz", freeNo: false, starterNo: false, freeOk: true, starterOk: true, proOk: true },
  { icon: "✨", name: "AI yaratish", free: "✓", starter: "✓", pro: "✓", freeNo: false, starterNo: false, freeOk: true, starterOk: true, proOk: true },
  { icon: "📊", name: "Statistika", free: "✗", starter: "✓", pro: "✓", freeNo: true, starterNo: false, freeOk: false, starterOk: true, proOk: true },
  { icon: "🎮", name: "Quiz", free: "✗", starter: "✓", pro: "✓", freeNo: true, starterNo: false, freeOk: false, starterOk: true, proOk: true },
  { icon: "🔁", name: "Spaced rep.", free: "✗", starter: "✗", pro: "✓", freeNo: true, starterNo: true, freeOk: false, starterOk: false, proOk: true },
  { icon: "⚡", name: "Ustuvorlik", free: "✗", starter: "✗", pro: "✓", freeNo: true, starterNo: true, freeOk: false, starterOk: false, proOk: true },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function getDeckEmoji(title: string): string {
  const map: Record<string, string> = {
    hayvon: "🐾", ovqat: "🍽️", meva: "🍎", sport: "⚽",
    kiy: "👕", uy: "🏠", tabiat: "🌿", texn: "💻", til: "🗣️", san: "🎨",
  };
  const t = (title || "").toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (t.includes(k)) return v;
  }
  return DECK_EMOJIS[Math.abs(hashStr(title)) % DECK_EMOJIS.length];
}

function getDeckIcon(index: number): string {
  return DECK_ICONS[index % DECK_ICONS.length];
}

function getStreakBadge(streak: number): { label: string; cls: string } | null {
  if (streak >= 30) return { label: "💎 Oylik!", cls: "badge-diamond" };
  if (streak >= 14) return { label: "🏆 2 hafta!", cls: "badge-gold" };
  if (streak >= 7) return { label: "⚡ 1 hafta!", cls: "badge-silver" };
  if (streak >= 3) return { label: "🔥 Boshlandi!", cls: "badge-bronze" };
  return null;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function MemorixPage() {
  // Auth & User
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Navigation
  const [activeScreen, setActiveScreen] = useState<Screen>("home");

  // Home data
  const [stats, setStats] = useState<Stats | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);

  // Toast
  const [toast, setToast] = useState<string>("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [obIndex, setObIndex] = useState(0);

  // Create screen
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [selectedLang, setSelectedLang] = useState<Lang>("english");
  const [inputMethod, setInputMethod] = useState<InputMethod>("text");
  const [textInput, setTextInput] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [aiFlashcards, setAiFlashcards] = useState<Flashcard[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");
  const [savingDeck, setSavingDeck] = useState(false);
  const [currentDeckTitleForSave, setCurrentDeckTitleForSave] = useState("");

  // Study screen
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [studyQueue, setStudyQueue] = useState<Flashcard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyLang, setStudyLang] = useState<Lang>("english");
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyFinished, setStudyFinished] = useState(false);

  // Quiz screen
  const [quizDeck, setQuizDeck] = useState<Deck | null>(null);
  const [quizCards, setQuizCards] = useState<Flashcard[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>(null);
  const [quizScore, setQuizScore] = useState<QuizScore>({ correct: 0, wrong: 0 });
  const [quizPhase, setQuizPhase] = useState<"home" | "modeSelect" | "question" | "result">("home");
  const [quizLoading, setQuizLoading] = useState(false);
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [choiceSelected, setChoiceSelected] = useState<string | null>(null);
  const [typingInput, setTypingInput] = useState("");
  const [typingChecked, setTypingChecked] = useState(false);
  const [typingCorrect, setTypingCorrect] = useState(false);

  // PRO screen
  const [pricingType, setPricingType] = useState<PricingType>("monthly");

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Celebration
  const [celebration, setCelebration] = useState<{ streak: number; badge: { label: string; cls: string } } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── API HELPER ───────────────────────────────────────────────────────────

  const apiCall = useCallback(
    async (path: string, opts: RequestInit = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(opts.headers as Record<string, string>),
      };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Xatolik yuz berdi");
      return data;
    },
    [accessToken]
  );

  // ─── TOAST ────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800);
  }, []);

  // ─── AUTH ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const authenticate = async () => {
      // URL token tekshirish
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");

      let token = urlToken;
      let userData: User | null = null;

      if (urlToken) {
        window.history.replaceState({}, "", window.location.pathname);
      }

      try {
        if (token) {
          setAccessToken(token);
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          };
          const res = await fetch(`${API_BASE}/users/me`, { headers });
          if (res.ok) {
            userData = await res.json();
            setUser(userData);
            // loadHomeData called via effect when accessToken & user set
            return;
          }
        }

        // Telegram Mini App auth
        const tg = (window as any).Telegram?.WebApp;
        if (tg) { tg.ready(); tg.expand(); }

        let result: any;
        if (tg?.initData) {
          const res = await fetch(`${API_BASE}/auth/telegram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          });
          result = await res.json();
        } else {
          const res = await fetch(`${API_BASE}/auth/dev-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegramId: "browser_test_user" }),
          });
          result = await res.json();
        }

        setAccessToken(result.accessToken);
        setUser(result.user);

        const seen = localStorage.getItem("memorix_onboarded");
        if (!seen) {
          setShowOnboarding(true);
          setObIndex(0);
        }
      } catch (err: any) {
        showToast("Kirishda xatolik: " + (err?.message || ""));
      }
    };

    authenticate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── LOAD HOME DATA ───────────────────────────────────────────────────────

  const loadHomeData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [statsData, decksData] = await Promise.all([
        apiCall("/users/me/stats").catch(() => ({
          totalDecks: 0,
          totalFlashcards: 0,
          plan: "FREE",
          streak: 0,
          totalStudied: 0,
          weekly: [],
        })),
        apiCall("/decks").catch(() => []),
      ]);
      setStats(statsData);
      setDecks(decksData);
    } catch (err: any) {
      showToast("Yuklashda xatolik: " + err?.message);
    }
  }, [accessToken, apiCall, showToast]);

  useEffect(() => {
    if (accessToken) loadHomeData();
  }, [accessToken, loadHomeData]);

  // ─── SCREEN SWITCH ────────────────────────────────────────────────────────

  const switchScreen = (name: Screen) => {
    setActiveScreen(name);
    if (name === "home") loadHomeData();
    if (name === "progress") loadHomeData();
    if (name === "quiz") setQuizPhase("home");
    if (name === "study") {
      // If not in active study session, show study home
      if (studyQueue.length === 0 || studyIndex >= studyQueue.length) {
        setStudyFinished(false);
      }
    }
  };

  // ─── ONBOARDING ───────────────────────────────────────────────────────────

  const obNextSlide = () => {
    if (obIndex < OB_SLIDES.length - 1) {
      setObIndex((i) => i + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = () => {
    localStorage.setItem("memorix_onboarded", "1");
    setShowOnboarding(false);
  };

  // ─── CREATE ───────────────────────────────────────────────────────────────

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!newDeckTitle.trim()) {
      showToast("Iltimos, to'plam nomini kiriting");
      return;
    }
    setCurrentDeckTitleForSave(newDeckTitle.trim());
    setAiLoading(true);
    setAiError("");
    setAiFlashcards([]);

    try {
      let aiResult: any;
      if (inputMethod === "text") {
        if (!textInput.trim()) throw new Error("Matn kiritilmagan");
        aiResult = await apiCall("/ai/generate-from-text", {
          method: "POST",
          body: JSON.stringify({ text: textInput, maxWords: 15, language: selectedLang }),
        });
      } else {
        if (!selectedImageFile) throw new Error("Rasm tanlanmagan");
        const formData = new FormData();
        formData.append("image", selectedImageFile);
        formData.append("language", selectedLang);
        const res = await fetch(`${API_BASE}/ai/generate-from-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        aiResult = await res.json();
        if (!res.ok) throw new Error(aiResult.message);
      }
      setAiFlashcards(aiResult.flashcards);
    } catch (err: any) {
      const msg = err?.message || "";
      const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("band");
      setAiError(isQuota ? "Gemini API limiti tugagan. Biroz kutib qayta urining." : msg);
      showToast("AI xatolik yuz berdi");
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiDeck = async () => {
    let title = currentDeckTitleForSave || newDeckTitle.trim() || "Mening to'plamim";
    setSavingDeck(true);
    const langLabel = LANG_LABELS[selectedLang];
    try {
      const deck = await apiCall("/decks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: `${aiFlashcards.length} ta so'z • ${langLabel}`,
        }),
      });
      await apiCall("/flashcards/bulk", {
        method: "POST",
        body: JSON.stringify({ deckId: deck.id, flashcards: aiFlashcards }),
      });
      showToast("✅ To'plam saqlandi!");
      setNewDeckTitle("");
      setTextInput("");
      setAiFlashcards([]);
      setSelectedImageFile(null);
      setImagePreviewUrl("");
      setAiError("");
      switchScreen("home");
    } catch (err: any) {
      const msg = err?.message || "";
      showToast(msg.includes("PRO") ? "🔒 " + msg : "Saqlashda xatolik: " + msg);
    } finally {
      setSavingDeck(false);
    }
  };

  const renameDeck = async (deckId: number, currentTitle: string) => {
    const newTitle = prompt("Yangi nom:", currentTitle);
    if (!newTitle || newTitle.trim() === currentTitle) return;
    try {
      await apiCall(`/decks/${deckId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      showToast("✅ Nom yangilandi");
      await loadHomeData();
    } catch (err: any) {
      showToast("Xatolik: " + err?.message);
    }
  };

  const deleteDeck = async (deckId: number) => {
    const tg = (window as any).Telegram?.WebApp;
    const doDelete = async () => {
      try {
        await apiCall(`/decks/${deckId}`, { method: "DELETE" });
        showToast("✅ To'plam o'chirildi");
        await loadHomeData();
      } catch (err: any) {
        showToast("Xatolik: " + err?.message);
      }
    };
    if (tg?.showConfirm) {
      tg.showConfirm("Bu to'plamni o'chirasizmi?", async (ok: boolean) => {
        if (ok) await doDelete();
      });
    } else {
      await doDelete();
    }
  };

  // ─── STUDY ────────────────────────────────────────────────────────────────

  const openDeckForStudy = async (deckId: number, deckDesc: string) => {
    let lang: Lang = "english";
    if (deckDesc.includes("🇷🇺")) lang = "russian";
    else if (deckDesc.includes("🇰🇷")) lang = "korean";
    setStudyLang(lang);
    setStudyLoading(true);
    setStudyFinished(false);
    setIsFlipped(false);
    switchScreen("study");

    try {
      const deck = await apiCall(`/decks/${deckId}`);
      setCurrentDeck(deck);
      setStudyQueue(deck.flashcards || []);
      setStudyIndex(0);
      setIsFlipped(false);
    } catch (err: any) {
      showToast("Xatolik: " + err?.message);
    } finally {
      setStudyLoading(false);
    }
  };

  const handleFlip = () => setIsFlipped((f) => !f);

  const nextCard = async () => {
    const nextIdx = studyIndex + 1;
    if (nextIdx >= studyQueue.length) {
      setStudyFinished(true);
      setStudyIndex(nextIdx);
      // Background: session + streak
      setTimeout(async () => {
        try {
          await apiCall("/flashcards/session", {
            method: "POST",
            body: JSON.stringify({ cardsStudied: studyQueue.length }),
          });
          const newStats = await apiCall("/users/me/stats");
          const newStreak = newStats.streak ?? 0;
          const badge = getStreakBadge(newStreak);
          if (badge && [3, 7, 14, 30].includes(newStreak)) {
            setCelebration({ streak: newStreak, badge });
          }
        } catch { }
      }, 300);
      return;
    }
    setStudyIndex(nextIdx);
    setIsFlipped(false);
  };

  const speakWord = async (word: string, lang: Lang) => {
    const langCode = LANG_SPEECH[lang] || "en-US";
    try {
      if (lang === "english") {
        const res = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        );
        const data = await res.json();
        const audioUrl = data[0]?.phonetics?.find((p: any) => p.audio)?.audio;
        if (audioUrl) {
          new Audio(audioUrl).play();
          return;
        }
      }
    } catch { }
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = langCode;
      window.speechSynthesis.speak(u);
    }
  };

  // ─── QUIZ ─────────────────────────────────────────────────────────────────

  const selectQuizDeck = async (deckId: number) => {
    setQuizLoading(true);
    try {
      const deck = await apiCall(`/decks/${deckId}`);
      if (!deck.flashcards || deck.flashcards.length < 4) {
        showToast("Quiz uchun kamida 4 ta so'z kerak!");
        setQuizLoading(false);
        return;
      }
      setQuizDeck(deck);
      const shuffled = [...deck.flashcards].sort(() => Math.random() - 0.5);
      setQuizCards(shuffled);
      setQuizIndex(0);
      setQuizScore({ correct: 0, wrong: 0 });
      setQuizPhase("modeSelect");
    } catch (err: any) {
      showToast("Xatolik: " + err?.message);
    } finally {
      setQuizLoading(false);
    }
  };

  const startQuiz = (mode: "choice" | "typing" | "mixed") => {
    if (!quizDeck) return;
    setQuizMode(mode);
    setQuizIndex(0);
    setQuizScore({ correct: 0, wrong: 0 });
    const shuffled = [...(quizDeck.flashcards || [])].sort(() => Math.random() - 0.5);
    setQuizCards(shuffled);
    setChoiceSelected(null);
    setTypingInput("");
    setTypingChecked(false);
    prepareQuestion(shuffled, 0, mode);
    setQuizPhase("question");
  };

  const prepareQuestion = (
    cards: Flashcard[],
    idx: number,
    mode: "choice" | "typing" | "mixed"
  ) => {
    const total = cards.length;
    let currentMode: "choice" | "typing" = mode === "mixed"
      ? idx < Math.ceil(total / 2) ? "choice" : "typing"
      : (mode as "choice" | "typing");

    if (currentMode === "choice") {
      const card = cards[idx];
      const correct = card.backText;
      const others = (quizDeck?.flashcards || cards)
        .filter((c) => c.id !== card.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c) => c.backText);
      const options = [correct, ...others].sort(() => Math.random() - 0.5);
      setChoiceOptions(options);
    } else {
      setChoiceOptions([]);
    }
    setChoiceSelected(null);
    setTypingInput("");
    setTypingChecked(false);
    setTypingCorrect(false);
  };

  const getCurrentQuizMode = (): "choice" | "typing" => {
    if (!quizMode || quizMode === "choice" || quizMode === "typing") {
      return (quizMode as "choice" | "typing") || "choice";
    }
    // mixed
    const total = quizCards.length;
    return quizIndex < Math.ceil(total / 2) ? "choice" : "typing";
  };

  const checkChoice = (selected: string) => {
    if (choiceSelected) return;
    const correct = quizCards[quizIndex]?.backText;
    setChoiceSelected(selected);
    const isCorrect = selected === correct;
    setQuizScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      wrong: s.wrong + (isCorrect ? 0 : 1),
    }));
    setTimeout(() => {
      nextQuizQuestion();
    }, isCorrect ? 900 : 1400);
  };

  const checkTyping = () => {
    if (typingChecked) return;
    const userAnswer = typingInput.trim().toLowerCase();
    const correct = quizCards[quizIndex]?.backText?.toLowerCase().trim() || "";
    const isCorrect =
      userAnswer === correct ||
      (correct.includes(userAnswer) && userAnswer.length > 2) ||
      userAnswer.includes(correct.split(",")[0].trim());
    setTypingChecked(true);
    setTypingCorrect(isCorrect);
    setQuizScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      wrong: s.wrong + (isCorrect ? 0 : 1),
    }));
    if (isCorrect) {
      setTimeout(() => nextQuizQuestion(), 900);
    }
  };

  const nextQuizQuestion = () => {
    const nextIdx = quizIndex + 1;
    if (nextIdx >= quizCards.length) {
      setQuizPhase("result");
      return;
    }
    setQuizIndex(nextIdx);
    prepareQuestion(quizCards, nextIdx, quizMode as any);
  };

  // ─── STATS RENDER HELPERS ─────────────────────────────────────────────────

  const dayLabels = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;
  const weekly = stats?.weekly || [0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...weekly, 1);

  // ─── USER DISPLAY ─────────────────────────────────────────────────────────
  const userName = user?.firstName || "Do'st";
  const avatarLetter = userName[0]?.toUpperCase() || "?";

  // ─── QUIZ RESULT ──────────────────────────────────────────────────────────
  const quizTotal = quizCards.length;
  const quizPct = quizTotal > 0 ? Math.round((quizScore.correct / quizTotal) * 100) : 0;
  const quizEmoji = quizPct >= 90 ? "🏆" : quizPct >= 70 ? "🎉" : quizPct >= 50 ? "👍" : "💪";
  const quizMsg =
    quizPct >= 90 ? "Ajoyib natija!" : quizPct >= 70 ? "Yaxshi!" : quizPct >= 50 ? "Yaxshi boshlanish!" : "Davom eting!";

  // ─── CURRENT STUDY CARD ───────────────────────────────────────────────────
  const currentCard = studyQueue[studyIndex];
  const studyProgress = studyQueue.length > 0 ? (studyIndex / studyQueue.length) * 100 : 0;

  // ─── STREAK ───────────────────────────────────────────────────────────────
  const streak = stats?.streak ?? 0;
  const streakBadge = getStreakBadge(streak);
  const streakFire = streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "📅";

  // ─── CELEBRATION MSGS ─────────────────────────────────────────────────────
  const celebrationMsgs: Record<number, { title: string; sub: string }> = {
    3: { title: "🔥 3 kun ketma-ket!", sub: "Zo'r! Siz haqiqiy o'quvchisiz. Davom eting!" },
    7: { title: "⚡ Bir hafta!", sub: "Bir hafta to'xtovsiz o'rgandingiz. Ajoyib!" },
    14: { title: "🏆 Ikki hafta!", sub: "Ikkita haftadir har kuni kelasiz. Ustasiz!" },
    30: { title: "💎 Butun oy!", sub: "Bir oylik streak! Siz Memorix legendasiz!" },
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        :root {
          --bg1: #0a0015;
          --bg2: #1a0035;
          --bg3: #0d1545;
          --glass: rgba(255,255,255,0.06);
          --glass-border: rgba(255,255,255,0.10);
          --accent: #6C5CE7;
          --accent2: #a855f7;
          --text: #ffffff;
          --text-dim: rgba(255,255,255,0.4);
          --text-mid: rgba(255,255,255,0.7);
          --success: #10b981;
          --danger: #ef4444;
          --radius: 18px;
          --radius-sm: 12px;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        html, body { min-height: 100vh; }
        .memorix-root {
          background: linear-gradient(135deg, var(--bg1) 0%, var(--bg2) 50%, var(--bg3) 100%);
          background-attachment: fixed;
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          padding-bottom: 90px;
          position: relative;
          overflow-x: hidden;
        }
        .memorix-root::before {
          content: '';
          position: fixed;
          top: -80px; left: -60px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(108,92,231,0.3) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .memorix-root::after {
          content: '';
          position: fixed;
          top: 200px; right: -60px;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .glass { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
        .header { padding: 20px 20px 12px; display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 10; }
        .logo { display: flex; align-items: center; gap: 8px; }
        .logo-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent2); box-shadow: 0 0 16px var(--accent2); }
        .logo-text { font-size: 22px; font-weight: 800; color: white; letter-spacing: -0.03em; }
        .logo-sub { font-size: 11px; color: var(--text-dim); margin-top: 1px; margin-left: 18px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: white; }
        .screen { display: none; padding: 0 16px; animation: fadeUp 0.2s ease; position: relative; z-index: 5; }
        .screen.active { display: block; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .section-label { font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin: 20px 0 10px; }
        .stats-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 4px; }
        .stat-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 14px 12px; }
        .stat-card.accent { background: linear-gradient(135deg, rgba(108,92,231,0.35), rgba(168,85,247,0.25)); border-color: rgba(168,85,247,0.4); }
        .stat-card .num { font-size: 22px; font-weight: 800; color: white; }
        .stat-card .lbl { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
        .stat-card.accent .lbl { color: rgba(168,85,247,0.8); }
        .deck-list { display: flex; flex-direction: column; gap: 10px; }
        .deck-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 14px 16px; display: flex; align-items: center; transition: border-color 0.15s, transform 0.1s; cursor: pointer; }
        .deck-card:active { transform: scale(0.98); }
        .deck-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 12px; flex-shrink: 0; }
        .deck-icon.purple { background: linear-gradient(135deg, #6C5CE7, #a855f7); }
        .deck-icon.blue { background: linear-gradient(135deg, #0ea5e9, #6366f1); }
        .deck-icon.teal { background: linear-gradient(135deg, #0d9488, #0ea5e9); }
        .deck-icon.pink { background: linear-gradient(135deg, #ec4899, #a855f7); }
        .deck-icon.amber { background: linear-gradient(135deg, #f59e0b, #ef4444); }
        .deck-body { flex: 1; min-width: 0; }
        .deck-title { font-size: 15px; font-weight: 700; color: white; margin-bottom: 3px; }
        .deck-meta { font-size: 12px; color: var(--text-dim); }
        .deck-actions { display: flex; align-items: center; gap: 6px; }
        .deck-count { background: rgba(108,92,231,0.2); border: 1px solid rgba(108,92,231,0.35); color: #c4b5fd; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; white-space: nowrap; }
        .icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 8px; font-size: 16px; transition: background 0.15s; color: var(--text-dim); }
        .icon-btn:active { background: rgba(255,255,255,0.1); }
        .icon-btn.danger { color: rgba(239,68,68,0.6); }
        .empty-state { text-align: center; padding: 60px 20px; color: var(--text-dim); }
        .empty-state .icon { font-size: 44px; margin-bottom: 14px; opacity: 0.5; }
        .empty-state p { font-size: 14px; line-height: 1.6; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .stat-big { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 16px; text-align: center; }
        .stat-big .emoji { font-size: 28px; margin-bottom: 6px; }
        .stat-big .val { font-size: 26px; font-weight: 800; color: white; }
        .stat-big .lbl2 { font-size: 11px; color: var(--text-dim); margin-top: 3px; }
        .chart-wrap { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 14px; margin-bottom: 20px; }
        .chart-title { font-size: 11px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
        .bars { display: flex; gap: 5px; align-items: flex-end; height: 72px; }
        .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .bar-val { font-size: 10px; color: var(--text-dim); font-weight: 600; min-height: 12px; }
        .bar-wrap { width: 100%; flex: 1; display: flex; align-items: flex-end; }
        .bar { width: 100%; min-height: 3px; border-radius: 4px 4px 0 0; background: rgba(255,255,255,0.08); }
        .bar.active { background: linear-gradient(180deg, #a855f7, #6C5CE7); box-shadow: 0 0 10px rgba(168,85,247,0.5); }
        .bar.filled { background: rgba(108,92,231,0.4); }
        .bar-day { font-size: 10px; color: var(--text-dim); }
        .bar-day.today { color: #a855f7; font-weight: 700; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(10,0,21,0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-top: 1px solid rgba(255,255,255,0.07); display: flex; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); gap: 4px; z-index: 100; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px; border-radius: 12px; color: var(--text-dim); cursor: pointer; transition: all 0.15s; background: none; border: none; font-family: inherit; }
        .nav-item.active { color: #c4b5fd; background: rgba(108,92,231,0.2); }
        .nav-item svg { width: 22px; height: 22px; }
        .nav-item span { font-size: 10px; font-weight: 700; letter-spacing: 0.02em; }
        .field-label { font-size: 12px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.08em; margin: 18px 0 8px; }
        .mx-input, .mx-textarea { width: 100%; background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 14px 16px; color: white; font-family: inherit; font-size: 15px; outline: none; resize: none; transition: border-color 0.15s; }
        .mx-input:focus, .mx-textarea:focus { border-color: rgba(168,85,247,0.6); }
        .mx-input::placeholder, .mx-textarea::placeholder { color: var(--text-dim); }
        .mx-textarea { min-height: 130px; }
        .seg-tabs { display: flex; background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: 100px; padding: 4px; gap: 4px; margin-bottom: 16px; }
        .seg-tab { flex: 1; text-align: center; padding: 9px; border-radius: 100px; font-size: 13px; font-weight: 700; color: var(--text-dim); cursor: pointer; transition: all 0.15s; border: none; background: none; font-family: inherit; }
        .seg-tab.active { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; }
        .upload-zone { border: 1.5px dashed rgba(255,255,255,0.15); border-radius: var(--radius); padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.15s; }
        .upload-zone:hover { border-color: var(--accent2); background: rgba(168,85,247,0.05); }
        .upload-zone .uz-icon { font-size: 36px; margin-bottom: 10px; }
        .upload-zone .uz-title { font-size: 15px; font-weight: 700; color: white; margin-bottom: 4px; }
        .upload-zone .uz-sub { font-size: 13px; color: var(--text-dim); }
        .btn { width: 100%; padding: 16px; border-radius: var(--radius); border: none; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
        .btn:active { transform: scale(0.98); }
        .btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; margin-top: 16px; box-shadow: 0 4px 20px rgba(108,92,231,0.4); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-success { background: linear-gradient(135deg, #059669, #10b981); color: white; }
        .btn-fail { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .btn-glass { background: var(--glass); border: 1px solid var(--glass-border); color: white; }
        .preview-list { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
        .preview-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 13px 15px; }
        .preview-card .pf { font-weight: 700; font-size: 15px; color: white; }
        .preview-card .pb { color: #c4b5fd; font-size: 14px; margin-top: 3px; }
        .preview-card .pe { color: var(--text-dim); font-size: 12px; margin-top: 5px; font-style: italic; }
        .study-progress { height: 4px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; margin-bottom: 24px; }
        .study-progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); border-radius: 100px; transition: width 0.3s ease; }
        .flip-scene { width: 100%; height: 280px; cursor: pointer; perspective: 1000px; }
        .flip-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(0.4,0,0.2,1); }
        .flip-inner.flipped { transform: rotateY(180deg); }
        .flip-front, .flip-back { position: absolute; top: 0; left: 0; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 36px 24px; background: var(--glass); border: 1px solid var(--glass-border); }
        .flip-back { transform: rotateY(180deg); background: linear-gradient(145deg, rgba(108,92,231,0.15), rgba(168,85,247,0.1)); border-color: rgba(168,85,247,0.35); }
        .flip-front .fc-word { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: white; }
        .flip-front .fc-tap { font-size: 12px; color: var(--text-dim); margin-top: 20px; }
        .flip-back .fc-trans { font-size: 24px; color: #c4b5fd; font-weight: 700; }
        .flip-back .fc-ex { font-size: 13px; color: var(--text-dim); margin-top: 12px; line-height: 1.5; font-style: italic; }
        .speak-btn { display: flex; align-items: center; gap: 8px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: 100px; padding: 10px 20px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; margin: 14px auto 0; font-family: inherit; transition: background 0.15s; }
        .speak-btn:active { background: rgba(255,255,255,0.12); }
        .study-actions { display: flex; gap: 10px; margin-top: 14px; }
        .study-actions .btn { margin-top: 0; }
        .loader { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px; }
        .spinner { width: 34px; height: 34px; border: 3px solid rgba(255,255,255,0.08); border-top-color: var(--accent2); border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loader p { color: var(--text-dim); font-size: 14px; }
        .toast { position: fixed; bottom: 100px; left: 16px; right: 16px; background: rgba(30,27,58,0.95); border: 1px solid rgba(168,85,247,0.3); border-radius: var(--radius-sm); padding: 14px 18px; font-size: 14px; text-align: center; transform: translateY(100px); opacity: 0; transition: all 0.25s ease; z-index: 500; backdrop-filter: blur(20px); }
        .toast.show { transform: translateY(0); opacity: 1; }
        .quiz-deck-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 16px 18px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.15s; margin-bottom: 10px; }
        .quiz-deck-card:active { transform: scale(0.98); }
        .quiz-deck-card:hover { border-color: rgba(168,85,247,0.4); }
        .quiz-mode-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 20px; cursor: pointer; transition: all 0.15s; text-align: center; margin-bottom: 12px; }
        .quiz-mode-card:active { transform: scale(0.98); }
        .quiz-mode-icon { font-size: 36px; margin-bottom: 10px; }
        .quiz-mode-title { font-size: 16px; font-weight: 700; color: white; margin-bottom: 4px; }
        .quiz-mode-sub { font-size: 12px; color: var(--text-dim); }
        .choice-btn { width: 100%; padding: 14px 16px; background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); color: white; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-align: left; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
        .choice-btn:active { transform: scale(0.98); }
        .choice-btn.correct { background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.6); color: #6ee7b7; }
        .choice-btn.wrong { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); color: #fca5a5; }
        .choice-btn.disabled { pointer-events: none; opacity: 0.5; }
        .choice-letter { width: 28px; height: 28px; border-radius: 8px; background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }
        .choice-btn.correct .choice-letter { background: rgba(16,185,129,0.3); }
        .choice-btn.wrong .choice-letter { background: rgba(239,68,68,0.3); }
        .quiz-input { width: 100%; background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 16px; color: white; font-family: inherit; font-size: 18px; font-weight: 700; outline: none; text-align: center; letter-spacing: 0.05em; transition: border-color 0.15s; margin-bottom: 12px; }
        .quiz-input:focus { border-color: rgba(168,85,247,0.6); }
        .quiz-input.correct { border-color: rgba(16,185,129,0.6); background: rgba(16,185,129,0.1); color: #6ee7b7; }
        .quiz-input.wrong { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.1); color: #fca5a5; }
        .quiz-question { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 28px 20px; text-align: center; margin-bottom: 20px; }
        .quiz-question .q-label { font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
        .quiz-question .q-word { font-size: 28px; font-weight: 800; color: white; }
        .quiz-question .q-hint { font-size: 13px; color: var(--text-dim); margin-top: 8px; }
        .result-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); padding: 28px 20px; text-align: center; margin-bottom: 16px; }
        .streak-banner { background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1)); border: 1px solid rgba(245,158,11,0.3); border-radius: var(--radius); padding: 14px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .streak-fire { font-size: 32px; animation: pulse 1.5s ease infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        .streak-info { flex: 1; }
        .streak-num { font-size: 22px; font-weight: 800; color: #fbbf24; }
        .streak-label { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 1px; }
        .streak-badge-pill { font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 100px; white-space: nowrap; }
        .badge-bronze { background: rgba(180,83,9,0.3); color: #fbbf24; border: 1px solid rgba(180,83,9,0.5); }
        .badge-silver { background: rgba(100,116,139,0.3); color: #e2e8f0; border: 1px solid rgba(100,116,139,0.5); }
        .badge-gold { background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid rgba(234,179,8,0.4); }
        .badge-diamond { background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4); }
        .celebration { position: fixed; inset: 0; z-index: 999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .celebration-card { background: linear-gradient(145deg, #1e1b3a, #2d1f5e); border: 1px solid rgba(168,85,247,0.4); border-radius: 28px; padding: 36px 28px; text-align: center; max-width: 300px; width: 90%; animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes popIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
        .celebration-emoji { font-size: 64px; margin-bottom: 12px; }
        .celebration-title { font-size: 22px; font-weight: 800; color: white; margin-bottom: 8px; }
        .celebration-sub { font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 20px; line-height: 1.5; }
        .celebration-badge { font-size: 16px; font-weight: 800; padding: 10px 24px; border-radius: 100px; display: inline-block; margin-bottom: 20px; }
        .celebration-close { width: 100%; padding: 14px; border-radius: var(--radius); border: none; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; }
        .pro-header { text-align: center; padding: 16px 0 20px; }
        .pro-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, var(--accent), var(--accent2)); padding: 6px 18px; border-radius: 100px; margin-bottom: 14px; }
        .pro-badge span { font-size: 12px; font-weight: 800; color: white; letter-spacing: 0.06em; }
        .pro-h2 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
        .pro-sub { color: var(--text-dim); font-size: 13px; margin-top: 6px; }
        .plan-card { background: var(--glass); border: 1px solid var(--glass-border); border-radius: 20px; padding: 18px; position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .plan-card.pro-card { background: linear-gradient(145deg, rgba(30,27,58,0.9), rgba(45,31,94,0.9)); border-color: rgba(168,85,247,0.5); }
        .plan-name { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 10px; }
        .plan-card.pro-card .plan-name { color: #c4b5fd; }
        .plan-price { font-size: 26px; font-weight: 800; color: white; }
        .plan-period { font-size: 11px; color: var(--text-dim); margin-bottom: 14px; }
        .plan-rec { position: absolute; top: 12px; right: -8px; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; font-size: 9px; font-weight: 800; padding: 3px 16px 3px 10px; border-radius: 100px 0 0 100px; letter-spacing: 0.05em; }
        .plan-btn { margin-top: auto; width: 100%; padding: 11px 10px; background: linear-gradient(135deg, var(--accent), var(--accent2)); color: white; border: none; border-radius: 12px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
        .plan-current { margin-top: auto; text-align: center; font-size: 12px; color: var(--text-dim); padding: 11px 10px; border: 1px solid var(--glass-border); border-radius: 12px; }
        .pf-item { font-size: 12px; display: flex; align-items: center; gap: 6px; }
        .pf-item.ok { color: rgba(255,255,255,0.7); }
        .pf-item.no { color: rgba(255,255,255,0.25); }
        .pf-item.pro-ok { color: #86efac; }
        .feature-table { background: var(--glass); border: 1px solid var(--glass-border); border-radius: var(--radius); overflow: hidden; margin-bottom: 20px; }
        .ft-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; padding: 11px 14px; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
        .ft-row:first-child { border-top: none; }
        .ft-row:nth-child(even) { background: rgba(255,255,255,0.03); }
        .ft-col-name { display: flex; align-items: center; gap: 7px; color: rgba(255,255,255,0.7); }
        /* sidebar-top only shows on desktop */
        .sidebar-top { display: none; }
        .sidebar-avatar-wrap { display: none; }
        .ob-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2); transition: all 0.3s ease; }
        .ob-dot.active { width: 24px; border-radius: 4px; background: var(--accent2); }
        .ob-icon { font-size: 80px; margin-bottom: 24px; animation: obFloat 3s ease-in-out infinite; }
        @keyframes obFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .ob-title { font-size: 26px; font-weight: 800; color: white; letter-spacing: -0.02em; margin-bottom: 12px; }
        .ob-desc { font-size: 15px; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 280px; }
        .ob-feature { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; width: 100%; text-align: left; }
        .ob-feature-icon { font-size: 24px; flex-shrink: 0; }
        .ob-feature-text { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.4; }
        .ob-feature-text strong { color: white; display: block; margin-bottom: 2px; }

        /* Progress sahifasi */
        #screen-progress { max-width: 720px; margin: 0 auto; }

        /* home-layout: mobile da bitta ustun */
        .home-layout { display: flex; flex-direction: column; gap: 0; }
        .home-right { margin-top: 4px; }
        .plan-cards-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 20px; }
        @media (min-width: 640px) { .plan-cards-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
        /* ── DESKTOP RESPONSIVE ── */
        @media (min-width: 768px) {
          .memorix-root { display: flex; min-height: 100vh; padding-bottom: 0; background: #ededf7; }
          .memorix-root::before, .memorix-root::after { display: none; }

          /* ── SIDEBAR ── */
          .bottom-nav {
            position: fixed;
            left: 0; top: 0; bottom: 0; right: auto;
            width: 220px;
            flex-direction: column;
            border-top: none;
            border-right: 1px solid rgba(0,0,0,0.07);
            padding: 0;
            gap: 0;
            background: rgba(255,255,255,0.97);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            align-items: stretch;
            justify-content: flex-start;
            overflow: hidden;
            transition: width 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s;
            z-index: 200;
          }
          .bottom-nav.sidebar-closed {
            width: 56px;
            border-right: 1px solid rgba(0,0,0,0.07);
            overflow: hidden;
          }
          /* Sidebar yopiq — ikonka markazda, matn yashirinsin */
          .bottom-nav.sidebar-closed .nav-item {
            justify-content: center;
            padding: 10px 0;
            gap: 0;
          }
          .bottom-nav.sidebar-closed .nav-item span {
            display: none;
          }
          .bottom-nav.sidebar-closed .sidebar-top {
            padding: 20px 4px 12px;
            align-items: center;
          }
          .bottom-nav.sidebar-closed .sidebar-top .logo-text,
          .bottom-nav.sidebar-closed .sidebar-top .logo-sub,
          .bottom-nav.sidebar-closed .sidebar-top span {
            display: none;
          }
          .bottom-nav.sidebar-closed .sidebar-top > div {
            border-bottom: 1px solid rgba(0,0,0,0.07);
            padding: 6px 0 14px !important;
            padding-left: 0 !important;
            justify-content: center;
          }
          .bottom-nav.sidebar-closed .sidebar-avatar-wrap {
            justify-content: center;
            padding: 14px 0 20px;
          }
          .bottom-nav.sidebar-closed .avatar-name,
          .bottom-nav.sidebar-closed .sidebar-avatar-wrap button span,
          .bottom-nav.sidebar-closed .sidebar-avatar-wrap > button > span {
            display: none;
          }
          .bottom-nav.sidebar-closed .sidebar-avatar-wrap button {
            justify-content: center;
            padding: 8px 4px;
          }
          .bottom-nav::before { display: none; }

          /* Toggle button — always visible, floats on sidebar edge */
          .sidebar-toggle {
            display: flex;
            position: fixed;
            top: 18px;
            left: 18px;
            z-index: 300;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: rgba(255,255,255,0.95);
            border: 1px solid rgba(0,0,0,0.09);
            box-shadow: 0 2px 10px rgba(0,0,0,0.10);
            cursor: pointer;
            align-items: center;
            justify-content: center;
            transition: background 0.15s, box-shadow 0.15s;
            color: #6C5CE7;
          }
          .sidebar-toggle:hover {
            background: white;
            box-shadow: 0 4px 18px rgba(108,92,231,0.18);
          }

          .sidebar-top {
            display: flex;
            flex-direction: column;
            padding: 16px 14px 12px;
            flex-shrink: 0;
          }

          .nav-item {
            flex-direction: row;
            justify-content: flex-start;
            gap: 12px;
            padding: 9px 14px;
            border-radius: 10px;
            flex: 0 0 auto;
            color: #64748b;
            font-family: inherit;
            transition: color 0.15s, background 0.15s;
            white-space: nowrap;
          }
          .nav-item:hover { color: #1e293b; background: rgba(108,92,231,0.08); }
          .nav-item.active { color: #6C5CE7; background: rgba(108,92,231,0.1); font-weight: 700; }
          .nav-item svg { width: 16px; height: 16px; flex-shrink: 0; stroke: currentColor; min-width: 16px; }
          .nav-item span { font-size: 13px; font-weight: 500; letter-spacing: 0; }
          .nav-item.active span { font-weight: 700; }

          .sidebar-avatar-wrap {
            margin-top: auto;
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 10px;
            padding: 14px 16px 20px;
            border-top: 1px solid rgba(0,0,0,0.07);
            white-space: nowrap;
          }
          .avatar {
            width: 28px; height: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6C5CE7, #a855f7);
            display: flex; align-items: center; justify-content: center;
            font-size: 12px; font-weight: 700; color: white;
            flex-shrink: 0;
          }
          .avatar-name { font-size: 12px; color: #94a3b8; font-weight: 500; }

          .avatar-mobile { display: none; }
          .sidebar-top { display: flex; flex-direction: column; }
          .header { padding: 20px 32px 12px 64px; max-width: 1000px; }
          .logo { display: none; }
          .logo-sub { font-size: 16px; font-weight: 600; color: #1e293b; margin-left: 0; }

          /* ── Content area ── */
          .desktop-content {
            margin-left: 220px;
            flex: 1;
            min-height: 100vh;
            transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1);
            display: flex;
            flex-direction: column;
            background: #f4f3ff;
          }
          .desktop-content.sidebar-closed { margin-left: 56px; }

          /* Screen wrapper — markazlashgan, chiroyli padding */
          .screen {
            padding: 0 40px 40px;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
          }

          /* Header ham markazlashgan */
          .header {
            padding: 20px 40px 12px 64px;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
          }
          /* Desktop header matnlari qora */
          .header .logo-sub { color: #1e293b; }
          .header .avatar-mobile { display: none; }
          /* Section label desktop da qora */
          .section-label { color: #94a3b8; }
          /* Desktop — barcha matnlar qoramtir */
          .desktop-content .greeting-name { color: #1e293b !important; }
          .desktop-content .greeting-sub { color: #64748b !important; }
          .desktop-content .section-label { color: #94a3b8 !important; }
          .desktop-content .stat-card .num { color: #1e293b; }
          .desktop-content .stat-card .lbl { color: #64748b; }
          .desktop-content .deck-title { color: #1e293b !important; }
          .desktop-content .deck-meta { color: #64748b !important; }
          .desktop-content .stat-big .val { color: #1e293b !important; }
          .desktop-content .stat-big .lbl2 { color: #64748b !important; }
          .desktop-content .stat-big .emoji { filter: none; }
          .desktop-content .chart-title { color: #94a3b8 !important; }
          .desktop-content .bar-day { color: #94a3b8 !important; }
          .desktop-content .bar-day.today { color: #6C5CE7 !important; }
          .desktop-content .bar-val { color: #64748b !important; }
          .desktop-content .streak-num { color: #f59e0b !important; }
          .desktop-content .streak-label { color: #64748b !important; }
          .desktop-content .loader p { color: #64748b !important; }
          .desktop-content .empty-state { color: #94a3b8 !important; }
          .desktop-content .field-label { color: #64748b !important; }
          .desktop-content .preview-card { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .preview-card .pf { color: #1e293b !important; }
          .desktop-content .preview-card .pb { color: #6C5CE7 !important; }
          .desktop-content .preview-card .pe { color: #94a3b8 !important; }
          .desktop-content .mx-input,
          .desktop-content .mx-textarea { background: white !important; border-color: rgba(200,196,230,0.6) !important; color: #1e293b !important; }
          .desktop-content .mx-input::placeholder,
          .desktop-content .mx-textarea::placeholder { color: #94a3b8 !important; }
          .desktop-content .seg-tabs { background: rgba(108,92,231,0.08) !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .seg-tab { color: #64748b !important; }
          .desktop-content .seg-tab.active { color: white !important; }
          .desktop-content .upload-zone { border-color: rgba(200,196,230,0.8) !important; }
          .desktop-content .upload-zone .uz-title { color: #1e293b !important; }
          .desktop-content .upload-zone .uz-sub { color: #64748b !important; }
          .desktop-content .flip-front { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .flip-front .fc-word { color: #1e293b !important; }
          .desktop-content .flip-front .fc-tap { color: #94a3b8 !important; }
          .desktop-content .flip-back .fc-trans { color: #6C5CE7 !important; }
          .desktop-content .flip-back .fc-ex { color: #64748b !important; }
          .desktop-content .study-actions .btn-glass { background: white !important; border-color: rgba(200,196,230,0.5) !important; color: #1e293b !important; }
          .desktop-content .quiz-question { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .quiz-question .q-label { color: #94a3b8 !important; }
          .desktop-content .quiz-question .q-word { color: #1e293b !important; }
          .desktop-content .quiz-question .q-hint { color: #64748b !important; }
          .desktop-content .choice-btn { background: white !important; border-color: rgba(200,196,230,0.5) !important; color: #1e293b !important; }
          .desktop-content .choice-btn.correct { background: rgba(16,185,129,0.08) !important; border-color: rgba(16,185,129,0.4) !important; color: #059669 !important; }
          .desktop-content .choice-btn.wrong { background: rgba(239,68,68,0.08) !important; border-color: rgba(239,68,68,0.3) !important; color: #dc2626 !important; }
          .desktop-content .quiz-input { background: white !important; border-color: rgba(200,196,230,0.6) !important; color: #1e293b !important; }
          .desktop-content .result-card { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .glass { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .icon-btn { color: #94a3b8 !important; }
          .desktop-content .icon-btn.danger { color: rgba(239,68,68,0.6) !important; }
          .desktop-content .quiz-mode-card { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .quiz-mode-title { color: #1e293b !important; }
          .desktop-content .quiz-mode-sub { color: #64748b !important; }
          .desktop-content .pro-h2 { color: #1e293b !important; }
          .desktop-content .pro-sub { color: #64748b !important; }
          .desktop-content .plan-card { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .plan-card.pro-card { background: linear-gradient(145deg,#1e1b3a,#2d1f5e) !important; border-color: rgba(168,85,247,0.5) !important; }
          .desktop-content .plan-name { color: #94a3b8 !important; }
          .desktop-content .plan-card.pro-card .plan-name { color: #c4b5fd !important; }
          .desktop-content .plan-price { color: #1e293b !important; }
          .desktop-content .plan-period { color: #64748b !important; }
          .desktop-content .plan-card.pro-card .plan-price,
          .desktop-content .plan-card.pro-card .plan-period { color: white !important; }
          .desktop-content .feature-table { background: white !important; border-color: rgba(200,196,230,0.5) !important; }
          .desktop-content .ft-row { border-color: rgba(200,196,230,0.3) !important; }
          .desktop-content .ft-col-name { color: #475569 !important; }
          .desktop-content .pf-item.ok { color: #475569 !important; }
          .desktop-content .pf-item.no { color: #cbd5e1 !important; }

          /* ── Home sahifa: deck + stats 2 ustun ── */
          .home-layout {
            display: grid;
            grid-template-columns: 1fr 340px;
            gap: 20px;
            align-items: start;
          }
          .home-left { min-width: 0; }
          .home-right { min-width: 0; }

          /* Stats strip — yuqorida, to'liq kenglik */
          .stats-strip {
            grid-template-columns: repeat(3,1fr);
            gap: 12px;
            margin-bottom: 12px;
          }
          .stat-card { padding: 18px 16px; background: white; border-color: rgba(200,196,230,0.6); box-shadow: 0 2px 8px rgba(108,92,231,0.08); }
          .stat-card .num { color: #1e293b; }
          .stat-card .lbl { color: #64748b; }
          .stat-card.accent { background: linear-gradient(135deg,rgba(108,92,231,0.12),rgba(168,85,247,0.08)); border-color: rgba(168,85,247,0.3); }
          .stat-card.accent .num { color: #4f46e5; }
          .stat-card.accent .lbl { color: #7c3aed; }
          .stat-card .num { font-size: 26px; }
          .stat-card .lbl { font-size: 12px; margin-top: 3px; }

          /* Deck list — bir ustun (home-left ichida) */
          .deck-list { display: flex; flex-direction: column; gap: 10px; }
          .deck-card { padding: 14px 18px; background: white; border-color: rgba(200,196,230,0.5); box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
          .deck-card:hover { border-color: rgba(108,92,231,0.35); background: white; box-shadow: 0 4px 16px rgba(108,92,231,0.12); }
          .deck-title { color: #1e293b; }
          .deck-meta { color: #64748b; }

          /* Stats bo'limi — home-right ichida */
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .stat-big { padding: 14px; background: white; border-color: rgba(200,196,230,0.5); box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
          .stat-big .val { font-size: 22px; color: #1e293b; }
          .stat-big .lbl2 { color: #64748b; }
          .chart-wrap { padding: 14px; margin-bottom: 0; background: white; border-color: rgba(200,196,230,0.5); box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
          .chart-title { color: #94a3b8; }
          .bars { height: 80px; }
          .bar { background: rgba(108,92,231,0.1); }
          .bar.filled { background: rgba(108,92,231,0.3); }
          .streak-banner { background: linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.06)); border-color: rgba(245,158,11,0.25); }
          .streak-label { color: #64748b; }

          /* Study sahifasi — markazda, katta karta */
          #screen-study {
            max-width: 680px;
            margin: 0 auto;
          }
          .flip-scene { height: 320px; }
          .flip-front .fc-word { font-size: 36px; }
          .flip-back .fc-trans { font-size: 28px; }

          /* Kichik sahifalar — markazda */
          #screen-create, #screen-quiz, #screen-pro, #screen-account {
            max-width: 660px;
            margin: 0 auto;
          }
          #screen-progress {
            max-width: 800px;
            margin: 0 auto;
          }

          .btn { font-size: 15px; padding: 15px; }
          .seg-tab { padding: 9px 12px; font-size: 13px; }
          .toast {
            left: 250px;
            right: 40px;
            bottom: 24px;
            max-width: 440px;
            margin: 0 auto;
            transition: left 0.25s cubic-bezier(0.4,0,0.2,1);
          }
          .toast.sidebar-closed { left: 80px; }
          .streak-banner { padding: 16px 18px; }
          .streak-num { font-size: 24px; }
        }

        @media (min-width: 1200px) {
          .bottom-nav { width: 220px; }
          .desktop-content { margin-left: 220px; }
          .desktop-content.sidebar-closed { margin-left: 56px; }
          .screen { padding: 0 48px 48px; max-width: 1280px; }
          .header { padding: 24px 48px 14px 64px; max-width: 1280px; }
          .home-layout { grid-template-columns: 1fr 360px; gap: 24px; }
          #screen-study { max-width: 720px; }
          #screen-create, #screen-quiz, #screen-pro { max-width: 700px; }
        }
      `}</style>

      <div className="memorix-root">
        {/* ── ONBOARDING ── */}
        {showOnboarding && (
          <div
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "linear-gradient(135deg,#0a0015,#1a0035,#0d1545)",
              zIndex: 1000, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "space-between",
              padding: "40px 24px 40px",
            }}
          >
            {/* Dots */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {OB_SLIDES.map((_, i) => (
                <div key={i} className={`ob-dot${i === obIndex ? " active" : ""}`} />
              ))}
            </div>

            {/* Slide */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", width: "100%" }}>
              <div className="ob-icon">{OB_SLIDES[obIndex].icon}</div>
              <div className="ob-title">{OB_SLIDES[obIndex].title}</div>
              {OB_SLIDES[obIndex].desc && (
                <div className="ob-desc">{OB_SLIDES[obIndex].desc}</div>
              )}
              {OB_SLIDES[obIndex].type === "features" && OB_SLIDES[obIndex].features && (
                <div style={{ width: "100%", marginTop: 24 }}>
                  {OB_SLIDES[obIndex].features!.map((f, fi) => (
                    <div key={fi} className="ob-feature">
                      <span className="ob-feature-icon">{f.icon}</span>
                      <div className="ob-feature-text">
                        <strong>{f.title}</strong>{f.desc}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ width: "100%" }}>
              <button
                className="btn btn-primary"
                style={{
                  marginTop: 0,
                  ...(obIndex === OB_SLIDES.length - 1 ? { background: "linear-gradient(135deg,#10b981,#059669)" } : {}),
                }}
                onClick={obNextSlide}
              >
                {obIndex === OB_SLIDES.length - 1 ? "🚀 Boshlash!" : "Davom →"}
              </button>
              {obIndex < OB_SLIDES.length - 1 && (
                <button
                  onClick={finishOnboarding}
                  style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: 13, width: "100%", padding: 14, cursor: "pointer", fontFamily: "inherit" }}
                >
                  O'tkazib yuborish
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── CELEBRATION OVERLAY ── */}
        {celebration && (
          <div className="celebration">
            <div className="celebration-card">
              <div className="celebration-emoji">
                {celebration.streak >= 30 ? "💎" : celebration.streak >= 14 ? "🏆" : celebration.streak >= 7 ? "⚡" : "🔥"}
              </div>
              <div className="celebration-title">
                {(celebrationMsgs[celebration.streak] || { title: `${celebration.streak} kun streak!` }).title}
              </div>
              <div className="celebration-sub">
                {(celebrationMsgs[celebration.streak] || { sub: "Davom eting!" }).sub}
              </div>
              <div className={`celebration-badge ${celebration.badge.cls}`}>{celebration.badge.label}</div>
              <button className="celebration-close" onClick={() => {
                setCelebration(null);
                setStudyFinished(false);
                switchScreen("home");
              }}>🚀 Davom etish</button>
            </div>
          </div>
        )}

        {/* ── HEADER ── */}
        <div className={`desktop-content${sidebarOpen ? "" : " sidebar-closed"}`}>
          <div className="header">
            <div>
              {/* Mobile logo */}
              <div className="logo">
                <div className="logo-dot" />
                <span className="logo-text">Memorix</span>
              </div>
              <div className="logo-sub">
                {user ? `Salom, ${userName} 👋` : "Xush kelibsiz 👋"}
              </div>
            </div>
            {/* Mobile avatar — hidden on desktop (moved to sidebar) */}
            <div className="avatar avatar-mobile">{avatarLetter}</div>
          </div>

          {/* ── HOME SCREEN ── */}
          <div className={`screen${activeScreen === "home" ? " active" : ""}`} id="screen-home">
            {/* Stats yuqorida — to'liq kenglik */}
            <div className="stats-strip">
              <div className="stat-card">
                <div className="num">{stats?.totalDecks ?? "—"}</div>
                <div className="lbl">To'plam</div>
              </div>
              <div className="stat-card">
                <div className="num">{stats?.totalFlashcards ?? "—"}</div>
                <div className="lbl">So'z</div>
              </div>
              <div className="stat-card accent">
                <div className="num">{stats?.plan ?? "FREE"}</div>
                <div className="lbl">Reja</div>
              </div>
            </div>

            {/* Desktop: 2 ustun — chap: decks, o'ng: stats */}
            <div className="home-layout">
              <div className="home-left">

                {/* Jump back in — oxirgi to'plam */}
                {decks.length > 0 && (
                  <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.1),rgba(14,165,233,0.1))", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                    onClick={() => openDeckForStudy(decks[0].id, decks[0].description || "")}
                  >
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(16,185,129,0.9)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Davom etish</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginTop: 1 }}>{decks[0].title}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(16,185,129,0.8)" }}>▶</div>
                  </div>
                )}

                {/* Streak Banner */}
                {streak > 0 && (
                  <div className="streak-banner" style={{ marginTop: 0 }}>
                    <div className="streak-fire">{streakFire}</div>
                    <div className="streak-info">
                      <div className="streak-num">{streak} kun</div>
                      <div className="streak-label">ketma-ket o'rganmoqdasiz</div>
                    </div>
                    {streakBadge && (
                      <div className={`streak-badge-pill ${streakBadge.cls}`}>{streakBadge.label}</div>
                    )}
                  </div>
                )}

                <div className="section-label">Mening to'plamlarim</div>
                <div className="deck-list">
                  {!stats && decks.length === 0 ? (
                    <div className="loader"><div className="spinner" /><p>Yuklanmoqda...</p></div>
                  ) : decks.length === 0 ? (
                    /* SMART EMPTY STATE */
                    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "28px 20px", textAlign: "center", backdropFilter: "blur(16px)" }}>
                      <div style={{ fontSize: 52, marginBottom: 12, display: "block", animation: "obFloat 3s ease-in-out infinite" }}>✨</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 6 }}>Birinchi to'plamingizni yarating!</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 20 }}>Matn yoki rasm yuboring — AI o'zi flashcard yaratib beradi</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        <button style={{ padding: "16px 12px", borderRadius: 16, background: "linear-gradient(135deg,rgba(108,92,231,0.35),rgba(108,92,231,0.15))", border: "1px solid rgba(108,92,231,0.5)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "inherit" }} onClick={() => { switchScreen("create"); setInputMethod("text"); }}>
                          <span style={{ fontSize: 26 }}>📝</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Matn</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Paste qiling</span>
                        </button>
                        <button style={{ padding: "16px 12px", borderRadius: 16, background: "linear-gradient(135deg,rgba(168,85,247,0.35),rgba(168,85,247,0.15))", border: "1px solid rgba(168,85,247,0.5)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "inherit" }} onClick={() => { switchScreen("create"); setInputMethod("image"); }}>
                          <span style={{ fontSize: 26 }}>📷</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Rasm</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Lug'at rasmi</span>
                        </button>
                      </div>
                      <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
                          <strong style={{ color: "rgba(16,185,129,0.9)", display: "block", fontSize: 11, marginBottom: 1 }}>Tezkor yo'l</strong>
                          Lug'at sahifasini rasmga oling — AI so'zlarni o'zi ajratadi
                        </div>
                      </div>
                    </div>
                  ) : (
                    decks.map((deck, i) => {
                      const emoji = getDeckEmoji(deck.title);
                      const iconClass = getDeckIcon(i);
                      const desc = deck.description || "";
                      const langMatch = desc.match(/(🇬🇧 Ingliz|🇷🇺 Rus|🇰🇷 Koreys)/);
                      const langBadge = langMatch ? langMatch[1] : "";
                      const count = deck._count?.flashcards ?? 0;
                      return (
                        <div
                          key={deck.id}
                          className="deck-card"
                          onClick={() => openDeckForStudy(deck.id, desc)}
                        >
                          <div className={`deck-icon ${iconClass}`}>{emoji}</div>
                          <div className="deck-body">
                            <div className="deck-title">{deck.title}</div>
                            <div className="deck-meta">{count} ta so'z{langBadge ? " • " + langBadge : ""}</div>
                          </div>
                          <div className="deck-actions" onClick={(e) => e.stopPropagation()}>
                            <div className="deck-count">{count}</div>
                            <button className="icon-btn" onClick={() => renameDeck(deck.id, deck.title)}>✏️</button>
                            <button className="icon-btn danger" onClick={() => deleteDeck(deck.id)}>🗑</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {/* Yangi to'plam CTA — faqat decks bor bo'lganda */}
                  {decks.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        style={{ width: "100%", background: "linear-gradient(135deg,rgba(108,92,231,0.25),rgba(168,85,247,0.15))", border: "1px dashed rgba(168,85,247,0.4)", borderRadius: "var(--radius)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}
                        onClick={() => switchScreen("create")}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>+ Yangi to'plam yarating</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>AI bilan flashcard yarating</div>
                        </div>
                        <span style={{ fontSize: 24 }}>✨</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>{/* /home-left */}

              {/* ── O'ng ustun: Statistika ── */}
              <div className="home-right">
                {stats && (
                  <div>
                    <div className="section-label" style={{ marginTop: 0 }}>Statistika</div>
                    <div className="stats-grid" style={{ marginBottom: 10 }}>
                      <div className="stat-big">
                        <div className="emoji">{streakFire}</div>
                        <div className="val">{streak}</div>
                        <div className="lbl2">Ketma-ket kun</div>
                      </div>
                      <div className="stat-big">
                        <div className="emoji">📖</div>
                        <div className="val">{stats.totalStudied ?? 0}</div>
                        <div className="lbl2">Jami o'rganilgan</div>
                      </div>
                    </div>
                    <div className="chart-wrap">
                      <div className="chart-title">Haftalik faollik</div>
                      <div className="bars">
                        {weekly.map((val, i) => {
                          const h = Math.round((val / maxVal) * 100);
                          const isToday = i === todayIdx;
                          return (
                            <div key={i} className="bar-col">
                              <div className="bar-val">{val > 0 ? val : ""}</div>
                              <div className="bar-wrap">
                                <div
                                  className={`bar${isToday ? " active" : val > 0 ? " filled" : ""}`}
                                  style={{ height: `${h}%` }}
                                />
                              </div>
                              <div className={`bar-day${isToday ? " today" : ""}`}>{dayLabels[i]}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>{/* /home-right */}
            </div>{/* /home-layout */}
          </div>{/* /screen-home */}

          {/* ── CREATE SCREEN ── */}
          <div className={`screen${activeScreen === "create" ? " active" : ""}`} id="screen-create">
            <div className="field-label">To'plam nomi</div>
            <input
              type="text"
              className="mx-input"
              placeholder="Masalan: Hissiyotlar, Ovqatlar..."
              value={newDeckTitle}
              onChange={(e) => setNewDeckTitle(e.target.value)}
            />

            <div className="field-label">O'rganish tili</div>
            <div className="seg-tabs">
              {(["english", "russian", "korean"] as Lang[]).map((lang) => (
                <button
                  key={lang}
                  className={`seg-tab${selectedLang === lang ? " active" : ""}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  {LANG_LABELS[lang]}
                </button>
              ))}
            </div>

            <div className="field-label">So'z manbasi</div>
            <div className="seg-tabs">
              <button
                className={`seg-tab${inputMethod === "text" ? " active" : ""}`}
                onClick={() => setInputMethod("text")}
              >📝 Matn</button>
              <button
                className={`seg-tab${inputMethod === "image" ? " active" : ""}`}
                onClick={() => setInputMethod("image")}
              >📷 Rasm</button>
            </div>

            {inputMethod === "text" ? (
              <textarea
                className="mx-textarea"
                placeholder={
                  selectedLang === "english" ? "Inglizcha matn..." :
                    selectedLang === "russian" ? "Ruscha matn..." : "Koreycha matn..."
                }
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
            ) : (
              <div>
                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <div className="uz-icon">📷</div>
                  <div className="uz-title">Rasm tanlash</div>
                  <div className="uz-sub">Lug'at sahifasi yoki istalgan matn</div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageChange}
                  />
                </div>
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="preview"
                    style={{ width: "100%", borderRadius: "var(--radius)", marginTop: 12 }}
                  />
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              disabled={aiLoading}
              onClick={handleGenerate}
            >
              {aiLoading ? "AI tahlil qilmoqda..." : "✨ AI bilan flashcard yaratish"}
            </button>

            {aiLoading && (
              <div className="loader"><div className="spinner" /><p>AI tahlil qilmoqda...</p></div>
            )}

            {aiError && !aiLoading && (
              <div style={{ textAlign: "center", padding: "30px 20px" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>😔</div>
                <div style={{ fontSize: 15, color: "white", marginBottom: 8 }}>AI hozir band</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{aiError}</div>
                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setAiError("")}>
                  ← Qayta urinish
                </button>
              </div>
            )}

            {aiFlashcards.length > 0 && !aiLoading && !aiError && (
              <div>
                <div className="section-label" style={{ marginTop: 16 }}>{aiFlashcards.length} ta so'z topildi</div>
                <div className="preview-list">
                  {aiFlashcards.map((c, i) => (
                    <div key={i} className="preview-card">
                      <div className="pf">{c.frontText}</div>
                      <div className="pb">{c.backText}</div>
                      {c.example && <div className="pe">"{c.example}"</div>}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-primary"
                  disabled={savingDeck}
                  onClick={saveAiDeck}
                >
                  {savingDeck ? "Saqlanmoqda..." : "💾 To'plamga saqlash"}
                </button>
              </div>
            )}
          </div>

          {/* ── STUDY SCREEN ── */}
          <div className={`screen${activeScreen === "study" ? " active" : ""}`} id="screen-study">
            {studyLoading ? (
              <div className="loader"><div className="spinner" /><p>Yuklanmoqda...</p></div>
            ) : studyFinished ? (
              <div className="empty-state">
                <div className="icon">🎉</div>
                <p>Tabriklaymiz!<br />"{currentDeck?.title}" tugatdingiz</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 20, maxWidth: 200, marginLeft: "auto", marginRight: "auto" }}
                  onClick={() => {
                    if (currentDeck) openDeckForStudy(currentDeck.id, currentDeck.description || "");
                  }}
                >🔄 Qayta boshlash</button>
              </div>
            ) : studyQueue.length > 0 && currentCard ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{studyIndex + 1} / {studyQueue.length}</span>
                  <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{currentDeck?.title || ""}</span>
                </div>
                <div className="study-progress">
                  <div className="study-progress-bar" style={{ width: `${studyProgress}%` }} />
                </div>

                {/* 3D Flip Card */}
                <div className="flip-scene" onClick={handleFlip}>
                  <div className={`flip-inner${isFlipped ? " flipped" : ""}`}>
                    <div className="flip-front">
                      <div className="fc-word">{currentCard.frontText}</div>
                      <div className="fc-tap">👆 Bosing — tarjimani ko'ring</div>
                    </div>
                    <div className="flip-back">
                      <div className="fc-trans">{currentCard.backText}</div>
                      {currentCard.example && (
                        <div className="fc-ex">"{currentCard.example}"</div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
                  <button className="speak-btn" onClick={() => speakWord(currentCard.frontText, studyLang)}>
                    🔊 Talaffuz
                  </button>
                </div>

                {!isFlipped && (
                  <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
                    Kartani bosing — aylanadi ↩️
                  </p>
                )}

                {isFlipped && (
                  <div className="study-actions">
                    <button className="btn btn-fail" onClick={nextCard}>✗ Bilmadim</button>
                    <button className="btn btn-success" onClick={nextCard}>✓ Bildim</button>
                  </div>
                )}
              </div>
            ) : (
              /* Study Home — deck list */
              decks.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🎯</div>
                  <p>Hali to'plamlar yo'q.<br />"Yaratish" bo'limidan birinchisini yarating!</p>
                </div>
              ) : (
                <div>
                  {currentDeck && (
                    <>
                      <div className="section-label">Davom etish</div>
                      <div
                        style={{
                          background: "linear-gradient(135deg,rgba(108,92,231,0.2),rgba(168,85,247,0.15))",
                          border: "1px solid rgba(168,85,247,0.3)", borderRadius: "var(--radius)",
                          padding: 18, marginBottom: 4, cursor: "pointer",
                        }}
                        onClick={() => openDeckForStudy(currentDeck.id, currentDeck.description || "")}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6C5CE7,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                            {getDeckEmoji(currentDeck.title)}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{currentDeck.title}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{currentDeck.flashcards?.length ?? 0} ta so'z</div>
                          </div>
                          <div style={{ marginLeft: "auto", background: "linear-gradient(135deg,#6C5CE7,#a855f7)", color: "white", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 100 }}>
                            ▶ Davom
                          </div>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.round((studyIndex / (studyQueue.length || 1)) * 100)}%`, background: "linear-gradient(90deg,#6C5CE7,#a855f7)", borderRadius: 100 }} />
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                          {Math.round((studyIndex / (studyQueue.length || 1)) * 100)}% tugallangan
                        </div>
                      </div>
                    </>
                  )}

                  <div className="section-label" style={{ marginTop: currentDeck ? 20 : 0 }}>Barcha to'plamlar</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {decks.map((deck, i) => {
                      const emoji = getDeckEmoji(deck.title);
                      const iconClass = getDeckIcon(i);
                      const desc = deck.description || "";
                      const langMatch = desc.match(/(🇬🇧 Ingliz|🇷🇺 Rus|🇰🇷 Koreys)/);
                      const langBadge = langMatch ? langMatch[1] : "";
                      const count = deck._count?.flashcards ?? 0;
                      return (
                        <div key={deck.id} style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 0 }}>
                          <div className={`deck-icon ${iconClass}`} onClick={() => openDeckForStudy(deck.id, desc)} style={{ cursor: "pointer" }}>{emoji}</div>
                          <div className="deck-body" onClick={() => openDeckForStudy(deck.id, desc)} style={{ cursor: "pointer", flex: 1, minWidth: 0 }}>
                            <div className="deck-title">{deck.title}</div>
                            <div className="deck-meta">{count} ta so'z{langBadge ? " • " + langBadge : ""}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              style={{ background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.35)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", color: "#c4b5fd", fontSize: 11, fontWeight: 700 }}
                              onClick={(e) => { e.stopPropagation(); openDeckForStudy(deck.id, desc); }}
                            >▶ O'qish</button>
                            <button
                              style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.35)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", color: "#e9d5ff", fontSize: 11, fontWeight: 700 }}
                              onClick={(e) => { e.stopPropagation(); switchScreen("quiz"); selectQuizDeck(deck.id); }}
                            >🎮 Quiz</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>

          {/* ── PROGRESS SCREEN ── */}
          <div className={`screen${activeScreen === "progress" ? " active" : ""}`} id="screen-progress">
            <div style={{ maxWidth: 720, margin: "0 auto" }}>

              {/* Streak banner */}
              {streak > 0 && (
                <div className="streak-banner" style={{ marginBottom: 16, background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.06))", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <div className="streak-fire">{streakFire}</div>
                  <div className="streak-info">
                    <div className="streak-num" style={{ color: "#d97706" }}>{streak} kun</div>
                    <div className="streak-label" style={{ color: "#64748b" }}>ketma-ket o'rganmoqdasiz</div>
                  </div>
                  {streakBadge && <div className={`streak-badge-pill ${streakBadge.cls}`}>{streakBadge.label}</div>}
                </div>
              )}

              {/* Stats kartalar — 4 ta */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  {
                    emoji: "📚", val: stats?.totalDecks ?? 0, label: "To'plamlar", color: "#1e293b",
                    bar: stats?.limits?.decks && stats.limits.decks !== Infinity
                      ? { pct: Math.min(100, ((stats.totalDecks ?? 0) / (stats.limits.decks)) * 100), color: "linear-gradient(90deg,#6C5CE7,#a855f7)", text: `${stats.totalDecks ?? 0} / ${stats.limits.decks}` }
                      : null
                  },
                  {
                    emoji: "📝", val: stats?.totalFlashcards ?? 0, label: "So'zlar", color: "#1e293b",
                    bar: stats?.limits?.cards && stats.limits.cards !== Infinity
                      ? { pct: Math.min(100, ((stats.totalFlashcards ?? 0) / (stats.limits.cards)) * 100), color: "linear-gradient(90deg,#10b981,#0ea5e9)", text: `${stats.totalFlashcards ?? 0} / ${stats.limits.cards ?? 30}` }
                      : null
                  },
                  { emoji: "🔥", val: streak, label: "Streak kun", color: "#d97706", bar: null },
                  { emoji: "🎯", val: stats?.totalStudied ?? 0, label: "Jami o'rganilgan", color: "#1e293b", bar: null },
                ].map((item, i) => (
                  <div key={i} style={{ background: "white", border: "1px solid rgba(200,196,230,0.5)", borderRadius: "var(--radius)", padding: 20, textAlign: "center", boxShadow: "0 2px 8px rgba(108,92,231,0.07)" }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>{item.emoji}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.val}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{item.label}</div>
                    {item.bar && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 4, background: "rgba(108,92,231,0.1)", borderRadius: 100, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${item.bar.pct}%`, background: item.bar.color, borderRadius: 100 }} />
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{item.bar.text}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Haftalik grafik */}
              <div style={{ background: "white", border: "1px solid rgba(200,196,230,0.5)", borderRadius: "var(--radius)", padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(108,92,231,0.07)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Haftalik faollik</div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
                  {weekly.map((val, i) => {
                    const h = Math.round((val / Math.max(...weekly, 1)) * 100);
                    const isToday = i === todayIdx;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, minHeight: 14 }}>{val > 0 ? val : ""}</div>
                        <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                          <div style={{
                            width: "100%", height: `${h}%`, minHeight: 4, borderRadius: "6px 6px 0 0",
                            background: isToday ? "linear-gradient(180deg,#a855f7,#6C5CE7)" : val > 0 ? "rgba(108,92,231,0.35)" : "rgba(108,92,231,0.08)",
                            boxShadow: isToday ? "0 0 12px rgba(168,85,247,0.4)" : "none",
                            transition: "height 0.3s ease"
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: isToday ? "#6C5CE7" : "#94a3b8", fontWeight: isToday ? 700 : 400 }}>{dayLabels[i]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plan progress */}
              <div style={{ background: "white", border: "1px solid rgba(108,92,231,0.2)", borderRadius: "var(--radius)", padding: 18, marginBottom: 16, boxShadow: "0 2px 8px rgba(108,92,231,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>👑 {stats?.plan ?? "FREE"} reja</div>
                  <button onClick={() => switchScreen("pro")} style={{ fontSize: 11, fontWeight: 700, color: "white", background: "linear-gradient(135deg,#6C5CE7,#a855f7)", border: "none", borderRadius: 100, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                    Upgrade →
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "To'plamlar", val: stats?.totalDecks ?? 0, max: stats?.limits?.decks ?? 3, color: "linear-gradient(90deg,#6C5CE7,#a855f7)" },
                    { label: "So'zlar", val: stats?.totalFlashcards ?? 0, max: stats?.limits?.cards ?? 30, color: "linear-gradient(90deg,#10b981,#0ea5e9)" },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{item.val}<span style={{ color: "#94a3b8", fontWeight: 400 }}>/{item.max}</span></div>
                      </div>
                      <div style={{ height: 6, background: "rgba(108,92,231,0.1)", borderRadius: 100, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (item.val / item.max) * 100)}%`, background: item.color, borderRadius: 100 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jump back in */}
              {decks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Davom etish</div>
                  <div style={{ background: "white", border: "1px solid rgba(108,92,231,0.2)", borderRadius: "var(--radius)", padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(108,92,231,0.07)" }}
                    onClick={() => openDeckForStudy(decks[0].id, decks[0].description || "")}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6C5CE7,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                      {getDeckEmoji(decks[0].title)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{decks[0].title}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{decks[0]._count?.flashcards ?? 0} ta so'z</div>
                    </div>
                    <div style={{ background: "linear-gradient(135deg,#6C5CE7,#a855f7)", color: "white", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 100, flexShrink: 0 }}>
                      ▶ Boshlash
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── ACCOUNT SCREEN ── */}
          <div className={`screen${activeScreen === "account" ? " active" : ""}`} id="screen-account">
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              {/* Avatar card */}
              <div style={{ textAlign: "center", padding: "32px 20px 24px", background: "white", border: "1px solid rgba(200,196,230,0.5)", borderRadius: "var(--radius)", marginBottom: 16, boxShadow: "0 2px 8px rgba(108,92,231,0.07)" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#6C5CE7,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white", margin: "0 auto 14px" }}>{avatarLetter}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>{userName}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>{user?.telegramId ? "@" + user.telegramId : "Telegram foydalanuvchi"}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.2)", borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#6C5CE7" }}>
                  👑 {stats?.plan ?? "FREE"} reja
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  { val: stats?.totalDecks ?? 0, label: "To'plamlar" },
                  { val: stats?.totalFlashcards ?? 0, label: "So'zlar" },
                  { val: streak, label: "Streak 🔥" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "white", border: "1px solid rgba(200,196,230,0.5)", borderRadius: "var(--radius-sm)", padding: "14px 12px", textAlign: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>{item.val}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Menu items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <button onClick={() => switchScreen("pro")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "linear-gradient(135deg,rgba(108,92,231,0.08),rgba(168,85,247,0.05))", border: "1px solid rgba(108,92,231,0.2)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit", color: "#4f46e5", fontSize: 14, fontWeight: 600 }}>
                  <span style={{ fontSize: 20 }}>👑</span>
                  <span style={{ flex: 1, textAlign: "left" }}>Premium rejaga o'tish</span>
                  <span style={{ color: "#94a3b8", fontSize: 16 }}>→</span>
                </button>
                <button onClick={() => switchScreen("home")} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "white", border: "1px solid rgba(200,196,230,0.5)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit", color: "#1e293b", fontSize: 14, fontWeight: 500, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <span style={{ fontSize: 20 }}>📚</span>
                  <span style={{ flex: 1, textAlign: "left" }}>Mening to'plamlarim</span>
                  <span style={{ color: "#94a3b8", fontSize: 16 }}>→</span>
                </button>
              </div>

              {/* Log out */}
              <button
                onClick={() => {
                  localStorage.removeItem("memorix_onboarded");
                  setAccessToken(null); setUser(null); setDecks([]); setStats(null);
                  showToast("Chiqildi ✓");
                  window.location.reload();
                }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit", color: "#dc2626", fontSize: 14, fontWeight: 700 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Chiqish (Log out)
              </button>
            </div>
          </div>

          {/* ── QUIZ SCREEN ── */}
          <div className={`screen${activeScreen === "quiz" ? " active" : ""}`} id="screen-quiz">
            {quizLoading && (
              <div className="loader"><div className="spinner" /></div>
            )}

            {/* QUIZ HOME */}
            {!quizLoading && quizPhase === "home" && (
              decks.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">🎮</div>
                  <p>Quiz uchun avval to'plam yarating!</p>
                </div>
              ) : (
                <>
                  <div className="section-label">To'plam tanlang</div>
                  {decks.map((deck, i) => {
                    const emoji = getDeckEmoji(deck.title);
                    const iconClass = getDeckIcon(i);
                    const count = deck._count?.flashcards ?? 0;
                    return (
                      <div
                        key={deck.id}
                        className="quiz-deck-card"
                        onClick={() => count >= 4 ? selectQuizDeck(deck.id) : showToast("Quiz uchun kamida 4 ta so'z kerak!")}
                      >
                        <div className={`deck-icon ${iconClass}`} style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }}>{emoji}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{deck.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{count} ta so'z</div>
                        </div>
                        {count < 4 ? (
                          <div style={{ fontSize: 11, color: "rgba(239,68,68,0.7)", background: "rgba(239,68,68,0.1)", padding: "4px 10px", borderRadius: 100 }}>Min 4 so'z kerak</div>
                        ) : (
                          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 18 }}>▶</div>
                        )}
                      </div>
                    );
                  })}
                </>
              )
            )}

            {/* QUIZ MODE SELECT */}
            {!quizLoading && quizPhase === "modeSelect" && quizDeck && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <button
                    onClick={() => setQuizPhase("home")}
                    style={{ background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: 10, padding: "8px 12px", color: "white", cursor: "pointer", fontFamily: "inherit" }}
                  >← Orqaga</button>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{quizDeck.title}</span>
                </div>
                <div className="section-label">Quiz rejimi</div>
                <div className="quiz-mode-card" onClick={() => startQuiz("choice")}>
                  <div className="quiz-mode-icon">🅰️</div>
                  <div className="quiz-mode-title">Ko'p tanlov</div>
                  <div className="quiz-mode-sub">4 ta variant ichidan to'g'risini tanlang</div>
                </div>
                <div className="quiz-mode-card" onClick={() => startQuiz("typing")}>
                  <div className="quiz-mode-icon">✏️</div>
                  <div className="quiz-mode-title">Yozish</div>
                  <div className="quiz-mode-sub">Tarjimasini o'zingiz yozing</div>
                </div>
                <div className="quiz-mode-card" onClick={() => startQuiz("mixed")}>
                  <div className="quiz-mode-icon">🎯</div>
                  <div className="quiz-mode-title">Aralash</div>
                  <div className="quiz-mode-sub">Avval tanlov, keyin yozish</div>
                </div>
              </>
            )}

            {/* QUIZ QUESTION */}
            {!quizLoading && quizPhase === "question" && quizCards[quizIndex] && (() => {
              const card = quizCards[quizIndex];
              const progress = (quizIndex / quizCards.length) * 100;
              const currentMode = getCurrentQuizMode();
              const letters = ["A", "B", "C", "D"];
              const correct = card.backText;

              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{quizIndex + 1} / {quizCards.length}</span>
                    <span style={{ fontSize: 12 }}>
                      <span style={{ color: "#6ee7b7" }}>✓ {quizScore.correct}</span>
                      {" "}
                      <span style={{ color: "#fca5a5" }}>✗ {quizScore.wrong}</span>
                    </span>
                  </div>
                  <div className="study-progress" style={{ marginBottom: 20 }}>
                    <div className="study-progress-bar" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="quiz-question">
                    <div className="q-label">{currentMode === "choice" ? "Tarjimasini toping" : "Tarjimasini yozing"}</div>
                    <div className="q-word">{card.frontText}</div>
                    {card.example && <div className="q-hint">"{card.example}"</div>}
                  </div>

                  {currentMode === "choice" ? (
                    choiceOptions.map((opt, i) => {
                      let cls = "";
                      if (choiceSelected) {
                        if (opt === correct) cls = "correct";
                        else if (opt === choiceSelected) cls = "wrong";
                        else cls = "disabled";
                      }
                      return (
                        <button key={i} className={`choice-btn${cls ? " " + cls : ""}`} onClick={() => checkChoice(opt)}>
                          <span className="choice-letter">{letters[i]}</span>
                          {opt}
                        </button>
                      );
                    })
                  ) : (
                    <>
                      <input
                        className={`quiz-input${typingChecked ? (typingCorrect ? " correct" : " wrong") : ""}`}
                        placeholder="Tarjimani yozing..."
                        autoComplete="off"
                        value={typingInput}
                        disabled={typingChecked}
                        onChange={(e) => setTypingInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") checkTyping(); }}
                        autoFocus
                      />
                      {!typingChecked && (
                        <button className="btn btn-primary" style={{ marginTop: 0 }} onClick={checkTyping}>✓ Tekshirish</button>
                      )}
                      {typingChecked && (
                        <div style={{ marginTop: 12 }}>
                          {typingCorrect ? (
                            <div style={{ textAlign: "center", color: "#6ee7b7", fontSize: 14, fontWeight: 700 }}>✓ To'g'ri!</div>
                          ) : (
                            <div style={{ textAlign: "center", marginBottom: 12 }}>
                              <div style={{ color: "#fca5a5", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>✗ Noto'g'ri</div>
                              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                                To'g'ri javob: <span style={{ color: "#c4b5fd", fontWeight: 700 }}>{card.backText}</span>
                              </div>
                            </div>
                          )}
                          <button className="btn btn-primary" style={{ marginTop: 0 }} onClick={nextQuizQuestion}>Davom →</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}

            {/* QUIZ RESULT */}
            {!quizLoading && quizPhase === "result" && (
              <>
                <div className="result-card">
                  <div style={{ fontSize: 56, marginBottom: 12 }}>{quizEmoji}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>{quizMsg}</div>
                  <div style={{ fontSize: 48, fontWeight: 800, background: "linear-gradient(135deg,#6C5CE7,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "16px 0" }}>{quizPct}%</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 8 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#6ee7b7" }}>{quizScore.correct}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>To'g'ri</div>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#fca5a5" }}>{quizScore.wrong}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Noto'g'ri</div>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "white" }}>{quizTotal}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Jami</div>
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => startQuiz(quizMode as any)} style={{ marginBottom: 12 }}>🔄 Qayta urinish</button>
                <button className="btn btn-glass" style={{ marginTop: 0 }} onClick={() => setQuizPhase("modeSelect")}>← Rejim tanlash</button>
                <button className="btn btn-glass" style={{ marginTop: 10 }} onClick={() => setQuizPhase("home")}>🏠 To'plamlar</button>
              </>
            )}
          </div>

          {/* ── PRO SCREEN ── */}
          <div className={`screen${activeScreen === "pro" ? " active" : ""}`} id="screen-pro">
            <div className="pro-header">
              <div className="pro-badge"><span>✨ MEMORIX PREMIUM</span></div>
              <div className="pro-h2">Cheksiz o'rganish</div>
              <div className="pro-sub">Limitlarsiz. AI bilan. Hamma qurilmada.</div>
            </div>

            <div className="seg-tabs" style={{ marginBottom: 16 }}>
              <button className={`seg-tab${pricingType === "monthly" ? " active" : ""}`} onClick={() => setPricingType("monthly")}>Oylik</button>
              <button className={`seg-tab${pricingType === "yearly" ? " active" : ""}`} onClick={() => setPricingType("yearly")}>
                Yillik &nbsp;<span style={{ background: "#10b981", color: "white", fontSize: 10, padding: "2px 7px", borderRadius: 100 }}>−30%</span>
              </button>
            </div>

            <div className="plan-cards-grid">
              {/* FREE */}
              <div className="plan-card">
                <div className="plan-name">Free</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <div className="plan-price">0</div>
                  <div style={{ fontSize: 13, color: "var(--text-dim)" }}>so'm / oy</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  <div className="pf-item ok">📚 3 ta to'plam</div>
                  <div className="pf-item ok">📝 30 ta so'z</div>
                  <div className="pf-item ok">✨ AI yaratish</div>
                  <div className="pf-item ok">🌐 3 ta til</div>
                  <div className="pf-item no">✗ Statistika</div>
                  <div className="pf-item no">✗ Quiz rejimi</div>
                </div>
                <div className="plan-current">Hozirgi rejangiz</div>
              </div>

              {/* STARTER */}
              <div className="plan-card" style={{ borderColor: "rgba(14,165,233,0.4)", background: "linear-gradient(145deg,rgba(14,165,233,0.1),rgba(99,102,241,0.1))" }}>
                <div className="plan-name" style={{ color: "#7dd3fc" }}>⚡ Starter</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <div className="plan-price">{pricingType === "yearly" ? "6,930" : "9,900"}</div>
                  <div style={{ fontSize: 13, color: "#7dd3fc" }}>
                    {pricingType === "yearly" ? <span>so'm / oy <span style={{ fontSize: 10, color: "#10b981" }}>83,160/yil</span></span> : "so'm / oy"}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  <div className="pf-item pro-ok">📚 10 ta to'plam</div>
                  <div className="pf-item pro-ok">📝 100 ta so'z</div>
                  <div className="pf-item pro-ok">✨ AI yaratish</div>
                  <div className="pf-item pro-ok">🌐 3 ta til</div>
                  <div className="pf-item pro-ok">✓ Statistika</div>
                  <div className="pf-item pro-ok">✓ Quiz rejimi</div>
                </div>
                <button className="plan-btn" style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }} onClick={() => {
                  const url = "https://t.me/memorix_uz_bot?start=starter";
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg?.openTelegramLink) tg.openTelegramLink(url);
                  else window.open(url, "_blank");
                }}>Starter olish →</button>
              </div>

              {/* PREMIUM */}
              <div className="plan-card pro-card">
                <div className="plan-rec">TAVSIYA</div>
                <div className="plan-name">👑 Premium</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <div className="plan-price">{pricingType === "yearly" ? "20,930" : "29,900"}</div>
                  <div style={{ fontSize: 13, color: "#a78bfa" }}>
                    {pricingType === "yearly" ? <span>so'm / oy <span style={{ fontSize: 10, color: "#10b981" }}>249,900/yil</span></span> : "so'm / oy"}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  <div className="pf-item pro-ok">📚 Cheksiz to'plam</div>
                  <div className="pf-item pro-ok">📝 Cheksiz so'z</div>
                  <div className="pf-item pro-ok">✨ AI yaratish</div>
                  <div className="pf-item pro-ok">🌐 3 ta til</div>
                  <div className="pf-item pro-ok">✓ Statistika</div>
                  <div className="pf-item pro-ok">✓ Quiz rejimi</div>
                  <div className="pf-item pro-ok">✓ Spaced rep.</div>
                  <div className="pf-item pro-ok">⚡ Ustuvorlik</div>
                </div>
                <button className="plan-btn" onClick={() => {
                  const url = "https://t.me/memorix_uz_bot?start=premium";
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg?.openTelegramLink) tg.openTelegramLink(url);
                  else window.open(url, "_blank");
                }}>Premium olish →</button>
              </div>
            </div>

            {/* Feature Table */}
            <div className="section-label">Batafsil taqqoslash</div>
            <div className="feature-table">
              <div className="ft-row" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="ft-col-name" style={{ fontWeight: 700, color: "white" }}>Feature</div>
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--text-dim)" }}>Free</div>
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#7dd3fc" }}>Starter</div>
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#c4b5fd" }}>Premium</div>
              </div>
              {PLAN_FEATURES.map((f, i) => (
                <div key={i} className="ft-row">
                  <div className="ft-col-name"><span>{f.icon}</span>{f.name}</div>
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: f.freeNo ? "#ef4444" : "#10b981" }}>{f.free}</div>
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: f.starterNo ? "#ef4444" : f.starterOk ? "#10b981" : "var(--text-dim)" }}>{f.starter}</div>
                  <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: f.proOk ? "#10b981" : "#ef4444" }}>{f.proOk ? "✓" : "✗"}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", padding: 16, marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 8 }}>Savollar bormi?</div>
              <a href="https://t.me/memorix_uz_bot" style={{ color: "#c4b5fd", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                @memorix_uz_bot ga yozing →
              </a>
            </div>
          </div>

          {/* ── SIDEBAR TOGGLE (desktop only) ── */}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? "Yopish" : "Ochish"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {sidebarOpen
                ? <path d="M15 18l-6-6 6-6" />
                : <path d="M9 18l6-6-6-6" />}
            </svg>
          </button>

          {/* ── BOTTOM NAV (mobile) / SIDEBAR (desktop) ── */}
          <div className={`bottom-nav${sidebarOpen ? "" : " sidebar-closed"}`}>
            {/* Desktop sidebar logo */}
            <div className="sidebar-top">
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px 14px 52px", borderBottom: "1px solid rgba(0,0,0,0.07)", marginBottom: 8 }}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="32" rx="8" fill="#6C5CE7" />
                  <rect x="7" y="9" width="18" height="14" rx="3" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" />
                  <line x1="11" y1="14" x2="21" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="11" y1="18" x2="17" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>Memorix</span>
              </div>
            </div>

            <button className={`nav-item${activeScreen === "home" ? " active" : ""}`} onClick={() => switchScreen("home")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
              </svg>
              <span>Bosh sahifa</span>
            </button>
            <button className={`nav-item${activeScreen === "create" ? " active" : ""}`} onClick={() => switchScreen("create")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Yaratish</span>
            </button>
            <button className={`nav-item${activeScreen === "study" ? " active" : ""}`} onClick={() => switchScreen("study")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20l9-5-9-5-9 5 9 5z" />
                <path d="M12 12L3 7l9-5 9 5-9 5z" />
              </svg>
              <span>O'rganish</span>
            </button>
            <button className={`nav-item${activeScreen === "pro" ? " active" : ""}`} onClick={() => switchScreen("pro")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>PRO</span>
            </button>
            <button className={`nav-item${activeScreen === "progress" ? " active" : ""}`} onClick={() => switchScreen("progress")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>Progress</span>
            </button>
            <button className={`nav-item${activeScreen === "account" ? " active" : ""}`} onClick={() => switchScreen("account")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span>Profil</span>
            </button>

            {/* Desktop: avatar + logout at bottom */}
            <div className="sidebar-avatar-wrap" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <button
                className={`nav-item${activeScreen === "account" ? " active" : ""}`}
                onClick={() => switchScreen("account")}
                style={{ justifyContent: "flex-start" }}
              >
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{avatarLetter}</div>
                <span style={{ fontSize: 13 }}>{userName}</span>
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("memorix_onboarded");
                  setAccessToken(null);
                  setUser(null);
                  setDecks([]);
                  setStats(null);
                  showToast("Chiqildi ✓");
                  window.location.reload();
                }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", cursor: "pointer", fontFamily: "inherit", color: "#ef4444", fontSize: 13, fontWeight: 600 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>
          </div>

          {/* ── TOAST ── */}
          <div className={`toast${toastVisible ? " show" : ""}${sidebarOpen ? "" : " sidebar-closed"}`}>{toast}</div>
        </div>{/* end desktop-content */}
      </div>
    </>
  );
}