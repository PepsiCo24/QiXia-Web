import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'

const notoSerif = Noto_Serif_SC({
  weight: ['500', '700'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-noto-serif',
})

const notoSans = Noto_Sans_SC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  preload: false,
  display: 'swap',
  variable: '--font-noto-sans',
})

export const metadata: Metadata = {
  title: '栖霞山 · 数字游览 | 一客一景 · 一刻一路',
  description: '南京栖霞山三维数字游览：实时客流热力、设备状态、交通运力与安全预警，按亲子、青年、文化、长者、摄影五类来客推荐路线，并可随时问栖霞。',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b100e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className={`${notoSerif.variable} ${notoSans.variable}`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
