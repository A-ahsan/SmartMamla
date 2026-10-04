import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Scale, Hourglass, CheckCircle2, XCircle, Send, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Sheet from './Sheet'
import { Spinner } from './ui'
import { useApp } from '../contexts/AppContext'
import { submitAppeal } from '../lib/api'
import { money, num, date } from '../lib/format'

const MIN = 10
const MAX = 1000

/**
 * Shown at the bottom of a case card.
 *  - no appeal yet + allowed  → "Appeal this fine" button (only when `onAppeal` is given)
 *  - appeal exists            → its status, the driver's reason and the police note
 */
export function AppealBox({ c, onAppeal }) {
  const { t, lang } = useApp()
  const a = c.appeal

  if (!a) {
    if (!c.can_appeal || !onAppeal) return null
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation() // don't toggle the case selection
          onAppeal(c)
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-300 px-3 py-2.5 text-xs font-bold text-ink-700 transition hover:border-brand-500 hover:text-brand-700 dark:border-white/15 dark:text-ink-200 dark:hover:text-brand-300"
      >
        <Scale size={15} /> {t('ap_btn')}
      </button>
    )
  }

  const look = {
    pending: { Icon: Hourglass, title: t('ap_pending_t'), cls: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200' },
    accepted: { Icon: CheckCircle2, title: t('ap_accepted_t'), cls: 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200' },
    rejected: { Icon: XCircle, title: t('ap_rejected_t'), cls: 'border-flag-200 bg-flag-50 text-flag-700 dark:border-flag-500/20 dark:bg-flag-500/10 dark:text-flag-300' },
  }[a.status]
  if (!look) return null

  return (
    <div onClick={(e) => e.stopPropagation()} className={`mt-3 rounded-2xl border p-3 text-xs ${look.cls}`}>
      <div className="flex items-start gap-2 font-bold">
        <look.Icon size={15} className="mt-px shrink-0" />
        <span>{look.title}</span>
      </div>
      {a.status === 'pending' && <p className="mt-1 pl-[23px] opacity-80">{t('ap_pending_d')}</p>}
      {a.review_note && (
        <p className="mt-1.5 pl-[23px]">
          <span className="font-semibold">{t('ap_police_note')}:</span> {a.review_note}
        </p>
      )}
      <p className="mt-1.5 line-clamp-3 pl-[23px] opacity-80">
        <span className="font-semibold">{t('ap_yours')}</span> ({date(a.created_at, lang)}): {a.reason}
      </p>
    </div>
  )
}

/** The driver's appeal form. */
export function AppealSheet({ c, onClose, onDone }) {
  const { t, lang } = useApp()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (c) setReason('')
  }, [c])

  const len = reason.trim().length
  const valid = len >= MIN && len <= MAX

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    try {
      await submitAppeal(c.id, reason.trim())
      toast.success(t('ap_sent'), { duration: 5000 })
      onDone?.()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error(e.message || t('error_generic'), { duration: 5000 })
      if (e.code === 'already') onDone?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={Boolean(c)}
      onClose={onClose}
      title={t('ap_title')}
      footer={
        <button onClick={submit} disabled={!valid || busy} className="btn-primary w-full !py-3.5">
          {busy ? <Spinner /> : <Send size={17} />} {t('ap_submit')}
        </button>
      }
    >
      {c && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3 dark:bg-white/5">
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-semibold text-ink-400">{num(c.case_number, lang)}</div>
              <div className="truncate text-sm font-bold">{lang === 'bn' ? c.violation_bn : c.violation_en}</div>
            </div>
            <div className="shrink-0 text-lg font-extrabold">{money(c.fine_amount, lang)}</div>
          </div>

          {c.evidence?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {c.evidence.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={s.url} alt="" className="h-24 w-32 rounded-xl bg-ink-900 object-cover" />
                </a>
              ))}
            </div>
          )}

          <p className="text-sm text-ink-600 dark:text-ink-300">{t('ap_intro')}</p>

          <div>
            <label className="label" htmlFor="appeal-reason">
              {t('ap_reason')}
            </label>
            <textarea
              id="appeal-reason"
              className="input min-h-[120px] resize-y"
              value={reason}
              maxLength={MAX}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('ap_reason_ph')}
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-400">
              <span className={len > 0 && len < MIN ? 'text-flag-600' : ''}>{t('ap_min')}</span>
              <span>
                {num(len, lang)}/{num(MAX, lang)}
              </span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <AlertTriangle size={15} className="mt-px shrink-0" /> {t('ap_once')}
          </motion.div>
        </div>
      )}
    </Sheet>
  )
}
