import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Car, Bike, QrCode, ChevronDown } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { date, makeQrPayload } from '../lib/format'

function Plate({ vehicle, lang }) {
  const text = lang === 'bn' ? vehicle.registration_number_bn || vehicle.registration_number : vehicle.registration_number
  const [city, ...rest] = text.split('-')
  return (
    <div className="inline-flex flex-col items-center rounded-lg border-2 border-ink-900 bg-white px-3 py-1 text-ink-900 shadow-sm dark:border-ink-200">
      <span className="text-[11px] font-bold leading-tight">{city}</span>
      <span className="font-mono text-sm font-extrabold tracking-wider">{rest.join('-')}</span>
    </div>
  )
}

const Expiry = ({ label, value, lang }) => {
  if (!value) return null
  const days = Math.round((new Date(value) - new Date()) / 864e5)
  const tone = days < 0 ? 'text-flag-600 dark:text-flag-400' : days < 30 ? 'text-amber-600 dark:text-amber-300' : 'text-ink-800 dark:text-ink-100'
  return (
    <div>
      <div className="text-[11px] text-ink-500">{label}</div>
      <div className={`text-sm font-semibold ${tone}`}>{date(value, lang)}</div>
    </div>
  )
}

export default function VehicleCard({ vehicle, highlight = false, index = 0 }) {
  const { t, lang } = useApp()
  const [open, setOpen] = useState(false)
  const Icon = vehicle.vehicle_type === 'motorcycle' ? Bike : Car

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`card overflow-hidden ${highlight ? 'ring-2 ring-brand-500' : ''}`}
    >
      <div className="relative flex items-center gap-4 bg-gradient-to-r from-ink-50 to-white p-4 dark:from-white/5 dark:to-transparent sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow">
          <Icon size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">
            {vehicle.make} {vehicle.model}
          </div>
          <div className="text-xs text-ink-500">{vehicle.color}</div>
        </div>
        <Plate vehicle={vehicle} lang={lang} />
        {highlight && (
          <span className="chip absolute left-3 top-2 bg-brand-600 text-[10px] text-white">{t('matched')}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
        <div>
          <div className="text-[11px] text-ink-500">{vehicle.reg_id ? t('reg_no') : t('chassis')}</div>
          <div className="truncate font-mono text-xs font-semibold">{vehicle.reg_id || vehicle.chassis_number || '—'}</div>
        </div>
        <div>
          <div className="text-[11px] text-ink-500">{t('engine')}</div>
          <div className="truncate font-mono text-xs font-semibold">{vehicle.engine_number || '—'}</div>
        </div>
        <Expiry label={t('tax_token')} value={vehicle.tax_token_expiry} lang={lang} />
        <Expiry label={t('fitness')} value={vehicle.fitness_expiry} lang={lang} />
        <Expiry label={t('valid_till')} value={vehicle.registration_valid_until} lang={lang} />
      </div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 border-t border-ink-100 py-3 text-xs font-semibold text-brand-700 hover:bg-ink-50 dark:border-white/5 dark:text-brand-300 dark:hover:bg-white/5"
      >
        <QrCode size={14} /> {t('show_qr')}
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="flex flex-col items-center gap-2 pb-5 pt-1">
              <div className="rounded-2xl bg-white p-3 shadow-soft">
                <QRCodeSVG value={makeQrPayload('VR', vehicle.reg_id || vehicle.registration_number)} size={150} fgColor="#022720" />
              </div>
              <p className="px-6 text-center text-[11px] text-ink-500">{t('qr_hint')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
