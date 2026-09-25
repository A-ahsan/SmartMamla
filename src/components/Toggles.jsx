import { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

export function LangToggle({ className = '' }) {
  const { lang, toggleLang } = useApp()
  const id = useId()
  return (
    <button
      onClick={toggleLang}
      aria-label="Switch language"
      className={`relative flex h-10 items-center gap-1 rounded-full border border-ink-200 bg-white/80 p-1 text-xs font-bold backdrop-blur dark:border-white/10 dark:bg-white/5 ${className}`}
    >
      {['bn', 'en'].map((l) => (
        <span key={l} className="relative z-10 flex h-8 w-9 items-center justify-center">
          {lang === l && (
            <motion.span
              layoutId={`lang-pill-${id}`}
              className="absolute inset-0 rounded-full bg-brand-700 dark:bg-brand-600"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className={`relative ${lang === l ? 'text-white' : 'text-ink-500'}`}>{l === 'bn' ? 'বাং' : 'EN'}</span>
        </span>
      ))}
    </button>
  )
}

export function ThemeToggle({ className = '' }) {
  const { dark, toggleDark } = useApp()
  return (
    <button
      onClick={toggleDark}
      aria-label="Toggle dark mode"
      className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-ink-200 bg-white/80 text-ink-700 backdrop-blur transition hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-ink-200 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ y: 16, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -16, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25 }}
        >
          {dark ? <Moon size={18} /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
