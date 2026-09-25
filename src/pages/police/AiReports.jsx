import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Cctv, RefreshCw, MapPin, Clock, Gavel, XCircle, RotateCcw, Search, Car, IdCard, Maximize2,
  CheckCircle2, Inbox, WifiOff, ScanEye, CalendarClock, User,
} from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { Page, PageHeader, Skeleton, EmptyState, Spinner, StatTile } from '../../components/ui'
import Sheet from '../../components/Sheet'
import FileCaseSheet from '../../components/FileCaseSheet'
import {
  getAiReports, getAiSummary, reviewAiReport, aiImage, matchViolationType, lookup, DEMO_MODE,
} from '../../lib/api'
import { num, dateTime, money } from '../../lib/format'

const TABS = ['pending', 'filed', 'dismissed']
const SEV_BG = { minor: 'bg-sky-500', moderate: 'bg-amber-500', severe: 'bg-orange-600', critical: 'bg-flag-600' }
const DEMO_PLATE = 'DHAKA METRO-GA-12-3456'

const pct = (x, lang) => (x == null ? '—' : `${num(Math.round(x * 100), lang)}%`)
const clock = (s, lang) => {
  const m = Math.floor((s || 0) / 60)
  const r = Math.floor((s || 0) % 60)
  return num(`${m}:${String(r).padStart(2, '0')}`, lang)
}

function ReportCard({ r, index, onReview, onDismiss, onRestore }) {
  const { t, lang } = useApp()
  const name = lang === 'bn' ? r.violation_bn : r.violation_en
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      className="card group flex flex-col overflow-hidden"
    >
      <button onClick={() => onReview(r)} className="relative block aspect-[4/3] w-full overflow-hidden bg-ink-900">
        {r.images?.crop || r.images?.frame ? (
          <img
            src={aiImage(r.images.crop || r.images.frame)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40">
            <Cctv size={32} />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${SEV_BG[r.severity] || SEV_BG.moderate}`} />
          {name}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink-900" title={t('ai_score')}>
          {pct(r.confidence, lang)}
        </span>
        {r.images?.plate && (
          <span className="absolute bottom-3 right-3 overflow-hidden rounded-md border-2 border-white/90 bg-black shadow-lg">
            <img src={aiImage(r.images.plate)} alt={t('ai_plate')} className="h-8 w-auto max-w-[120px] object-contain" />
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <MapPin size={14} className="shrink-0 text-brand-600" />
          <span className="truncate">{lang === 'bn' ? r.location_bn || r.location : r.location}</span>
        </div>
        <div className="mt-1.5 grid gap-1 text-xs text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> {dateTime(r.detected_at, lang)}
          </span>
          <span className="flex items-center gap-1.5">
            <Cctv size={12} /> {r.camera} · {t('ai_video_time')} {clock(r.video_time_s, lang)}
          </span>
        </div>

        <div className="mt-auto pt-4">
          {r.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={() => onReview(r)} className="btn-primary flex-1 !py-2.5 text-sm">
                <ScanEye size={16} /> {t('ai_review')}
              </button>
              <button onClick={() => onDismiss(r)} className="btn-ghost !px-3 !py-2.5 text-sm" title={t('ai_dismiss')}>
                <XCircle size={16} />
              </button>
            </div>
          )}
          {r.status === 'filed' && (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-xs dark:bg-brand-500/10">
              <span className="flex items-center gap-1.5 font-semibold text-brand-800 dark:text-brand-200">
                <CheckCircle2 size={14} /> {t('ai_case')} <span className="font-mono">{num(r.case_number || '—', lang)}</span>
              </span>
              <span className="truncate text-brand-800/70 dark:text-brand-200/70">{r.reviewed_by?.name}</span>
            </div>
          )}
          {r.status === 'dismissed' && (
            <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
              <span className="truncate">
                {t('ai_dismissed')} · {r.reviewed_by?.name}
              </span>
              <button onClick={() => onRestore(r)} className="flex shrink-0 items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-300">
                <RotateCcw size={13} /> {t('ai_restore')}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ReviewSheet({ report, onClose, onDone }) {
  const { t, lang } = useApp()
  const [mode, setMode] = useState('vehicle')
  const [value, setValue] = useState('')
  const [state, setState] = useState('idle') // idle | loading | found | none
  const [record, setRecord] = useState(null)
  const [fileOpen, setFileOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMode('vehicle')
    setValue('')
    setState('idle')
    setRecord(null)
  }, [report?.id])

  const search = async (e) => {
    e?.preventDefault()
    if (!value.trim()) return
    setState('loading')
    try {
      const r = await lookup(mode, value)
      setRecord(r)
      setState(r ? 'found' : 'none')
    } catch {
      setState('none')
    }
  }

  const preset = useMemo(
    () =>
      report && {
        pick: (types) => matchViolationType(types, report),
        // helmet / 3-person violations are motorbike offences
        pickVehicle: (vs = []) =>
          /helmet|3_person/.test(report.violation_class || '') ? vs.find((v) => v.vehicle_type === 'motorcycle')?.id : null,
        location: report.location,
        locationBn: report.location_bn,
        notes: `${t('ai_note')} ${report.id} · ${report.camera} · ${t('ai_score')} ${Math.round((report.confidence || 0) * 100)}%`,
      },
    [report, t]
  )

  const dismiss = async () => {
    setBusy(true)
    try {
      await reviewAiReport(report.id, { action: 'dismissed' })
      toast.success(t('ai_dismissed_toast'))
      onDone()
    } catch (e) {
      toast.error(e.message || t('error_generic'))
    } finally {
      setBusy(false)
    }
  }

  const onFiled = async (row) => {
    try {
      // FileCaseSheet already shows the "filed" toast; just mark the report as handled
      await reviewAiReport(report.id, { action: 'filed', case_number: row?.case_number, plate: mode === 'vehicle' ? value : null })
    } catch (e) {
      toast.error(e.message || t('error_generic'))
    }
    onDone()
  }

  if (!report) return null
  const r = report
  const unpaid = record?.cases?.filter((c) => c.status === 'unpaid') || []
  const vehicle = record?.vehicles?.find((v) => v.id === record.matchedVehicleId) || record?.vehicles?.[0]
  const ownerName = lang === 'bn' ? record?.profile?.full_name_bn || record?.profile?.full_name : record?.profile?.full_name

  return (
    <>
      <Sheet
        open={!!report && !fileOpen}
        onClose={onClose}
        title={lang === 'bn' ? r.violation_bn : r.violation_en}
        wide
        footer={
          r.status === 'pending' && (
            <div className="flex items-center gap-3">
              <button onClick={dismiss} disabled={busy} className="btn-ghost">
                {busy ? <Spinner /> : <XCircle size={17} />} {t('ai_dismiss')}
              </button>
              <div className="flex-1" />
              <button onClick={() => setFileOpen(true)} disabled={state !== 'found'} className="btn-danger min-w-[150px]">
                <Gavel size={18} /> {t('file_mamla')}
              </button>
            </div>
          )
        }
      >
        {/* Evidence */}
        <span className="label">{t('ai_evidence')}</span>
        <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr]">
          <a
            href={aiImage(r.images?.frame || r.images?.crop)}
            target="_blank"
            rel="noreferrer"
            className="group relative block overflow-hidden rounded-2xl bg-ink-900"
            title={t('ai_open_full')}
          >
            <img src={aiImage(r.images?.frame || r.images?.crop)} alt="" className="max-h-[42dvh] w-full object-contain" />
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
              <Maximize2 size={14} />
            </span>
          </a>
          <div className="flex flex-col gap-3">
            {r.images?.crop && <img src={aiImage(r.images.crop)} alt="" className="max-h-44 w-full rounded-2xl bg-ink-900 object-contain" />}
            <div className="rounded-2xl bg-ink-50 p-3 dark:bg-white/5">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{t('ai_plate')}</div>
              {r.images?.plate ? (
                <img src={aiImage(r.images.plate)} alt={t('ai_plate')} className="h-14 w-auto max-w-full rounded-md bg-black object-contain" />
              ) : (
                <span className="text-xs text-ink-500">{t('ai_no_plate')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Facts */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-ink-100 p-3 text-xs dark:border-white/10 sm:grid-cols-4">
          {[
            [t('ai_detected'), dateTime(r.detected_at, lang)],
            [t('location'), lang === 'bn' ? r.location_bn || r.location : r.location],
            [t('ai_score'), `${pct(r.confidence, lang)}`],
            [t('ai_seen'), `${num((r.duration_s || 0).toFixed(1), lang)} s · ${num(r.frames || 0, lang)} ${t('ai_frames')}`],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-ink-400">{k}</dt>
              <dd className="truncate font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Find the owner */}
        {r.status === 'pending' && (
          <div className="mt-5">
            <span className="label">{t('ai_find_owner')}</span>
            <p className="-mt-1 mb-3 text-xs text-ink-500">{t('ai_enter_plate')}</p>
            <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
              <div className="grid shrink-0 grid-cols-2 gap-1 rounded-2xl bg-ink-100 p-1 dark:bg-white/5">
                {[
                  ['vehicle', Car, 'tab_vehicle'],
                  ['license', IdCard, 'tab_license'],
                ].map(([m, I, k]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                      mode === m ? 'bg-white shadow-sm dark:bg-ink-800' : 'text-ink-500'
                    }`}
                  >
                    <I size={15} /> {t(k)}
                  </button>
                ))}
              </div>
              <input
                className="input flex-1 font-mono uppercase tracking-wide"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  if (state !== 'idle') setState('idle')
                }}
                placeholder={t(mode === 'vehicle' ? 'ph_vehicle' : 'ph_license')}
                autoCapitalize="characters"
                spellCheck={false}
              />
              <button disabled={!value.trim() || state === 'loading'} className="btn-primary !py-3">
                {state === 'loading' ? <Spinner /> : <Search size={17} />} {t('search')}
              </button>
            </form>
            {DEMO_MODE && mode === 'vehicle' && (
              <button type="button" onClick={() => setValue(DEMO_PLATE)} className="mt-2 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300">
                {t('try_demo')}: <span className="font-mono">{DEMO_PLATE}</span>
              </button>
            )}

            <AnimatePresence mode="wait">
              {state === 'found' && (
                <motion.div
                  key="found"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-500/30 dark:bg-brand-500/10"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                    <User size={20} />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{t('ai_owner')}</div>
                    <div className="truncate font-bold">{ownerName}</div>
                    <div className="truncate text-xs text-ink-500">
                      {vehicle && (
                        <>
                          <span className="font-mono">{vehicle.registration_number}</span> · {vehicle.make} {vehicle.model} ·{' '}
                        </>
                      )}
                      {num(unpaid.length, lang)} {t('ai_unpaid')}
                      {unpaid.length > 0 && ` (${money(unpaid.reduce((s, c) => s + Number(c.fine_amount), 0), lang)})`}
                    </div>
                  </div>
                </motion.div>
              )}
              {state === 'none' && (
                <motion.div key="none" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-2xl bg-flag-50 p-3 text-sm dark:bg-flag-500/10">
                  <div className="font-bold text-flag-700 dark:text-flag-300">{t('ai_owner_none')}</div>
                  <div className="text-xs text-flag-700/70 dark:text-flag-300/70">{t('ai_owner_none_sub')}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {r.status !== 'pending' && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-ink-50 p-3 text-sm dark:bg-white/5">
            {r.status === 'filed' ? <CheckCircle2 size={17} className="text-brand-600" /> : <XCircle size={17} className="text-ink-400" />}
            <span>
              {r.status === 'filed' ? `${t('ai_case')} ${r.case_number || ''}` : t('ai_dismissed')} · {t('ai_by')} {r.reviewed_by?.name} ·{' '}
              {dateTime(r.reviewed_at, lang)}
            </span>
          </div>
        )}
      </Sheet>

      <FileCaseSheet open={fileOpen} onClose={() => setFileOpen(false)} record={record} preset={preset} onFiled={onFiled} />
    </>
  )
}

export default function AiReports() {
  const { t, lang } = useApp()
  const [tab, setTab] = useState('pending')
  const [reports, setReports] = useState(null)
  const [summary, setSummary] = useState(null)
  const [offline, setOffline] = useState(false)
  const [open, setOpen] = useState(null)
  const [updated, setUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setRefreshing(true)
      try {
        const [list, sum] = await Promise.all([getAiReports(tab), getAiSummary()])
        setReports(list)
        setSummary(sum)
        setOffline(false)
        setUpdated(new Date())
      } catch (e) {
        console.error(e)
        setOffline(true)
        setReports((r) => r || [])
      } finally {
        setTimeout(() => setRefreshing(false), 400)
      }
    },
    [tab]
  )

  useEffect(() => {
    setReports(null)
    load()
    const id = setInterval(() => load(true), 15000)
    return () => clearInterval(id)
  }, [load])

  const act = async (r, action) => {
    try {
      await reviewAiReport(r.id, { action })
      toast.success(t(action === 'dismissed' ? 'ai_dismissed_toast' : 'ai_restored_toast'))
      load(true)
    } catch (e) {
      toast.error(e.message || t('error_generic'))
    }
  }

  const counts = { pending: summary?.pending, filed: summary?.filed, dismissed: summary?.dismissed }

  return (
    <Page>
      <PageHeader
        title={t('ai_title')}
        sub={t('ai_sub')}
        action={
          <button onClick={() => load()} className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-[11px] font-semibold text-ink-600 dark:bg-white/5 dark:text-ink-300">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {t('traffic_updated')}{' '}
            {updated ? updated.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile icon={Inbox} label={t('ai_pending')} value={num(summary?.pending ?? '—', lang)} tone="flag" />
        <StatTile icon={CalendarClock} label={t('ai_today')} value={num(summary?.today ?? '—', lang)} tone="sky" delay={0.05} />
        <StatTile icon={Gavel} label={t('ai_filed')} value={num(summary?.filed ?? '—', lang)} tone="brand" delay={0.1} />
      </div>

      <div className="no-scrollbar mb-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 dark:bg-white/5">
        {TABS.map((f) => (
          <button key={f} onClick={() => setTab(f)} className="relative shrink-0 rounded-full px-4 py-2 text-xs font-semibold sm:text-sm">
            {tab === f && <motion.span layoutId="ai-tab" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-ink-700" />}
            <span className="relative">
              {t(`ai_${f}`)}{' '}
              <span className={f === 'pending' && counts[f] ? 'text-flag-600' : 'text-ink-400'}>{counts[f] != null ? num(counts[f], lang) : ''}</span>
            </span>
          </button>
        ))}
      </div>

      {offline && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/30 dark:bg-amber-500/5">
          <WifiOff size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <div className="font-bold text-amber-800 dark:text-amber-200">{t('ai_offline')}</div>
            <div className="text-xs text-amber-800/70 dark:text-amber-200/70">{t('ai_offline_sub')}</div>
          </div>
        </div>
      )}

      {!reports ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : reports.length ? (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {reports.map((r, i) => (
              <ReportCard
                key={r.id}
                r={r}
                index={i}
                onReview={setOpen}
                onDismiss={(x) => act(x, 'dismissed')}
                onRestore={(x) => act(x, 'pending')}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        !offline && <EmptyState icon={Cctv} title={tab === 'pending' ? t('ai_empty') : t('no_cases')} sub={tab === 'pending' ? t('ai_empty_sub') : ''} />
      )}

      <ReviewSheet
        report={open}
        onClose={() => setOpen(null)}
        onDone={() => {
          setOpen(null)
          load(true)
        }}
      />
    </Page>
  )
}
