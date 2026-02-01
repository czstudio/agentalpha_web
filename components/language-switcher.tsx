"use client"

import { useLanguage } from '@/contexts/language-context'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'zh' : 'en')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-11 px-3"
      onClick={toggleLanguage}
      aria-label={t.nav.toggleLanguage}
    >
      <span className="text-sm font-medium">{locale === 'en' ? 'EN' : '中文'}</span>
    </Button>
  )
}
