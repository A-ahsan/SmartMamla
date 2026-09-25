import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Radar, ScanLine, Gavel, Wallet, Clock, ArrowRight, MapPin, RefreshCw, Cctv, WifiOff } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Page, StatTile, Skeleton } from '../../components/ui'
import { getOfficerStats, getAiSummary, aiImage } from '../../lib/api'
import { money, num, date, dateTime } from '../../lib/format'

// Placeholder hotspots. Replace with the AI traffic model's output later
// (see `loadTrafficFeed` below — it is the single integration point).
const HOTSPOTS = [
  { id: 1, en: 'Farmgate Intersection', bn: 'ফার্মগেট মোড়', level: 0.92, speed: 6 },
  { id: 2, en: 'Mohakhali Flyover', bn: 'মহাখালী ফ্লাইওভার', level: 0.78, speed: 11 },
  { id: 3, en: 'Shahbag', bn: 'শাহবাগ', level: 0.64, speed: 15 },
  { id: 4, en: 'Bijoy Sarani', bn: 'বিজয় সরণি', level: 0.45, speed: 22 },
  { id: 5, en: 'Hatirjheel Link Road', bn: 'হাতিরঝিল সংযোগ সড়ক', level: 0.2, speed: 38 },
]

/** Integration point for the future AI model. Return the same shape as HOTSPOTS. */
async function loadTrafficFeed() {
  // e.g. const res = await fetch(`${import.meta.env.VITE_TRAFFIC_API}/hotspots`); return res.json()
  return HOTSPOTS.map((h) => ({ ...h, level: Math.min(1, Math.max(0.05, h.level + (Math.random() - 0.5) * 0.12)) }))
}

const levelInfo = (l, t) =>
  l > 0.7
    ? { label: t('traffic_heavy'), bar: 'bg-flag-500', text: 'text-flag-600 dark:text-flag-400', stroke: '#F42A41' }
    : l > 0.4
      ? { label: t('traffic_moderate'), bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-300', stroke: '#F59E0B' }
      : { label: t('traffic_clear'), bar: 'bg-brand-500', text: 'text-brand-700 dark:text-brand-300', stroke: '#0DAE80' }

/** Stylised animated city map (placeholder visual). */
function CityMap({ spots }) {
  const { t } = useApp()
  const roads = [
    { d: 'M20 60 C 120 40, 220 90, 380 50', spot: 0 },
    { d: 'M40 180 C 140 140, 240 170, 380 120', spot: 1 },
    { d: 'M200 10 C 180 80, 230 150, 190 230', spot: 2 },
    { d: 'M90 10 C 110 90, 70 160, 110 230', spot: 3 },
    { d: 'M300 20 C 280 100, 330 170, 300 230', spot: 4 },
  ]
  return (
    <div className="relative h-56 overflow-hidden rounded-3xl bg-ink-900 sm:h-72">
      <div className="bg-grid absolute inset-0 opacity-40" />
      <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        {roads.map((r, i) => {
          const info = levelInfo(spots[r.spot]?.level ?? 0.3, t)
          return (
            <g key={i}>
              <path d={r.d} stroke="#ffffff" strokeOpacity=".07" strokeWidth="14" fill="none" strokeLinecap="round" />
              <motion.path
                d={r.d}
                stroke={info.stroke}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="10 8"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1, strokeDashoffset: [0, -36] }}
                transition={{
                  pathLength: { duration: 1.2, delay: i * 0.15 },
                  opacity: { duration: 0.3, delay: i * 0.15 },
                  strokeDashoffset: { duration: 2.5 - (spots[r.spot]?.level ?? 0.3) * 1.8, repeat: Infinity, ease: 'linear' },
                }}
              />
            </g>
          )
        })}
      </svg>
      {/* radar sweep */}
      <motion.div
        className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,rgba(47,203,154,.25),transparent_25%)]"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute bottom-3 left-3 flex gap-2 text-[10px] font-semibold text-white/80">
        {['traffic_heavy', 'traffic_moderate', 'traffic_clear'].map((k, i) => (
          <span key={k} className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${['bg-flag-500', 'bg-amber-500', 'bg-brand-500'][i]}`} /> {t(k)}
          </span>
        ))}
      </div>
    </div>
  )
}


/** Live feed of Omni-Eye camera detections waiting for review. */
function AiPanel() {
  const { t, lang } = useApp()
  const [sum, setSum] = useState(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let alive = true
    const tick = () =>
      getAiSummary()
        .then((s) => alive && (setSum(s), setOffline(false)))
        .catch(() => alive && setOffline(true))
    tick()
    const id = setInterval(tick, 15000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (offline)
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
        <WifiOff size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <div className="text-sm font-bold text-amber-800 dark:text-amber-200">{t('ai_offline')}</div>
          <p className="mt-0.5 text-xs text-amber-800/70 dark:text-amber-200/70">{t('ai_offline_sub')}</p>
        </div>
      </div>
    )

  return (
    <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-800 dark:text-brand-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flag-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-flag-500" />
          </span>
          <Cctv size={16} /> {t('ai_live')}
        </div>
        <span className="text-xs font-semibold text-brand-800/70 dark:text-brand-200/70">
          {num(sum?.pending ?? 0, lang)} {t('ai_waiting')} · {num(sum?.today ?? 0, lang)} {t('ai_today').toLowerCase()}
        </span>
      </div>
      {sum?.latest?.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {sum.latest.map((r) => (
            <li key={r.id}>
              <Link to="/police/ai" className="flex items-center gap-3 rounded-xl bg-white/80 p-2 transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10">
                <img src={aiImage(r.images?.crop || r.images?.frame)} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-ink-900 object-cover" />
                <span className="min-w-0 text-xs">
                  <span className="block truncate font-bold text-ink-900 dark:text-white">{lang === 'bn' ? r.violation_bn : r.violation_en}</span>
                  <span className="block truncate text-ink-500">{lang === 'bn' ? r.location_bn || r.location : r.location}</span>
                  <span className="block truncate text-ink-400">{dateTime(r.detected_at, lang)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/police/ai" className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
        {t('ai_open_all')} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  )
}

export default function TrafficUpdates() {
  const { t, lang } = useApp()
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [spots, setSpots] = useState(HOTSPOTS)
  const [updated, setUpdated] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    setSpots(await loadTrafficFeed())
    setUpdated(new Date())
    setTimeout(() => setRefreshing(false), 500)
  }

  useEffect(() => {
    getOfficerStats(profile.id).then(setStats).catch(() => setStats({ today: 0, collected: 0, pending: 0 }))
    const id = setInterval(refresh, 15000)
    return () => clearInterval(id)
  }, [profile.id])

  const sorted = useMemo(() => [...spots].sort((a, b) => b.level - a.level), [spots])
  const name = lang === 'bn' ? profile.full_name_bn || profile.full_name : profile.full_name
  const station = lang === 'bn' ? profile.station_bn || profile.station : profile.station

  return (
    <Page>
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-5 overflow-hidden rounded-[28px] bg-ink-900 p-5 text-white sm:p-7"
      >
        <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
              </span>
              {t('p_greeting')} · {date(new Date(), lang, { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
            <div className="mt-0.5 text-sm text-white/60">
              {station} · {profile.badge_number}
            </div>
          </div>
          <Link to="/police/lookup" className="btn bg-white text-ink-900 hover:bg-brand-50">
            <ScanLine size={18} /> {t('p_lookup')}
          </Link>
        </div>
      </motion.div>

      {/* Today stats */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:gap-4">
        {stats ? (
          <>
            <StatTile icon={Gavel} label={t('traffic_cases_today')} value={num(stats.today, lang)} tone="sky" />
            <StatTile icon={Wallet} label={t('traffic_collected')} value={money(stats.collected, lang)} tone="brand" delay={0.05} />
            <StatTile icon={Clock} label={t('traffic_pending')} value={money(stats.pending, lang)} tone="flag" delay={0.1} />
          </>
        ) : (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* Map + AI banner */}
        <div className="card overflow-hidden p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                <Radar size={20} className="text-brand-600" /> {t('traffic_title')}
              </h2>
              <p className="text-xs text-ink-500">{t('traffic_sub')}</p>
            </div>
            <button onClick={refresh} className="flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-[11px] font-semibold text-ink-600 dark:bg-white/5 dark:text-ink-300">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              {t('traffic_updated')} {updated.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
            </button>
          </div>
          <CityMap spots={spots} />
          <AiPanel />
        </div>

        {/* Hotspots list */}
        <div className="card p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-extrabold">{lang === 'bn' ? 'যানজটপ্রবণ এলাকা' : 'Congestion hotspots'}</h2>
          <ul className="space-y-2">
            {sorted.map((s, i) => {
              const info = levelInfo(s.level, t)
              return (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, layout: { type: 'spring', stiffness: 300, damping: 30 } }}
                  className="rounded-2xl bg-ink-50 p-3 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <MapPin size={14} className={info.text} />
                      <span className="truncate">{lang === 'bn' ? s.bn : s.en}</span>
                    </span>
                    <span className={`shrink-0 text-xs font-bold ${info.text}`}>{info.label}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-white/10">
                      <motion.div className={`h-full rounded-full ${info.bar}`} animate={{ width: `${Math.round(s.level * 100)}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <span className="w-16 text-right text-[11px] text-ink-500">
                      {num(Math.round(s.speed), lang)} km/h
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </ul>
          <Link to="/police/cases" className="group mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
            {t('filed_by_me')} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </Page>
  )
}
