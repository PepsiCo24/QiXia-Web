'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { translatePersonaName, translatePoiName, localizeText, type Locale } from '@/lib/i18n'

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (zh: string, en: string) => string
  poi: typeof translatePoiName
  persona: typeof translatePersonaName
  text: typeof localizeText
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const STORAGE_KEY = 'qixia-language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>('zh-CN')
  const pathname = usePathname()
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'zh-CN') updateLocale(stored)
      else if (navigator.language.toLowerCase().startsWith('en')) updateLocale('en')
    } catch { /* storage may be unavailable */ }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN'
    document.title = pathname.startsWith('/photo')
      ? (locale === 'en' ? 'Digital Tour Dashboard · Photo Memories' : '数字游览大屏 · 栖霞留影')
      : (locale === 'en' ? 'Digital Tour Dashboard · Qixia Mountain' : '数字游览大屏 · 栖霞山')
  }, [locale, pathname])
  const setLocale = useCallback((value: Locale) => {
    updateLocale(value)
    try { localStorage.setItem(STORAGE_KEY, value) } catch { /* storage may be unavailable */ }
  }, [])
  const value = useMemo<LanguageContextValue>(() => ({
    locale, setLocale,
    t: (zh, en) => locale === 'zh-CN' ? zh : en,
    poi: translatePoiName,
    persona: translatePersonaName,
    text: localizeText,
  }), [locale, setLocale])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()
  return <label className="language-switcher"><span aria-hidden="true">◎</span><select aria-label={t('切换语言', 'Change language')} value={locale} onChange={event => setLocale(event.target.value as Locale)}><option value="zh-CN">简体中文</option><option value="en">English</option></select></label>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider')
  return value
}
