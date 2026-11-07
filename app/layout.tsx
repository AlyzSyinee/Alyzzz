import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Unbounded, Hanken_Grotesk } from 'next/font/google'

const display = Unbounded({ subsets: ['latin'], variable: '--font-display' })
const body = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = { title: 'ALYZ DEV' }
export const viewport: Viewport = { themeColor: '#090405' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body text-ash antialiased">{children}</body>
    </html>
  )
}
