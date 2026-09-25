import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Gavel, Phone, IdCard, AlertTriangle, CheckCircle2, Wallet, FileWarning, Car } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { money, num, date, isOverdue } from '../lib/format'
import { StatusChip, EmptyState } from './ui'
import CaseCard from './CaseCard'
import VehicleCard from './VehicleCard'

/** Full record of a driver as seen by a police officer. */
export default function DriverRecord({ record, onFile }) {
  const { t, lang } = useApp()
  const [filter, setFilter] = useState('all')
  const { profile, licenses = [], vehicles = [], cases = [], matchedVehicleId } = record
  const license = licenses[0]

  const s = useMemo(() => {
    const unpaid = cases.filter((c) => c.status === 'unpaid')
    return {
      total: cases.length,
      unpaid: unpaid.length,
      paid: cases.filter((c) => c.status === 'paid').length,
      due: unpaid.reduce((a, c) => a + Number(c.fine_amount), 0),
      overdue: unpaid.filter(isOverdue).length,
      fined: cases.reduce((a, c) => a + Number(c.fine_amount), 0),
    }
  }, [cases])

  const shown = filter === 'all' ? cases : cases.filter((c) => c.status === filter)
  const vehicleById = (id) => vehicles.find((v) => v.id === id)
  const name =
    (lang === 'bn' ? license?.full_name_bn || profile?.full_name_bn : license?.full_name) || profile?.full_name || license?.full_name
  const licenceExpired = license && new Date(license.expiry_date) < new Date()

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Identity header */}
      <div className="card overflow-hidden">
        <div className="relative bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white sm:p-6">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/30 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.6, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-xl font-extrabold"
            >
              {license?.photo_url ? (
                <img src={license.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile?.full_name || license?.full_name || '?')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
              )}
            </motion.div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/50">{t('driver_details')}</div>
              <h2 className="truncate text-xl font-extrabold sm:text-2xl">{name}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
                {license && (
                  <span className="flex items-center gap-1 font-mono">
                    <IdCard size={13} /> {license.license_number}
                  </span>
                )}
                {profile?.phone && (
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-1 hover:text-white">
                    <Phone size={13} /> {num(profile.phone, lang)}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="relative mt-4 flex flex-wrap gap-2">
            {license ? (
              <StatusChip status={licenceExpired ? 'expired' : license.status} label={`${t('licence')}: ${t(`s_${licenceExpired ? 'expired' : license.status}`)}`} />
            ) : (
              <span className="chip bg-flag-500 text-white">
                <FileWarning size={13} /> {lang === 'bn' ? 'কোনো লাইসেন্স নেই' : 'No licence on record'}
              </span>
            )}
            {s.overdue > 0 && (
              <span className="chip bg-flag-500 text-white">
                <AlertTriangle size={13} /> {num(s.overdue, lang)} {t('overdue')}
              </span>
            )}
            {s.unpaid === 0 && s.total > 0 && (
              <span className="chip bg-brand-500/20 text-brand-200">
                <CheckCircle2 size={13} /> {t('all_clear')}
              </span>
            )}
          </div>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-2 divide-ink-100 dark:divide-white/5 sm:grid-cols-4 sm:divide-x">
          {[
            { label: t('total_cases'), value: num(s.total, lang), cls: '' },
            { label: t('unpaid_cases'), value: num(s.unpaid, lang), cls: s.unpaid ? 'text-flag-600 dark:text-flag-400' : '' },
            { label: t('paid_cases'), value: num(s.paid, lang), cls: 'text-brand-700 dark:text-brand-300' },
            { label: t('amount_due'), value: money(s.due, lang), cls: s.due ? 'text-flag-600 dark:text-flag-400' : '' },
          ].map((x, i) => (
            <motion.div
              key={x.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="border-b border-ink-100 p-4 dark:border-white/5 sm:border-b-0"
            >
              <div className={`text-xl font-extrabold sm:text-2xl ${x.cls}`}>{x.value}</div>
              <div className="text-[11px] font-medium text-ink-500">{x.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ink-100 p-4 dark:border-white/5">
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <Wallet size={14} /> {t('total_fined')}: <b className="text-ink-800 dark:text-ink-100">{money(s.fined, lang)}</b>
          </div>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onFile} className="btn-danger !py-3">
            <Gavel size={18} /> {t('file_mamla')}
          </motion.button>
        </div>
      </div>

      {/* Vehicles */}
      {vehicles.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <Car size={18} /> {t('vehicles')} <span className="text-ink-400">({num(vehicles.length, lang)})</span>
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[...vehicles]
              .sort((a, b) => (b.id === matchedVehicleId) - (a.id === matchedVehicleId))
              .map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} highlight={v.id === matchedVehicleId} index={i} />
              ))}
          </div>
        </section>
      )}

      {/* Case history */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-extrabold">{t('case_history')}</h3>
          <div className="flex gap-1 rounded-full bg-ink-100 p-1 dark:bg-white/5">
            {['all', 'unpaid', 'paid'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className="relative rounded-full px-3 py-1.5 text-xs font-semibold">
                {filter === f && <motion.span layoutId="rec-filter" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-ink-700" />}
                <span className="relative">{f === 'all' ? t('filter_all') : t(`s_${f}`)}</span>
              </button>
            ))}
          </div>
        </div>
        {shown.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {shown.map((c, i) => (
              <CaseCard key={c.id} c={c} vehicle={vehicleById(c.vehicle_id)} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState icon={CheckCircle2} title={t('no_cases')} sub={t('no_cases_sub')} />
        )}
      </section>

      {license && (
        <p className="text-center text-[11px] text-ink-400">
          {t('licence')} · {t('issued')} {date(license.issue_date, lang)} · {t('valid_till')} {date(license.expiry_date, lang)}
        </p>
      )}
    </motion.div>
  )
}
