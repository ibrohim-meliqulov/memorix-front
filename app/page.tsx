"use client";

import React, { useState } from "react";

// Foydalanuvchi ma'lumotlari interfeysi
interface UserProfile {
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
}

// To'plam (Deck) interfeysi
interface Deck {
  id: string;
  title: string;
  cardCount: number;
  lastStudied?: string;
}

export default function Page() {
  // Loyihangizdagi mavjud asosiy state'lar
  const [activeScreen, setActiveScreen] = useState<string>("dashboard");
  const [inputMethod, setInputMethod] = useState<"text" | "image" | "file">("text");

  // Test holati uchun namuna ma'lumotlar (Buni backend yoki o'z state'ingizga bog'laysiz)
  const [user, setUser] = useState<UserProfile | null>({
    firstName: "Ibrahim",
  });

  // Agar to'plamlar bo'sh bo'lsa, Smart Empty State ishga tushadi
  const [decks, setDecks] = useState<Deck[]>([]);

  // Ekranlarni almashtirish funksiyasi
  const switchScreen = (screen: string) => {
    setActiveScreen(screen);
  };

  return (
    <div className="min-h-screen bg-[#0f0c1b] text-white font-sans antialiased">
      {/* Yuqori Navigatsiya paneli (Navbar) */}
      <header className="border-b border-white/5 bg-[#141125]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => switchScreen("dashboard")}
          >
            <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              MEMORIX
            </span>
            <span className="bg-purple-500/10 text-purple-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-purple-500/20">
              AI v2
            </span>
          </div>

          <nav className="flex items-center space-x-1">
            <button
              onClick={() => switchScreen("dashboard")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeScreen === "dashboard" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                }`}
            >
              Asosiy Sahifa
            </button>
            <button
              onClick={() => {
                switchScreen("create");
                setInputMethod("text");
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeScreen === "create" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"
                }`}
            >
              Yaratish
            </button>
          </nav>
        </div>
      </header>

      {/* Asosiy Kontent qismi */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* DASHBOARD EKRANI */}
        {activeScreen === "dashboard" && (
          <div className="space-y-8 animate-fadeIn">

            {/* AGAR TO'PLAMLAR BO'SH BO'LSA: SMART EMPTY STATE (GIZMO STYLE) */}
            {decks.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4 max-w-4xl mx-auto w-full">
                {/* Effektli Emotsiya */}
                <div className="text-6xl mb-6 relative group selection:bg-transparent">
                  <span className="inline-block animate-bounce duration-1000">🔮</span>
                  <div className="absolute -inset-1 bg-purple-500/20 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition-opacity"></div>
                </div>

                {/* Xush kelibsiz sarlavhasi */}
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
                  Xush kelibsiz, <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{user?.firstName || "Do'stim"}</span>!
                </h2>

                <p className="text-gray-400 text-base md:text-lg mb-12 max-w-md leading-relaxed">
                  Memorix bilan so'zlarni sun'iy intellekt yordamida soniyalarda yuklang va eslab qoling. Boshlash uchun qaysi usul sizga qulay?
                </p>

                {/* Gizmo uslubidagi Katta Tezkor Kartalar (Quick Action Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">

                  {/* 1-Karta: Matn orqali */}
                  <button
                    onClick={() => {
                      switchScreen("create");
                      setInputMethod("text");
                    }}
                    className="flex flex-col items-center p-8 bg-[#141125] border border-white/5 rounded-2xl hover:bg-white/5 hover:border-purple-500/40 transition-all duration-300 group text-center shadow-xl shadow-black/20"
                  >
                    <div className="p-4 bg-purple-500/10 rounded-xl mb-4 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">Matn orqali yaratish</h3>
                    <p className="text-sm text-gray-400 leading-normal">Shunchaki maqola yoki so'zlar ro'yxatini joylang, AI kartochka qilib beradi.</p>
                  </button>

                  {/* 2-Karta: Rasm orqali */}
                  <button
                    onClick={() => {
                      switchScreen("create");
                      setInputMethod("image");
                    }}
                    className="flex flex-col items-center p-8 bg-[#141125] border border-white/5 rounded-2xl hover:bg-white/5 hover:border-blue-500/40 transition-all duration-300 group text-center shadow-xl shadow-black/20"
                  >
                    <div className="p-4 bg-blue-500/10 rounded-xl mb-4 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Rasm orqali yaratish</h3>
                    <p className="text-sm text-gray-400 leading-normal">Kitob sahifasi yoki lug'at rasmini yuklang, tizim matnni o'zi aniqlaydi.</p>
                  </button>

                </div>
              </div>
            ) : (
              /* AGAR TO'PLAMLAR MAVJUD BO'LSA: AN'ANAVIY RO'YXAT */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Sizning to'plamlaringiz</h2>
                  <button
                    onClick={() => switchScreen("create")}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  >
                    + Yangi yaratish
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {decks.map((deck) => (
                    <div key={deck.id} className="p-5 bg-[#141125] border border-white/5 rounded-2xl hover:border-purple-500/20 transition-all">
                      <h4 className="font-bold text-lg mb-1">{deck.title}</h4>
                      <p className="text-sm text-gray-400">{deck.cardCount} ta so'z mavjud</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* YARATISH (CREATE) EKRANI */}
        {activeScreen === "create" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            <div className="flex items-center space-x-3 mb-2">
              <button
                onClick={() => switchScreen("dashboard")}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold">Yangi to'plam yaratish</h2>
            </div>

            {/* Metodni tanlash tablari */}
            <div className="flex p-1 bg-[#141125] rounded-xl border border-white/5">
              <button
                onClick={() => setInputMethod("text")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${inputMethod === "text" ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                  }`}
              >
                Matn joylash
              </button>
              <button
                onClick={() => setInputMethod("image")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${inputMethod === "image" ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                  }`}
              >
                Rasm yuklash
              </button>
            </div>

            {/* Dinamik input kontenti */}
            <div className="p-6 bg-[#141125] rounded-2xl border border-white/5 min-h-[250px] flex flex-col justify-between">
              {inputMethod === "text" ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <label className="text-sm text-gray-400 font-medium">Matn yoki so'zlar ro'yxati</label>
                  <textarea
                    placeholder="Masalan: Apple - olma, Book - kitob... yoki ixtiyoriy inglizcha matn"
                    className="w-full flex-1 min-h-[150px] p-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
                  ></textarea>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-8 hover:border-purple-500/30 transition-colors cursor-pointer group">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📸</div>
                  <p className="text-sm text-gray-300 font-medium mb-1">Rasm faylini shu yerga tashlang yoki tanlang</p>
                  <p className="text-xs text-gray-500">PNG, JPG (Maksimal 10MB)</p>
                </div>
              )}

              <button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-purple-600/10 active:scale-[0.99]">
                ✨ AI orqali kartochkalarni shakllantirish
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}