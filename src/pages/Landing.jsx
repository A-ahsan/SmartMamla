import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  ScanLine,
  Gavel,
  CreditCard,
  ShieldCheck,
  UserRound,
  CheckCircle2,
  Smartphone,
  Languages,
  Timer,
  MapPinned,
  Radar,
  History,
  IdCard,
  ReceiptText,
} from 'lucide-react'
import PublicNav from '../components/PublicNav'
import Logo from '../components/Logo'
import { CountUp, fadeUp, stagger } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { num, money } from '../lib/format'

/* ───────── Animated road in the background ───────── */
function Road() {
  return (
    <svg className="absolute inset-x-0 bottom-0 h-40 w-full sm:h-56" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden>
      <path d="M-50 170 C 300 90, 700 220, 1250 80" stroke="currentColor" strokeWidth="64" fill="none" className="text-ink-200/70 dark:text-white/[.04]" strokeLinecap="round" />
      <path
        d="M-50 170 C 300 90, 700 220, 1250 80"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeDasharray="28 22"
        className="animate-road-dash text-white dark:text-white/20"
      />
    </svg>
  )
}

/* ───────── Hero phone that loops through scan → filed → paid ───────── */
const STEPS = ['scan', 'filed', 'paid']

function HeroPhone() {
  const { t, lang } = useApp()
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2800)
    return () => clearInterval(id)
  }, [])
  const s = STEPS[step]

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: 4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-[270px] sm:w-[300px]"
    >
      {/* glow */}
      <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-brand-400/40 via-brand-600/20 to-flag-500/30 blur-3xl" />

      <div className="relative animate-float rounded-[44px] border-[10px] border-ink-900 bg-ink-900 shadow-2xl dark:border-ink-800">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-900 dark:bg-ink-800" />
        <div className="relative h-[520px] overflow-hidden rounded-[34px] bg-ink-50 dark:bg-ink-950 sm:h-[560px]">
          {/* status header */}
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-5 pb-6 pt-10 text-white">
            <div className="text-[11px] text-white/70">{t('p_greeting')}</div>
            <div className="text-base font-bold">{lang === 'bn' ? 'এসআই মাহমুদুল' : 'SI Mahmudul'}</div>
            <div className="mt-3 flex gap-1.5">
              {STEPS.map((k, i) => (
                <span key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  {i === step && <motion.span layoutId="phone-prog" className="block h-full bg-white" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2.8, ease: 'linear' }} />}
                  {i < step && <span className="block h-full w-full bg-white" />}
                </span>
              ))}
            </div>
          </div>

          <div className="relative -mt-3 px-4">
            <AnimatePresence mode="wait">
              {s === 'scan' && (
                <motion.div key="scan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="rounded-3xl bg-white p-4 shadow-soft dark:bg-ink-900">
                  <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-2xl bg-ink-950">
                    <div className="absolute inset-6 grid grid-cols-7 grid-rows-7 gap-1 opacity-90">
                      {Array.from({ length: 49 }).map((_, i) => (
                        <span key={i} className={`rounded-[2px] ${[0, 1, 2, 7, 9, 14, 15, 16, 4, 5, 6, 11, 13, 18, 19, 20, 28, 29, 30, 35, 37, 42, 43, 44, 24, 26, 32, 40, 46, 22, 38].includes(i) ? 'bg-white' : 'bg-transparent'}`} />
                      ))}
                    </div>
                    <span className="absolute inset-x-4 h-0.5 animate-scan-line rounded-full bg-brand-400 shadow-[0_0_20px_4px_rgba(47,203,154,.8)]" />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
                    <ScanLine size={16} className="text-brand-600" /> {t('tab_scan')}…
                  </div>
                </motion.div>
              )}
              {s === 'filed' && (
                <motion.div key="filed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3">
                  <div className="rounded-3xl bg-white p-4 shadow-soft dark:bg-ink-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 font-bold text-brand-800">RI</div>
                      <div>
                        <div className="text-sm font-bold">{lang === 'bn' ? 'রফিকুল ইসলাম' : 'Rafiqul Islam'}</div>
                        <div className="font-mono text-[11px] text-ink-500">DK0123456789</div>
                      </div>
                    </div>
                  </div>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} className="rounded-3xl border-2 border-flag-500 bg-white p-4 shadow-soft dark:bg-ink-900">
                    <div className="flex items-center justify-between">
                      <span className="chip bg-flag-50 text-flag-600">
                        <Gavel size={12} /> {t('hero_card_title')}
                      </span>
                      <span className="text-lg font-extrabold">{money(1500, lang)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold">{lang === 'bn' ? 'সিগন্যাল অমান্য' : 'Signal violation'}</div>
                    <div className="text-[11px] text-ink-500">{lang === 'bn' ? 'ফার্মগেট, ঢাকা' : 'Farmgate, Dhaka'}</div>
                  </motion.div>
                </motion.div>
              )}
              {s === 'paid' && (
                <motion.div key="paid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center rounded-3xl bg-white px-4 py-8 text-center shadow-soft dark:bg-ink-900">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }} className="relative">
                    <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/40" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-white">
                      <CheckCircle2 size={34} />
                    </div>
                  </motion.div>
                  <div className="mt-4 text-base font-bold">{t('hero_card_paid')}</div>
                  <div className="mt-1 text-2xl font-extrabold text-brand-700 dark:text-brand-300">{money(1500, lang)}</div>
                  <div className="mt-1 font-mono text-[11px] text-ink-400">SMTX2931{num('04', lang)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9 }}
        className="glass absolute -left-10 top-24 hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold shadow-soft sm:flex"
      >
        <Timer size={15} className="text-brand-600" /> {'<'} {num(60, lang)}s
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1 }}
        className="glass absolute -right-12 bottom-28 hidden items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold shadow-soft sm:flex"
      >
        <CreditCard size={15} className="text-flag-500" /> SSLCommerz
      </motion.div>
    </motion.div>
  )
}

/* ───────── Page ───────── */
export default function Landing() {
  const { t, lang } = useApp()
  const { scrollYProgress } = useScroll()
  const blobY = useTransform(scrollYProgress, [0, 1], [0, -200])

  const titleWords = `${t('hero_title_1')} ${t('hero_title_2')}`.split(' ')
  const firstLen = t('hero_title_1').split(' ').length

  const steps = [
    { icon: ScanLine, title: t('how_1_t'), desc: t('how_1_d') },
    { icon: Gavel, title: t('how_2_t'), desc: t('how_2_d') },
    { icon: CreditCard, title: t('how_3_t'), desc: t('how_3_d') },
  ]

  const stats = [
    { value: 60, fmt: (n) => `< ${num(n, lang)}`, label: t('stat_time'), icon: Timer },
    { value: 24, fmt: (n) => `${num(n, lang)}/${num(7, lang)}`, label: t('stat_paid'), icon: CreditCard },
    { value: 64, fmt: (n) => num(n, lang), label: t('stat_districts'), icon: MapPinned },
    { value: 2, fmt: (n) => num(n, lang), label: t('stat_lang'), icon: Languages },
  ]

  const police = [
    { icon: ScanLine, text: t('fp_1') },
    { icon: History, text: t('fp_2') },
    { icon: Radar, text: t('fp_3') },
    { icon: Smartphone, text: t('fp_4') },
  ]
  const citizen = [
    { icon: IdCard, text: t('fc_1') },
    { icon: Gavel, text: t('fc_2') },
    { icon: ReceiptText, text: t('fc_3') },
    { icon: Languages, text: t('fc_4') },
  ]

  return (
    <div className="relative overflow-x-hidden bg-white dark:bg-ink-950">
      <PublicNav />

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden pb-28 pt-28 sm:pb-40 sm:pt-36">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <motion.div style={{ y: blobY }} className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-brand-400/25 blur-3xl dark:bg-brand-500/15" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-flag-500/15 blur-3xl" />
        </motion.div>
        <Road />

        <div className="container-x relative grid items-center gap-14 lg:grid-cols-[1.1fr_.9fr]">
          <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="text-center lg:text-left">
            <motion.span variants={fadeUp} className="chip mb-5 border border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
              </span>
              {t('hero_badge')}
            </motion.span>

            <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.2rem]">
              {titleWords.map((w, i) => (
                <motion.span
                  key={`${w}-${i}`}
                  variants={{ hidden: { opacity: 0, y: 30, filter: 'blur(8px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
                  className={`mr-[.25em] inline-block ${i >= firstLen ? 'bg-gradient-to-r from-brand-600 via-brand-500 to-brand-700 bg-clip-text text-transparent dark:from-brand-300 dark:via-brand-400 dark:to-brand-200' : ''}`}
                >
                  {w}
                </motion.span>
              ))}
            </h1>

            <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-600 dark:text-ink-300 sm:text-lg lg:mx-0">
              {t('hero_sub')}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link to="/login" className="btn-primary group !px-6 !py-4 text-base">
                <UserRound size={19} /> {t('hero_cta_citizen')}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/police/login" className="btn-ghost !px-6 !py-4 text-base">
                <ShieldCheck size={19} /> {t('hero_cta_police')}
              </Link>
            </motion.div>
          </motion.div>

          <HeroPhone />
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="relative -mt-16 sm:-mt-20">
        <div className="container-x">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-ink-100 bg-ink-100 shadow-lift dark:border-white/5 dark:bg-white/5 lg:grid-cols-4"
          >
            {stats.map((s) => (
              <div key={s.label} className="bg-white p-5 dark:bg-ink-900 sm:p-7">
                <s.icon size={20} className="text-brand-600 dark:text-brand-400" />
                <div className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
                  <CountUp to={s.value} format={s.fmt} />
                </div>
                <div className="mt-1 text-xs font-medium text-ink-500 sm:text-sm">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── HOW ───────── */}
      <section id="how" className="scroll-mt-24 py-24 sm:py-32">
        <div className="container-x">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={stagger()} className="mx-auto max-w-2xl text-center">
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              {t('how_title')}
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-ink-500 dark:text-ink-400">
              {t('how_sub')}
            </motion.p>
          </motion.div>

          <div className="relative mt-14 grid gap-6 md:grid-cols-3">
            {/* connecting line */}
            <svg className="absolute left-0 right-0 top-12 hidden h-2 w-full md:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
              <motion.line
                x1="16"
                y1="1"
                x2="84"
                y2="1"
                stroke="currentColor"
                strokeWidth="0.4"
                strokeDasharray="1.5 1.5"
                className="text-brand-400"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
            </svg>
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ y: -6 }}
                className="card relative p-6 text-center sm:p-8"
              >
                <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 rotate-6 rounded-3xl bg-brand-100 dark:bg-brand-500/15" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-glow">
                    <s.icon size={28} />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-flag-500 text-xs font-bold text-white ring-4 ring-white dark:ring-ink-900">
                    {num(i + 1, lang)}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="scroll-mt-24 bg-ink-50 py-24 dark:bg-ink-900/40 sm:py-32">
        <div className="container-x">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center text-3xl font-extrabold tracking-tight sm:text-5xl"
          >
            {t('feat_title')}
          </motion.h2>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {[
              { title: t('feat_police'), items: police, icon: ShieldCheck, dark: true, to: '/police/login' },
              { title: t('feat_citizen'), items: citizen, icon: UserRound, dark: false, to: '/login' },
            ].map((col, ci) => (
              <motion.div
                key={col.title}
                initial={{ opacity: 0, x: ci ? 40 : -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className={`relative overflow-hidden rounded-[32px] p-6 sm:p-10 ${
                  col.dark ? 'bg-ink-900 text-white dark:bg-black/40' : 'card'
                }`}
              >
                <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl ${col.dark ? 'bg-brand-500/30' : 'bg-flag-500/10'}`} />
                <div className="relative">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${col.dark ? 'bg-white/10' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'}`}>
                    <col.icon size={24} />
                  </div>
                  <h3 className="mt-5 text-2xl font-extrabold">{col.title}</h3>
                  <ul className="mt-6 space-y-3">
                    {col.items.map((it, i) => (
                      <motion.li
                        key={it.text}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className={`flex items-center gap-3 rounded-2xl p-3 ${col.dark ? 'bg-white/5' : 'bg-ink-50 dark:bg-white/5'}`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${col.dark ? 'bg-brand-500/20 text-brand-300' : 'bg-white text-brand-700 shadow-sm dark:bg-white/10 dark:text-brand-300'}`}>
                          <it.icon size={18} />
                        </span>
                        <span className="text-sm font-medium sm:text-[15px]">{it.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <Link to={col.to} className={`group mt-7 inline-flex items-center gap-2 text-sm font-bold ${col.dark ? 'text-brand-300' : 'text-brand-700 dark:text-brand-300'}`}>
                    {col.dark ? t('nav_police') : t('nav_citizen')}
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="py-20 sm:py-28">
        <div className="container-x">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-center text-white sm:px-12 sm:py-20"
          >
            <div className="bg-grid absolute inset-0 opacity-30" />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 0.9, 0.7] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-flag-500/80 blur-2xl"
            />
            <div className="relative">
              <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">{t('cta_title')}</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">{t('cta_sub')}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/login" className="btn bg-white !px-6 !py-4 text-base text-brand-800 hover:bg-brand-50">
                  <UserRound size={19} /> {t('nav_citizen')}
                </Link>
                <Link to="/police/login" className="btn border border-white/30 bg-white/10 !px-6 !py-4 text-base text-white backdrop-blur hover:bg-white/20">
                  <ShieldCheck size={19} /> {t('nav_police')}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-10 dark:border-white/5">
        <div className="container-x flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Logo size={32} />
          <p className="text-sm text-ink-500">
            © {num(new Date().getFullYear(), lang)} {t('appName')}. {t('footer_rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}
