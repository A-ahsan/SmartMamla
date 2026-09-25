import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound, Phone, BadgeCheck, Sparkles, ScanLine, Gavel, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '../components/Logo'
import { LangToggle, ThemeToggle } from '../components/Toggles'
import { Spinner, DemoBadge } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { signUp, DEMO_MODE } from '../lib/api'

function Field({ icon: Icon, label, type = 'text', value, onChange, autoComplete, placeholder, required = true }) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-11 pr-11"
          type={isPw && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
        />
        {isPw && (
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-700" aria-label="Show password">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  )
}

/** Decorative side panel shown on desktop */
function SidePanel({ police }) {
  const { t } = useApp()
  const items = police
    ? [
        { icon: ScanLine, text: t('fp_1') },
        { icon: Gavel, text: t('fp_2') },
        { icon: ShieldCheck, text: t('fp_4') },
      ]
    : [
        { icon: BadgeCheck, text: t('fc_1') },
        { icon: Gavel, text: t('fc_2') },
        { icon: CreditCard, text: t('fc_3') },
      ]
  return (
    <div className={`relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 ${police ? 'bg-ink-950' : 'bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900'}`}>
      <div className="bg-grid absolute inset-0 opacity-40" />
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute -right-20 top-20 h-80 w-80 rounded-full blur-3xl ${police ? 'bg-brand-600/40' : 'bg-flag-500/50'}`}
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl"
      />
      <Link to="/" className="relative">
        <Logo light subtitle />
      </Link>
      <div className="relative text-white">
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-4xl font-extrabold leading-tight tracking-tight">
          {police ? t('login_police_title') : t('login_citizen_title')}
        </motion.h2>
        <p className="mt-3 max-w-sm text-white/70">{police ? t('login_police_sub') : t('login_citizen_sub')}</p>
        <ul className="mt-8 space-y-3">
          {items.map((it, i) => (
            <motion.li
              key={it.text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.1 }}
              className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <it.icon size={18} />
              </span>
              <span className="text-sm font-medium">{it.text}</span>
            </motion.li>
          ))}
        </ul>
      </div>
      <div className="relative flex items-center gap-2 text-xs text-white/60">
        <Lock size={13} /> {t('secure_note')}
      </div>
    </div>
  )
}

export default function AuthPage({ portal = 'citizen' }) {
  const police = portal === 'police'
  const { t } = useApp()
  const { signIn, signOut } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState('signin')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ id: '', password: '', full_name: '', phone: '' })
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const demo = police
    ? [{ label: 'SI Mahmudul · DMP-TR-4521', id: 'police@demo.bd' }]
    : [
        { label: 'Rafiqul Islam', id: 'citizen@demo.bd' },
        { label: 'Nusrat Jahan', id: 'nusrat@demo.bd' },
      ]

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp({ email: form.id, password: form.password, full_name: form.full_name, phone: form.phone })
        toast.success(t('signup_done'))
        setMode('signin')
        return
      }
      const p = await signIn(form.id, form.password)
      if (police && p.role !== 'police') {
        await signOut()
        toast.error(t('wrong_portal_police'))
        return
      }
      if (!police && p.role === 'police') {
        await signOut()
        toast.error(t('wrong_portal_citizen'))
        return
      }
      toast.success(`${t('welcome_back')}, ${p.full_name?.split(' ')[0] || ''}`)
      nav(loc.state?.from || (police ? '/police' : '/dashboard'), { replace: true })
    } catch (err) {
      console.warn(err)
      toast.error(t('login_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <SidePanel police={police} />

      <div className="relative flex flex-col bg-white dark:bg-ink-950">
        {/* mobile hero strip */}
        <div className={`relative overflow-hidden px-5 pb-16 pt-5 lg:hidden ${police ? 'bg-ink-950' : 'bg-gradient-to-br from-brand-600 to-brand-900'}`}>
          <div className="bg-grid absolute inset-0 opacity-30" />
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} className={`absolute -right-10 -top-10 h-48 w-48 rounded-full blur-2xl ${police ? 'bg-brand-600/50' : 'bg-flag-500/60'}`} />
          <div className="relative flex items-center justify-between">
            <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur" aria-label={t('back_home')}>
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <LangToggle className="!border-white/20 !bg-white/10" />
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative mt-8 text-white">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              {police ? <ShieldCheck size={24} /> : <UserRound size={24} />}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{police ? t('login_police_title') : t('login_citizen_title')}</h1>
            <p className="mt-1 text-sm text-white/75">{police ? t('login_police_sub') : t('login_citizen_sub')}</p>
          </motion.div>
        </div>

        {/* desktop top bar */}
        <div className="hidden items-center justify-between p-6 lg:flex">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900 dark:hover:text-white">
            <ArrowLeft size={16} /> {t('back_home')}
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="relative -mt-8 flex flex-1 items-start justify-center px-4 pb-10 lg:mt-0 lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-lift dark:bg-ink-900 sm:p-8 lg:shadow-none lg:dark:bg-transparent"
          >
            <div className="mb-6 hidden lg:block">
              <h1 className="text-3xl font-extrabold tracking-tight">{mode === 'signup' ? t('sign_up') : t('sign_in')}</h1>
              <p className="mt-1 text-sm text-ink-500">{police ? t('login_police_sub') : t('login_citizen_sub')}</p>
            </div>

            {!police && (
              <div className="relative mb-6 grid grid-cols-2 rounded-2xl bg-ink-100 p-1 dark:bg-white/5">
                {['signin', 'signup'].map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className="relative rounded-xl py-2.5 text-sm font-semibold">
                    {mode === m && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-ink-800" transition={{ type: 'spring', stiffness: 450, damping: 34 }} />}
                    <span className={`relative ${mode === m ? 'text-ink-900 dark:text-white' : 'text-ink-500'}`}>{m === 'signin' ? t('sign_in') : t('sign_up')}</span>
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <AnimatePresence initial={false}>
                {mode === 'signup' && (
                  <motion.div key="extra" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
                    <Field icon={UserRound} label={t('full_name')} value={form.full_name} onChange={set('full_name')} autoComplete="name" />
                    <Field icon={Phone} label={t('phone')} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="01XXXXXXXXX" />
                  </motion.div>
                )}
              </AnimatePresence>
              <Field
                icon={police ? BadgeCheck : Mail}
                label={police ? t('badge_or_email') : t('email')}
                type={police ? 'text' : 'email'}
                value={form.id}
                onChange={set('id')}
                autoComplete="username"
              />
              <Field icon={Lock} label={t('password')} type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />

              <motion.button whileTap={{ scale: 0.98 }} disabled={busy} className={`${police ? 'btn bg-ink-900 text-white hover:bg-ink-800 dark:bg-brand-600 dark:hover:bg-brand-500' : 'btn-primary'} w-full !py-4 text-base`}>
                {busy ? <Spinner /> : police ? <ShieldCheck size={19} /> : null}
                {mode === 'signup' ? t('sign_up') : t('sign_in')}
              </motion.button>
            </form>

            {DEMO_MODE && mode === 'signin' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles size={14} /> {t('demo_accounts')}
                  </span>
                  <DemoBadge />
                </div>
                <div className="space-y-2">
                  {demo.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, id: d.id, password: 'demo1234' }))}
                      className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-left text-xs shadow-sm transition hover:shadow-soft dark:bg-ink-800"
                    >
                      <span>
                        <span className="block font-semibold">{d.label}</span>
                        <span className="font-mono text-ink-500">{d.id} · demo1234</span>
                      </span>
                      <span className="font-bold text-brand-700 dark:text-brand-300">{t('use_this')} →</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <p className="mt-6 text-center text-sm text-ink-500">
              {police ? (
                <Link to="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  {t('nav_citizen')} →
                </Link>
              ) : (
                <Link to="/police/login" className="font-semibold text-ink-700 hover:underline dark:text-ink-300">
                  <ShieldCheck size={14} className="mr-1 inline" />
                  {t('nav_police')} →
                </Link>
              )}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
