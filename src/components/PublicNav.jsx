import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, ShieldCheck, UserRound } from 'lucide-react'
import Logo from './Logo'
import { LangToggle, ThemeToggle } from './Toggles'
import { useApp } from '../contexts/AppContext'

export default function PublicNav() {
  const { t } = useApp()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const links = [
    { href: '#how', label: t('nav_how') },
    { href: '#features', label: t('nav_features') },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`mx-auto flex h-16 max-w-6xl items-center justify-between rounded-[22px] px-3 transition-all duration-300 sm:px-4 ${
          scrolled ? 'glass shadow-soft' : 'border border-transparent'
        }`}
      >
        <Link to="/" aria-label="SmartMamla home">
          <Logo size={34} compact />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 transition hover:text-brand-700 dark:text-ink-300 dark:hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle className="hidden sm:flex" />
          <Link to="/police/login" className="btn-ghost hidden !py-2.5 md:inline-flex">
            <ShieldCheck size={16} /> {t('nav_police')}
          </Link>
          <Link to="/login" className="btn-primary hidden !py-2.5 md:inline-flex">
            <UserRound size={16} /> {t('nav_citizen')}
          </Link>
          <button
            onClick={() => setOpen(true)}
            aria-label="Menu"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white/80 dark:border-white/10 dark:bg-white/5 md:hidden"
          >
            <Menu size={18} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: -20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="fixed inset-x-3 top-3 z-50 rounded-[28px] bg-white p-4 shadow-lift dark:bg-ink-900 md:hidden"
            >
              <div className="flex items-center justify-between">
                <Logo size={34} />
                <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-2 hover:bg-ink-100 dark:hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 flex flex-col">
                {links.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    initial={{ x: -12, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                    className="rounded-2xl px-3 py-3.5 text-base font-semibold hover:bg-ink-50 dark:hover:bg-white/5"
                  >
                    {l.label}
                  </motion.a>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                <Link to="/login" className="btn-primary">
                  <UserRound size={18} /> {t('nav_citizen')}
                </Link>
                <Link to="/police/login" className="btn-ghost">
                  <ShieldCheck size={18} /> {t('nav_police')}
                </Link>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-white/5">
                <span className="text-sm font-medium text-ink-500">{t('theme')}</span>
                <ThemeToggle />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
