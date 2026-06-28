import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memorix',
  description: "AI yordamida so'zlarni oson va tez o'rganing",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <body>
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  )
}