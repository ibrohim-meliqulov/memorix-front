import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memorix',
  description: "AI yordamida so'zlarni oson va tez o'rganing",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <body>
        {/* Ambient orb 1 — yuqori chap (body::before bilan bir xil, lekin Next.js uchun div) */}
        {/* CSS-dagi body::before / body::after pseudo-elementlar globals.css da saqlanadi */}

        {/* Asosiy kontent */}
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}
