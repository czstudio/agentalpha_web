"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import en from '@/locales/en.json'
import zh from '@/locales/zh.json'

type Locale = 'en' | 'zh'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: any
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  en,
  zh,
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh')

  useEffect(() => {
    // Load a saved preference; first-time visitors see the Chinese knowledge portal.
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const value = {
    locale,
    setLocale,
    t: translations[locale],
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
