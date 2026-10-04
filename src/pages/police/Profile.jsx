import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { BadgeCheck, Building2, Phone, Mail, Shield, LogOut, Moon, Languages, MapPin, MessageSquareText, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Page, DemoBadge, Spinner, Skeleton } from '../../components/ui'
import { LangToggle, ThemeToggle } from '../../components/Toggles'
import { getAlertSettings, saveAlertSettings } from '../../lib/api'
import { num } from '../../lib/format'

/** Area, phone and on/off switch for the per-video SMS that Omni-Eye sends to the officers of an area. */
function AlertSettings() {
  const { t } = useApp()
  const { profile, setProfile } = useAuth()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    getAlertSettings(profile)
      .then((s) => alive && setForm(s))
      .catch((e) => {
        if (!alive) return
        setError(e.message || t('error_generic'))
        setForm({ area: profile.area || '', phone: profile.phone || '', sms_alerts: profile.sms_alerts !== false })
      })
    return () => {
      alive = false
    }
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const s = await saveAlertSettings(profile, form)
      setForm(s)
      setProfile({ ...profile, area: s.area, phone: s.phone, sms_alerts: s.sms_alerts })
      toast.success(t('alerts_saved'))
    } catch (err) {
      setError(err.message || t('error_generic'))
    } finally {
      setBusy(false)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <motion.form
      onSubmit={save}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card mt-5 p-6"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          <MessageSquareText size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold">{t('alerts_title')}</h2>
          <p className="mt-0.5 text-xs text-ink-500">{t('alerts_sub')}</p>
        </div>
      </div>

      {!form ? (
        <div className="mt-5 grid gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div>
            <label className="label" htmlFor="alert-area">
              {t('alerts_area')}
            </label>
            <input id="alert-area" className="input" value={form.area} onChange={set('area')} placeholder={t('alerts_area_ph')} autoComplete="off" />
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-500">{t('alerts_area_hint')}</p>
          </div>
          <div>
            <label className="label" htmlFor="alert-phone">
              {t('phone')}
            </label>
            <input id="alert-phone" className="input font-mono" value={form.phone} onChange={set('phone')} placeholder="017XXXXXXXX" inputMode="tel" autoComplete="tel" />
            <p className="mt-1.5 text-[11px] text-ink-500">{t('alerts_phone_hint')}</p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3 text-sm font-semibold dark:bg-white/5">
            {t('alerts_on')}
            <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={form.sms_alerts} onChange={set('sms_alerts')} />
          </label>
          {error && <div className="rounded-2xl bg-flag-50 px-4 py-3 text-xs font-semibold text-flag-700 dark:bg-flag-500/10 dark:text-flag-300">{error}</div>}
          <button disabled={busy} className="btn-primary">
            {busy ? <Spinner /> : <Save size={17} />} {t('alerts_save')}
          </button>
        </div>
      )}
    </motion.form>
  )
}

export default function Profile() {
  const { t, lang } = useApp()
  const { profile, signOut } = useAuth()
  const nav = useNavigate()
  const name = lang === 'bn' ? profile.full_name_bn || profile.full_name : profile.full_name

  const rows = [
    { icon: BadgeCheck, label: t('badge'), value: profile.badge_number, mono: true },
    { icon: Shield, label: t('rank'), value: lang === 'bn' ? profile.rank_bn || profile.rank : profile.rank },
    { icon: Building2, label: t('station'), value: lang === 'bn' ? profile.station_bn || profile.station : profile.station },
    { icon: MapPin, label: t('area'), value: profile.area },
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

      <AlertSettings />
    </Page>
  )
}
