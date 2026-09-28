import { useState } from 'react'
import { motion } from 'framer-motion'
import { Cctv, Camera, Maximize2 } from 'lucide-react'
import Sheet from './Sheet'
import { useApp } from '../contexts/AppContext'
import { num } from '../lib/format'

const LABEL = { frame: 'ev_frame', crop: 'ev_crop', plate: 'ev_plate' }

/** Small thumbnail strip for a case card. Tapping opens the full-size viewer. */
export function EvidenceStrip({ c }) {
  const { t, lang } = useApp()
  const [open, setOpen] = useState(false)
  const shots = c.evidence || []
  if (!shots.length) return null
  const ai = c.source === 'ai'

  const openViewer = (e) => {
    e.stopPropagation() // don't toggle the case selection
    e.preventDefault()
    setOpen(true)
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openViewer}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openViewer(e)}
        className="mt-3 flex items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-2 pr-3 transition hover:border-brand-300 dark:border-white/5 dark:bg-white/5"
      >
        <div className="flex -space-x-3">
          {shots.slice(0, 3).map((s, i) => (
            <img
              key={s.url}
              src={s.url}
              alt=""
              loading="lazy"
              className="h-12 w-12 rounded-xl border-2 border-white object-cover shadow-sm dark:border-ink-900"
              style={{ zIndex: 3 - i }}
            />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink-800 dark:text-ink-100">
            {ai ? <Cctv size={13} className="text-brand-600 dark:text-brand-300" /> : <Camera size={13} />}
            {ai ? t('ev_ai') : t('ev_title')}
          </div>
          <div className="text-[11px] text-ink-500">
            {num(shots.length, lang)} {t('ev_photos')} · {t('ev_hint')}
          </div>
        </div>
        <Maximize2 size={15} className="shrink-0 text-ink-400" />
      </div>
      {/* React events bubble out of portals: keep viewer clicks from toggling the case card */}
      <span onClick={(e) => e.stopPropagation()} className="contents">
        <EvidenceViewer open={open} onClose={() => setOpen(false)} c={c} />
      </span>
    </>
  )
}

export function EvidenceViewer({ open, onClose, c }) {
  const { t, lang } = useApp()
  const shots = c.evidence || []
  const [i, setI] = useState(0)
  const cur = shots[Math.min(i, shots.length - 1)]
  if (!shots.length) return null

  return (
    <Sheet open={open} onClose={onClose} title={`${t('ev_title')} · ${num(c.case_number, lang)}`} wide>
      <div onClick={(e) => e.stopPropagation()}>
        <motion.a
          key={cur?.url}
          href={cur?.url}
          target="_blank"
          rel="noreferrer"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="block overflow-hidden rounded-2xl bg-ink-950"
        >
          <img src={cur?.url} alt={t(LABEL[cur?.kind] || 'ev_frame')} className="max-h-[55dvh] w-full object-contain" />
        </motion.a>
        <div className="mt-2 text-center text-xs font-semibold text-ink-500">{t(LABEL[cur?.kind] || 'ev_frame')}</div>
        {shots.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {shots.map((s, k) => (
              <button
                key={s.url}
                onClick={() => setI(k)}
                className={`overflow-hidden rounded-xl border-2 transition ${k === i ? 'border-brand-500' : 'border-transparent opacity-70'}`}
              >
                <img src={s.url} alt="" className="h-16 w-20 object-cover" />
                <span className="block bg-ink-100 py-0.5 text-[10px] font-semibold dark:bg-white/5">{t(LABEL[s.kind] || 'ev_frame')}</span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 pb-2 text-center text-[11px] text-ink-400">
          {c.source === 'ai' ? t('ev_ai') : t('ev_title')} · {lang === 'bn' ? c.location_bn || c.location : c.location}
        </p>
      </div>
    </Sheet>
  )
}
