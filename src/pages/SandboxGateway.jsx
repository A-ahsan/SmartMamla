import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FlaskConical, CreditCard, Smartphone, Landmark, Check, X } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import { getPayment, completeDemoPayment } from '../lib/api'
import { money, num } from '../lib/format'
import { Spinner } from '../components/ui'

/** DEMO MODE ONLY: stands in for the real SSLCommerz hosted checkout. */
export default function SandboxGateway() {
  const { t, lang } = useApp()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const tran = params.get('tran_id')
  const [p, setP] = useState(null)
  const [method, setMethod] = useState('bKash')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    getPayment(tran).then(setP)
  }, [tran])

  const finish = async (success) => {
    setBusy(success ? 'ok' : 'fail')
    await completeDemoPayment(tran, success, method)
    nav(`/payment/${success ? 'success' : 'fail'}?tran_id=${tran}`, { replace: true })
  }

  const methods = [
    { id: 'bKash', icon: Smartphone },
    { id: 'Nagad', icon: Smartphone },
    { id: 'VISA', icon: CreditCard },
    { id: 'Bank', icon: Landmark },
  ]

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink-100 px-4 py-10 dark:bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="card w-full max-w-md overflow-hidden">
        <div className="bg-amber-400 px-5 py-2 text-center text-xs font-bold text-amber-950">
          <FlaskConical size={13} className="mr-1 inline" /> {t('demo_gateway_title')}
        </div>
        <div className="p-6">
          <p className="text-sm text-ink-500">{t('demo_gateway_sub')}</p>
          {p ? (
            <div className="mt-5 rounded-2xl bg-ink-50 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">{t('transaction')}</span>
                <span className="font-mono font-semibold">{p.tran_id}</span>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-sm text-ink-500">
                  {num(p.case_ids.length, lang)} {t('cases_count')}
                </span>
                <span className="text-3xl font-extrabold">{money(p.amount, lang)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex justify-center py-6">
              <Spinner />
            </div>
          )}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-xs font-semibold transition ${
                  method === m.id ? 'border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200' : 'border-ink-200 dark:border-white/10'
                }`}
              >
                <m.icon size={18} /> {m.id}
              </button>
            ))}
          </div>
          <div className="mt-6 grid gap-2">
            <button disabled={!p || busy} onClick={() => finish(true)} className="btn-primary !py-4">
              {busy === 'ok' ? <Spinner /> : <Check size={18} />} {t('demo_pay')}
            </button>
            <button disabled={!p || busy} onClick={() => finish(false)} className="btn-ghost">
              {busy === 'fail' ? <Spinner /> : <X size={18} />} {t('demo_fail')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
