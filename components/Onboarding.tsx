'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Slide turlari ───────────────────────────────────────────────────────────

interface FeatureItem {
  icon: string
  title: string
  desc: string
}

interface SlideBase {
  icon: string
  title: string
}

interface IntroSlide extends SlideBase {
  type: 'intro' | 'final'
  desc: string
  features?: never
}

interface FeaturesSlide extends SlideBase {
  type: 'features'
  desc?: never
  features: FeatureItem[]
}

type Slide = IntroSlide | FeaturesSlide

// ─── Slide ma'lumotlari ──────────────────────────────────────────────────────

const OB_SLIDES: Slide[] = [
  {
    icon: '🧠',
    title: "Memorix ga xush kelibsiz!",
    desc: "AI yordamida so'zlarni oson va tez o'rganing. Duolingo kabi — lekin o'zbek tiliga moslashgan!",
    type: 'intro',
  },
  {
    icon: '✨',
    title: 'AI bilan flashcard yarating',
    type: 'features',
    features: [
      { icon: '📝', title: 'Matn yuboring', desc: "AI o'zi muhim so'zlarni ajratadi" },
      { icon: '📷', title: 'Rasm yuklang', desc: "Lug'at sahifasi yoki ekran surati" },
      { icon: '🌐', title: '3 ta til', desc: 'Ingliz, Rus, Koreys tillarida' },
    ],
  },
  {
    icon: '🎯',
    title: "O'rganish usullari",
    type: 'features',
    features: [
      { icon: '🔄', title: 'Flip kartalar', desc: "So'z → bosing → tarjima ko'ring" },
      { icon: '🎮', title: 'Quiz rejimi', desc: '4 variant yoki yozish bilan test' },
      { icon: '🔊', title: 'Talaffuz', desc: "To'g'ri talaffuzni eshiting" },
    ],
  },
  {
    icon: '🚀',
    title: 'Boshlashga tayyormisiz?',
    desc: "Birinchi to'plamingizni yarating va bugundan o'rganishni boshlang!",
    type: 'final',
  },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface OnboardingProps {
  /** Onboarding tugagandan keyin chaqiriladi */
  onFinish: () => void
}

// ─── Komponent ───────────────────────────────────────────────────────────────

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const [slideVisible, setSlideVisible] = useState(true)

  const isLast = index === OB_SLIDES.length - 1
  const slide = OB_SLIDES[index]

  // Faqat bir marta ko'rsatish (localStorage)
  useEffect(() => {
    const seen = localStorage.getItem('memorix_onboarded')
    if (!seen) {
      setVisible(true)
    }
  }, [])

  // Onboardingni yopish + localStorage ga yozish
  const finish = useCallback(() => {
    localStorage.setItem('memorix_onboarded', '1')
    setFadeOut(true)
    setTimeout(() => {
      setVisible(false)
      onFinish()
    }, 400)
  }, [onFinish])

  // Keyingi slide ga o'tish (slide animatsiyasi bilan)
  const handleNext = useCallback(() => {
    if (isLast) {
      finish()
      return
    }
    // Slide fade-out
    setSlideVisible(false)
    setTimeout(() => {
      setIndex((prev) => prev + 1)
      setSlideVisible(true)
    }, 150)
  }, [isLast, finish])

  if (!visible) return null

  return (
    <div
      aria-modal="true"
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #0a0015, #1a0035, #0d1545)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '40px 24px',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* ── Dots ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {OB_SLIDES.map((_, i) => (
          <div
            key={i}
            className={`ob-dot${i === index ? ' active' : ''}`}
          />
        ))}
      </div>

      {/* ── Slide kontent ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          width: '100%',
          opacity: slideVisible ? 1 : 0,
          transform: slideVisible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Icon */}
        <div className="ob-icon">{slide.icon}</div>

        {/* Sarlavha */}
        <div className="ob-title">{slide.title}</div>

        {/* Tavsif (intro / final uchun) */}
        {'desc' in slide && slide.desc && (
          <div className="ob-desc">{slide.desc}</div>
        )}

        {/* Features ro'yxati */}
        {slide.type === 'features' && (
          <div style={{ width: '100%', marginTop: 24 }}>
            {slide.features.map((f, i) => (
              <div key={i} className="ob-feature">
                <span className="ob-feature-icon">{f.icon}</span>
                <div className="ob-feature-text">
                  <strong>{f.title}</strong>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tugmalar ── */}
      <div style={{ width: '100%' }}>
        {/* Davom / Boshlash tugmasi */}
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 'var(--radius)',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.15s, transform 0.1s',
            background: isLast
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, var(--accent), var(--accent2))',
            color: 'white',
            boxShadow: '0 4px 20px rgba(108,92,231,0.4)',
          }}
        >
          {isLast ? '🚀 Boshlash!' : "Davom →"}
        </button>

        {/* O'tkazib yuborish (oxirgi slideda ko'rinmaydi) */}
        {!isLast && (
          <button
            onClick={finish}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: 13,
              width: '100%',
              padding: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            O&apos;tkazib yuborish
          </button>
        )}
      </div>
    </div>
  )
}
