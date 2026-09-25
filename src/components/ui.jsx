import { useEffect, useRef, useState } from 'react'
import { motion, useInView, animate } from 'framer-motion'
import { CheckCircle2, Clock, AlertTriangle, ShieldOff, FlaskConical } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { num } from '../lib/format'
import { DEMO_MODE } from '../lib/supabase'

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}
export const stagger = (s = 0.07) => ({ hidden: {}, show: { transition: { staggerChildren: s } } })

export function Page({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function PageHeader({ title, sub, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

const STATUS = {
  unpaid: { cls: 'bg-flag-50 text-flag-600 dark:bg-flag-500/10 dark:text-flag-400', Icon: Clock },
  paid: { cls: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300', Icon: CheckCircle2 },
  success: { cls: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300', Icon: CheckCircle2 },
  disputed: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', Icon: AlertTriangle },
  pending: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', Icon: Clock },
  waived: { cls: 'bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300', Icon: ShieldOff },
  failed: { cls: 'bg-flag-50 text-flag-600 dark:bg-flag-500/10 dark:text-flag-400', Icon: AlertTriangle },
  active: { cls: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300', Icon: CheckCircle2 },
  expired: { cls: 'bg-flag-50 text-flag-600 dark:bg-flag-500/10 dark:text-flag-400', Icon: AlertTriangle },
  suspended: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', Icon: AlertTriangle },
}

export function StatusChip({ status, label }) {
  const { t } = useApp()
  const s = STATUS[status] || STATUS.pending
  return (
    <span className={`chip ${s.cls}`}>
      <s.Icon size={13} strokeWidth={2.5} />
      {label || t(`s_${status}`)}
    </span>
  )
}

const SEV = {
  minor: 'bg-sky-500',
  moderate: 'bg-amber-500',
  severe: 'bg-orange-600',
  critical: 'bg-flag-600',
}
export function SeverityDot({ severity }) {
  const { t } = useApp()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 dark:text-ink-400">
      <span className={`h-2 w-2 rounded-full ${SEV[severity] || SEV.minor}`} />
      {t(`sev_${severity}`)}
    </span>
  )
}

export function Skeleton({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink-100 dark:bg-white/5 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/5" />
    </div>
  )
}

export function Spinner({ size = 18, className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function EmptyState({ icon: Icon, title, sub, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-200 px-6 py-12 text-center dark:border-white/10"
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-base font-bold">{title}</h3>
      {sub && <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">{sub}</p>}
      {children && <div className="mt-5">{children}</div>}
    </motion.div>
  )
}

/** Counts up from 0 when scrolled into view. `format` receives the rounded number. */
export function CountUp({ to, format = (n) => n, duration = 1.4 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setVal(Math.round(v)) })
    return () => c.stop()
  }, [inView, to, duration])
  return <span ref={ref}>{format(val)}</span>
}

export function StatTile({ icon: Icon, label, value, tone = 'brand', delay = 0 }) {
  const tones = {
    brand: 'from-brand-500/15 to-brand-500/0 text-brand-700 dark:text-brand-300',
    flag: 'from-flag-500/15 to-flag-500/0 text-flag-600 dark:text-flag-400',
    amber: 'from-amber-500/15 to-amber-500/0 text-amber-600 dark:text-amber-300',
    sky: 'from-sky-500/15 to-sky-500/0 text-sky-600 dark:text-sky-300',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card relative min-w-0 overflow-hidden p-3.5 sm:p-5"
    >
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${tones[tone]} blur-xl`} />
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="truncate text-lg font-extrabold tracking-tight sm:text-2xl">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium leading-tight text-ink-500 dark:text-ink-400 sm:text-xs">{label}</div>
    </motion.div>
  )
}

export function DemoBadge({ className = '' }) {
  const { t } = useApp()
  if (!DEMO_MODE) return null
  return (
    <span title={t('demoModeHint')} className={`chip bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ${className}`}>
      <FlaskConical size={12} /> {t('demoMode')}
    </span>
  )
}

export function Num({ children }) {
  const { lang } = useApp()
  return <>{num(children, lang)}</>
}
