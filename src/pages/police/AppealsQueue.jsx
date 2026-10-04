import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Scale, CheckCircle2, XCircle, MapPin, CalendarDays, Car, Bike, IdCard, Phone, MessageSquareQuote, Cctv, Hourglass } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { Skeleton, EmptyState, Spinner } from '../../components/ui'
import Sheet from '../../components/Sheet'
import { getAppeals, reviewAppeal } from '../../lib/api'
import { num, date, dateTime, money } from '../../lib/format'

const FILTERS = ['pending', 'accepted', 'rejected']
const KIND = { frame: 'ev_frame', crop: 'ev_crop', plate: 'ev_plate' }

function Driver({ a, lang }) {
  const name = (lang === 'bn' ? a.license?.full_name_bn : a.license?.full_name_en) || a.driver?.full_name || '—'
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-extrabold text-white">
        {a.license?.photo_url ? <img src={a.license.photo_url} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{name}</div>
        <div className="flex flex-wrap gap-x-3 text-[11px] text-ink-500">
          {a.license?.license_number && (
            <span className="flex items-center gap-1 font-mono">
              <IdCard size={11} /> {a.license.license_number}
            </span>
          )}
          {a.driver?.phone && (
            <span className="flex items-center gap-1">
              <Phone size={11} /> {num(a.driver.phone, lang)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function AppealCard({ a, index, onReview }) {
  const { t, lang } = useApp()
  const c = a.c
  const VIcon = a.vehicle?.vehicle_type === 'motorcycle' ? Bike : Car
  const shot = c?.evidence?.find((e) => e.kind === 'crop') || c?.evidence?.[0]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className="card flex flex-col overflow-hidden"
    >
      {shot ? (
        <button onClick={() => onReview(a)} className="relative block h-40 w-full bg-ink-900">
          <img src={shot.url} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="chip absolute left-3 top-3 bg-black/60 text-white backdrop-blur">
            <Cctv size={12} /> {t('ev_ai')}
          </span>
        </button>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Driver a={a} lang={lang} />
        {c && (
          <div className="rounded-2xl bg-ink-50 p-3 text-xs dark:bg-white/5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[11px] font-semibold text-ink-400">{num(c.case_number, lang)}</div>
                <div className="text-sm font-bold">{lang === 'bn' ? c.violation_bn : c.violation_en}</div>
              </div>
              <div className="shrink-0 text-base font-extrabold">{money(c.fine_amount, lang)}</div>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-ink-500">
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {lang === 'bn' ? c.location_bn || c.location : c.location}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays size={12} /> {date(c.created_at, lang)}
              </span>
              {a.vehicle && (
                <span className="flex items-center gap-1 font-mono">
                  <VIcon size={12} /> {a.vehicle.registration_number}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-bold text-ink-700 dark:text-ink-200">
            <MessageSquareQuote size={13} /> {t('apq_driver_says')}
            <span className="ml-auto font-normal text-ink-400">{date(a.created_at, lang)}</span>
          </div>
          <p className="line-clamp-4 whitespace-pre-line text-ink-600 dark:text-ink-300">{a.reason}</p>
        </div>

        {a.status === 'pending' ? (
          <button onClick={() => onReview(a)} className="btn-primary mt-auto w-full !py-3">
            <Scale size={17} /> {t('apq_review')}
          </button>
        ) : (
          <div
            className={`mt-auto rounded-2xl border p-3 text-xs ${
              a.status === 'accepted'
                ? 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200'
                : 'border-flag-200 bg-flag-50 text-flag-700 dark:border-flag-500/20 dark:bg-flag-500/10 dark:text-flag-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              {a.status === 'accepted' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {t(a.status === 'accepted' ? 'apq_done_accept' : 'apq_done_reject')}
            </div>
            {a.review_note && <p className="mt-1">{a.review_note}</p>}
            <p className="mt-1 opacity-70">
              {t('apq_by')} {a.reviewed_by_name} · {dateTime(a.reviewed_at, lang)} · {t(a.sms_sent ? 'apq_sms_ok' : 'apq_sms_fail')}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ReviewAppealSheet({ a, onClose, onDone }) {
  const { t, lang } = useApp()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(null) // 'accepted' | 'rejected'
  const [shot, setShot] = useState(0)

  useEffect(() => {
    setNote('')
    setShot(0)
  }, [a?.id])

  const decide = async (decision) => {
    if (busy) return
    if (decision === 'rejected' && note.trim().length < 5) {
      toast.error(t('apq_note_reject'))
      document.getElementById('appeal-note')?.focus()
      return
    }
    setBusy(decision)
    try {
      const r = await reviewAppeal(a.id, decision, note.trim())
      toast.success(t(decision === 'accepted' ? 'apq_done_accept' : 'apq_done_reject'))
      if (r.sms?.success) toast.success(`${t('apq_sms_ok')} (${r.sms.to})`)
      else toast.error(`${t('apq_sms_fail')}: ${r.sms?.error || ''}`, { duration: 6000 })
      onDone()
    } catch (e) {
      console.error(e)
      toast.error(e.message || t('error_generic'))
      if (e.code === 'already_reviewed') onDone()
    } finally {
      setBusy(null)
    }
  }

  const c = a?.c
  const shots = c?.evidence || []
  const cur = shots[Math.min(shot, shots.length - 1)]

  return (
    <Sheet
      open={Boolean(a)}
      onClose={onClose}
      title={t('apq_review')}
      wide
      footer={
        a?.status === 'pending' && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => decide('rejected')} disabled={Boolean(busy)} className="btn-danger !px-3 !py-3.5">
              {busy === 'rejected' ? <Spinner /> : <XCircle size={17} />} {t('apq_reject')}
            </button>
            <button onClick={() => decide('accepted')} disabled={Boolean(busy)} className="btn-primary !px-3 !py-3.5">
              {busy === 'accepted' ? <Spinner /> : <CheckCircle2 size={17} />} {t('apq_accept')}
            </button>
          </div>
        )
      }
    >
      {a && (
        <div className="space-y-4">
          {cur && (
            <div>
              <a href={cur.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-ink-950">
                <img src={cur.url} alt="" className="max-h-[38dvh] w-full object-contain" />
              </a>
              {shots.length > 1 && (
                <div className="mt-2 flex gap-2">
                  {shots.map((s, k) => (
                    <button key={s.url} onClick={() => setShot(k)} className={`overflow-hidden rounded-xl border-2 ${k === shot ? 'border-brand-500' : 'border-transparent opacity-70'}`}>
                      <img src={s.url} alt="" className="h-14 w-20 object-cover" />
                      <span className="block bg-ink-100 py-0.5 text-[10px] font-semibold dark:bg-white/5">{t(KIND[s.kind] || 'ev_frame')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Driver a={a} lang={lang} />

          {c && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-3 dark:bg-white/5">
              <div className="min-w-0">
                <div className="font-mono text-[11px] font-semibold text-ink-400">
                  {num(c.case_number, lang)}
                  {a.vehicle ? ` · ${a.vehicle.registration_number}` : ''}
                </div>
                <div className="truncate text-sm font-bold">{lang === 'bn' ? c.violation_bn : c.violation_en}</div>
                <div className="text-[11px] text-ink-500">
                  {lang === 'bn' ? c.location_bn || c.location : c.location} · {dateTime(c.created_at, lang)}
                </div>
              </div>
              <div className="shrink-0 text-lg font-extrabold">{money(c.fine_amount, lang)}</div>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
              <MessageSquareQuote size={14} /> {t('apq_driver_says')}
              <span className="ml-auto font-normal opacity-70">
                {t('apq_on')} {dateTime(a.created_at, lang)}
              </span>
            </div>
            <p className="whitespace-pre-line text-amber-950 dark:text-amber-100">{a.reason}</p>
          </div>

          {a.status === 'pending' && (
            <div>
              <label className="label" htmlFor="appeal-note">
                {t('apq_note')}
              </label>
              <textarea
                id="appeal-note"
                className="input min-h-[80px] resize-y"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`${t('apq_reject')}: ${t('apq_note_reject')} · ${t('apq_accept')}: ${t('apq_note_accept')}`}
              />
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** Police: drivers' appeals against AI-camera fines. `onChange` fires after a decision (to refresh counters). */
export default function AppealsQueue({ onChange }) {
  const { t, lang } = useApp()
  const [filter, setFilter] = useState('pending')
  const [list, setList] = useState(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    try {
      setList(await getAppeals(filter))
      setFailed(false)
    } catch (e) {
      console.error(e)
      setFailed(true)
      setList((l) => l || [])
    }
  }, [filter])

  useEffect(() => {
    setList(null)
    load()
    const id = setInterval(load, 20000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div>
      <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">{t('apq_sub')}</p>
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === f ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200' : 'border-ink-200 text-ink-500 dark:border-white/10'
            }`}
          >
            {f === 'pending' ? <Hourglass size={12} /> : f === 'accepted' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {t(`apq_${f}`)}
            {filter === f && list ? <span className="opacity-70">{num(list.length, lang)}</span> : null}
          </button>
        ))}
      </div>

      {failed && <p className="mb-3 rounded-2xl bg-flag-50 p-3 text-sm text-flag-700 dark:bg-flag-500/10 dark:text-flag-300">{t('error_generic')}</p>}

      {!list ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : list.length ? (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {list.map((a, i) => (
              <AppealCard key={a.id} a={a} index={i} onReview={setOpen} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        !failed && <EmptyState icon={Scale} title={t('apq_empty')} sub={t('apq_empty_sub')} />
      )}

      <ReviewAppealSheet
        a={open}
        onClose={() => setOpen(null)}
        onDone={() => {
          setOpen(null)
          load()
          onChange?.()
        }}
      />
    </div>
  )
}
