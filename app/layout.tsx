import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import './immersive.css'
import './text-layout.css'
import { LanguageProvider } from '@/components/qixia/language-provider'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export const metadata: Metadata = {
  title: '数字游览大屏',
  description: '数字游览大屏：南京栖霞山三维数字游览、客流热力、设备状态、交通运力与安全预警。',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: `${basePath}/icon-light-32x32.png`, media: '(prefers-color-scheme: light)' },
      { url: `${basePath}/icon-dark-32x32.png`, media: '(prefers-color-scheme: dark)' },
      { url: `${basePath}/icon.svg`, type: 'image/svg+xml' },
    ],
    apple: `${basePath}/apple-icon.png`,
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
    <html lang="zh-CN" suppressHydrationWarning data-app-name="数字游览大屏">
      <body className="antialiased" suppressHydrationWarning>
        <LanguageProvider>{children}</LanguageProvider>
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_GITHUB_PAGES !== 'true' && <Analytics />}
      </body>
    </html>
  )
}
