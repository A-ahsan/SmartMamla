import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, ArrowRight, Ban } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { getPayment } from '../lib/api'
import { money } from '../lib/format'
import Logo from '../components/Logo'

function Burst() {
  const colors = ['#0DAE80', '#F42A41', '#F59E0B', '#2FCB9A', '#006A4E']
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 22 }).map((_, i) => {
        const a = (i / 22) * Math.PI * 2
        const r = 110 + (i % 3) * 30
        return (
          <motion.span
            key={i}
            className="absolute h-2.5 w-2.5 rounded-sm"
            style={{ background: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, rotate: 360, scale: 1 }}
            transition={{ duration: 1.3, delay: 0.35, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

export default function PaymentResult({ kind }) {
  const { t, lang } = useApp()
  const [params] = useSearchParams()
  const tran = params.get('tran_id')
  const [payment, setPayment] = useState(null)

  useEffect(() => {
    if (tran) getPayment(tran).then(setPayment).catch(() => {})
  }, [tran])

  const ok = kind === 'success'
  const cfg = {
    success: { title: t('pay_success_title'), sub: t('pay_success_sub'), Icon: Check, bg: 'bg-brand-600', ring: 'bg-brand-500/30' },
    fail: { title: t('pay_fail_title'), sub: t('pay_fail_sub'), Icon: X, bg: 'bg-flag-500', ring: 'bg-flag-500/30' },
    cancel: { title: t('pay_cancel_title'), sub: t('pay_fail_sub'), Icon: Ban, bg: 'bg-ink-500', ring: 'bg-ink-400/30' },
  }[kind]

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-ink-50 px-4 py-10 dark:bg-ink-950">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(circle,black,transparent_70%)]" />
      <div className="relative mb-8">
        <Logo />
      </div>
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="card relative w-full max-w-md p-8 text-center">
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          {ok && <Burst />}
          <motion.span className={`absolute inset-0 rounded-full ${cfg.ring}`} initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1.2] }} transition={{ duration: 0.8 }} />
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lift ${cfg.bg}`}
          >
            <cfg.Icon size={40} strokeWidth={3} />
          </motion.div>
        </div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-extrabold">
          {cfg.title}
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-2 text-sm text-ink-500">
          {cfg.sub}
        </motion.p>

        {payment && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 rounded-2xl bg-ink-50 p-4 text-left text-sm dark:bg-white/5">
            <div className="flex justify-between">
              <span className="text-ink-500">{t('transaction')}</span>
              <span className="font-mono font-semibold">{payment.tran_id}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-ink-500">{t('amount')}</span>
              <span className="font-bold">{money(payment.amount, lang)}</span>
            </div>
          </motion.div>
        )}

        <Link to={ok ? '/dashboard/payments' : '/dashboard/cases'} className="btn-primary group mt-7 w-full !py-4">
          {t('go_dashboard')} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </div>
  )
}
