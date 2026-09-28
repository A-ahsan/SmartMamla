import { motion } from 'framer-motion'
import { MapPin, CalendarDays, Car, Bike, BadgeCheck, Check } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { money, date, isOverdue, num } from '../lib/format'
import { StatusChip, SeverityDot } from './ui'
import { EvidenceStrip } from './Evidence'

export default function CaseCard({ c, vehicle, driverName, selectable, selected, onToggle, index = 0, showOfficer = true }) {
  const { t, lang } = useApp()
  const overdue = isOverdue(c)
  const VIcon = vehicle?.vehicle_type === 'motorcycle' ? Bike : Car
  const Wrapper = selectable ? motion.button : motion.div

  return (
    <Wrapper
      type={selectable ? 'button' : undefined}
      onClick={selectable ? onToggle : undefined}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.35 }}
      whileTap={selectable ? { scale: 0.985 } : undefined}
      className={`card group relative block w-full overflow-hidden p-4 text-left transition-shadow hover:shadow-lift sm:p-5 ${
        selected ? 'ring-2 ring-brand-500' : ''
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${c.status === 'paid' ? 'bg-brand-500' : overdue ? 'bg-flag-500' : 'bg-amber-400'}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        {selectable && (
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
              selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 dark:border-white/20'
            }`}
          >
            {selected && <Check size={14} strokeWidth={3} />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] font-semibold text-ink-400">{num(c.case_number, lang)}</div>
          <h3 className="mt-0.5 text-[15px] font-bold leading-snug">{lang === 'bn' ? c.violation_bn : c.violation_en}</h3>
          <div className="mt-1">
            <SeverityDot severity={c.severity} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="text-lg font-extrabold tracking-tight">{money(c.fine_amount, lang)}</div>
          {overdue ? <StatusChip status="expired" label={t('overdue')} /> : <StatusChip status={c.status} />}
        </div>
      </div>

      <div className="mt-3 grid gap-1.5 text-xs text-ink-500 dark:text-ink-400 sm:grid-cols-2">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} /> {lang === 'bn' ? c.location_bn || c.location : c.location}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} /> {date(c.created_at, lang)}
          {c.status === 'unpaid' && (
            <span className={overdue ? 'font-semibold text-flag-600' : ''}>
              · {t('due_by')} {date(c.due_date, lang)}
            </span>
          )}
        </span>
        {vehicle && (
          <span className="flex items-center gap-1.5">
            <VIcon size={13} /> {lang === 'bn' ? vehicle.registration_number_bn || vehicle.registration_number : vehicle.registration_number}
          </span>
        )}
        {driverName && <span className="flex items-center gap-1.5 font-semibold text-ink-700 dark:text-ink-200">{driverName}</span>}
        {showOfficer && c.officer_name && (
          <span className="flex items-center gap-1.5">
            <BadgeCheck size={13} /> {c.officer_name} · {c.officer_badge}
          </span>
        )}
      </div>

      <EvidenceStrip c={c} />
    </Wrapper>
  )
}
