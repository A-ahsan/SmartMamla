import { useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, RotateCcw } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { date, num, makeQrPayload } from '../lib/format'

function Guilloche() {
  // decorative security-print pattern
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[.13]" viewBox="0 0 400 250" preserveAspectRatio="none" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <path
          key={i}
          d={`M0 ${40 + i * 14} C 100 ${-10 + i * 18}, 200 ${120 + i * 6}, 400 ${20 + i * 15}`}
          stroke="white"
          strokeWidth="1"
          fill="none"
        />
      ))}
    </svg>
  )
}

export default function LicenseCard({ license, name }) {
  const { t, lang } = useApp()
  const [flipped, setFlipped] = useState(false)
  if (!license) return null
  const expired = new Date(license.expiry_date) < new Date()

  const face = 'absolute inset-0 overflow-hidden rounded-[26px] [backface-visibility:hidden]'

  return (
    <div className="[perspective:1400px]">
      <motion.div
        className="relative aspect-[1.586] w-full cursor-pointer [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        onClick={() => setFlipped((f) => !f)}
        whileHover={{ y: -4 }}
      >
        {/* Front */}
        <div className={`${face} bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-5 text-white shadow-lift sm:p-6`}>
          <Guilloche />
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-flag-500/90 blur-[2px]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/70">
                  {lang === 'bn' ? 'গণপ্রজাতন্ত্রী বাংলাদেশ' : "People's Republic of Bangladesh"}
                </div>
                <div className="mt-0.5 text-sm font-bold">{t('licence')}</div>
              </div>
              <span className={`chip ${expired ? 'bg-white text-flag-600' : 'bg-white/15 text-white'} backdrop-blur`}>
                {t(`s_${expired ? 'expired' : license.status}`)}
              </span>
            </div>
            <div className="mt-auto flex items-end gap-4">
              <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-xl font-extrabold backdrop-blur sm:h-20 sm:w-16">
                {license.photo_url ? (
                  <img src={license.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (license.full_name || '?')
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-extrabold sm:text-lg">{name || license.full_name}</div>
                <div className="font-mono text-sm tracking-wider text-white/90 sm:text-base">{num(license.license_number, lang)}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] sm:text-[11px]">
                  <div>
                    <div className="text-white/60">{t('class')}</div>
                    <div className="truncate font-semibold">{lang === 'bn' ? license.license_class_bn || license.license_class : license.license_class}</div>
                  </div>
                  <div>
                    <div className="text-white/60">{t('blood')}</div>
                    <div className="font-semibold">{license.blood_group}</div>
                  </div>
                  <div>
                    <div className="text-white/60">{t('valid_till')}</div>
                    <div className="font-semibold">{date(license.expiry_date, lang, { month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur sm:bottom-5 sm:right-5">
            <QrCode size={16} />
          </div>
        </div>

        {/* Back: QR for police scan */}
        <div className={`${face} flex flex-col items-center justify-center gap-3 border border-ink-100 bg-white p-5 text-ink-900 shadow-lift [transform:rotateY(180deg)] dark:border-white/10`}>
          <div className="rounded-2xl bg-white p-2">
            <QRCodeSVG value={makeQrPayload('DL', license.license_number)} size={140} level="M" fgColor="#022720" />
          </div>
          <div className="text-center">
            <div className="font-mono text-sm font-bold">{license.license_number}</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{t('qr_hint')}</div>
          </div>
          <RotateCcw size={14} className="absolute right-4 top-4 text-ink-400" />
        </div>
      </motion.div>
      <p className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">
        <QrCode size={12} className="mr-1 inline" />
        {t('show_qr')}
      </p>
    </div>
  )
}
