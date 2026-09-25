import { motion } from 'framer-motion'
import { BadgeCheck, Building2, Phone, Mail, Shield, LogOut, Moon, Languages } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Page, DemoBadge } from '../../components/ui'
import { LangToggle, ThemeToggle } from '../../components/Toggles'
import { num } from '../../lib/format'

export default function Profile() {
  const { t, lang } = useApp()
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const name = lang === 'bn' ? profile.full_name_bn || profile.full_name : profile.full_name

  const rows = [
    { icon: BadgeCheck, label: t('badge'), value: profile.badge_number, mono: true },
    { icon: Shield, label: t('rank'), value: lang === 'bn' ? profile.rank_bn || profile.rank : profile.rank },
    { icon: Building2, label: t('station'), value: lang === 'bn' ? profile.station_bn || profile.station : profile.station },
    { icon: Phone, label: t('phone'), value: profile.phone && num(profile.phone, lang) },
    { icon: Mail, label: t('email'), value: profile.email },
  ].filter((r) => r.value)

  return (
    <Page className="mx-auto max-w-xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="relative bg-ink-900 px-6 pb-14 pt-8 text-center text-white">
          <div className="bg-grid absolute inset-0 opacity-30" />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/40 blur-2xl" />
          <div className="relative">
            <DemoBadge />
          </div>
        </div>
        <div className="relative -mt-12 px-6 pb-6 text-center">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-800 text-3xl font-extrabold text-white ring-8 ring-white dark:ring-ink-900"
          >
            <Shield size={40} />
          </motion.div>
          <h1 className="mt-4 text-2xl font-extrabold">{name}</h1>
          <p className="text-sm text-ink-500">{lang === 'bn' ? profile.rank_bn || profile.rank : profile.rank}</p>
        </div>
        <ul className="divide-y divide-ink-100 border-t border-ink-100 dark:divide-white/5 dark:border-white/5">
          {rows.map((r, i) => (
            <motion.li key={r.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="flex items-center gap-4 px-6 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-600 dark:bg-white/5 dark:text-ink-300">
                <r.icon size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-xs text-ink-500">{r.label}</div>
                <div className={`truncate font-semibold ${r.mono ? 'font-mono' : ''}`}>{r.value}</div>
              </div>
            </motion.li>
          ))}
          <li className="flex items-center justify-between px-6 py-4">
            <span className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 dark:bg-white/5">
                <Languages size={18} />
              </span>
              <span className="font-semibold">{lang === 'bn' ? 'ভাষা' : 'Language'}</span>
            </span>
            <LangToggle />
          </li>
          <li className="flex items-center justify-between px-6 py-4">
            <span className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 dark:bg-white/5">
                <Moon size={18} />
              </span>
              <span className="font-semibold">{t('theme')}</span>
            </span>
            <ThemeToggle />
          </li>
        </ul>
        <div className="p-6">
          <button
            onClick={async () => {
              await signOut()
              nav('/police/login', { replace: true })
            }}
            className="btn w-full border border-flag-200 bg-flag-50 text-flag-600 hover:bg-flag-100 dark:border-flag-500/20 dark:bg-flag-500/10"
          >
            <LogOut size={18} /> {t('nav_logout')}
          </button>
        </div>
      </motion.div>
    </Page>
  )
}
