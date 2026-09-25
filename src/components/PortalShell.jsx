import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { LogOut, ShieldCheck } from 'lucide-react'
import Logo from './Logo'
import { LangToggle, ThemeToggle } from './Toggles'
import { DemoBadge, Spinner } from './ui'
import ErrorBoundary from './ErrorBoundary'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

function initials(name = '') {
  return name
    .replace(/^(SI|ASI|Insp\.?|Sgt\.?)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/**
 * App frame for both portals.
 * Desktop: left sidebar. Mobile: compact top bar + floating bottom tab bar (thumb reach).
 */
export default function PortalShell({ items, variant = 'citizen' }) {
  const { t, lang } = useApp()
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const name = lang === 'bn' ? profile?.full_name_bn || profile?.full_name : profile?.full_name
  const police = variant === 'police'

  const logout = async () => {
    await signOut()
    nav(police ? '/police/login' : '/login', { replace: true })
  }

  return (
    <div className="min-h-[100dvh] bg-ink-50 dark:bg-ink-950">
      {/* Sidebar (lg+) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-ink-100 bg-white px-5 py-6 dark:border-white/5 dark:bg-ink-900 lg:flex">
        <Logo subtitle />
        {police && (
          <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white dark:bg-white dark:text-ink-900">
            <ShieldCheck size={13} /> {t('login_police_title')}
          </div>
        )}
        <nav className="mt-8 flex flex-col gap-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className="relative">
              {({ isActive }) => (
                <span
                  className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive ? 'text-brand-800 dark:text-white' : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="side-active"
                      className="absolute inset-0 rounded-2xl bg-brand-50 dark:bg-brand-500/15"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  <it.icon size={19} className="relative" />
                  <span className="relative">{it.label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <DemoBadge />
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3 dark:bg-white/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white">
              {initials(profile?.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{name}</div>
              <div className="truncate text-xs text-ink-500">{police ? profile?.badge_number : profile?.email}</div>
            </div>
            <button onClick={logout} aria-label={t('nav_logout')} className="rounded-xl p-2 text-ink-500 hover:bg-white hover:text-flag-600 dark:hover:bg-white/10">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-ink-950/80 lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Logo size={32} compact />
          <div className="flex items-center gap-2">
            <DemoBadge className="hidden sm:inline-flex" />
            <LangToggle />
            <ThemeToggle />
            <button onClick={logout} aria-label={t('nav_logout')} className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 text-ink-600 dark:border-white/10 dark:text-ink-300">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-28 lg:ml-72 lg:pb-10">
        <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-10">
          <Suspense
            fallback={
              <div className="flex min-h-[40dvh] items-center justify-center text-brand-700">
                <Spinner size={26} />
              </div>
            }
          >
            <ErrorBoundary key={loc.pathname}>
              <Outlet />
            </ErrorBoundary>
          </Suspense>
        </div>
      </main>

      {/* Bottom tabs (mobile) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between rounded-[26px] border border-ink-100 bg-white/90 p-1.5 shadow-lift backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/90">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className="relative flex-1">
              {({ isActive }) => (
                <span className="relative flex flex-col items-center gap-0.5 rounded-[20px] px-1 py-2">
                  {isActive && (
                    <motion.span
                      layoutId="tab-active"
                      className={`absolute inset-0 rounded-[20px] ${police ? 'bg-ink-900 dark:bg-brand-600' : 'bg-brand-700 dark:bg-brand-600'}`}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <it.icon size={20} className={`relative ${isActive ? 'text-white' : 'text-ink-500 dark:text-ink-400'}`} />
                  <span className={`relative text-[10.5px] font-semibold leading-tight ${isActive ? 'text-white' : 'text-ink-500 dark:text-ink-400'}`}>
                    {it.short || it.label}
                  </span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
