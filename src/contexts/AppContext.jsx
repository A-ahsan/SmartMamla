import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from '../i18n/translations'
import { load, save } from '../lib/storage'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => load('sm.lang', 'bn'))
  const [dark, setDark] = useState(() =>
    load('sm.dark', typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!dark)
    save('sm.dark', !!dark)
  }, [dark])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.classList.toggle('lang-bn', lang === 'bn')
    save('sm.lang', lang)
  }, [lang])

  const t = useCallback((key) => translations[lang]?.[key] ?? translations.en[key] ?? key, [lang])
  const toggleLang = useCallback(() => setLang((l) => (l === 'en' ? 'bn' : 'en')), [])
  const toggleDark = useCallback(() => setDark((d) => !d), [])

  const value = useMemo(() => ({ lang, t, toggleLang, dark, toggleDark }), [lang, t, toggleLang, dark, toggleDark])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
