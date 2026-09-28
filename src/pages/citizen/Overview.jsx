import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wallet, Gavel, CheckCircle2, Car, ArrowRight, AlertTriangle, PartyPopper, CreditCard } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Page, StatTile, Skeleton, Spinner, CountUp } from '../../components/ui'
import LicenseCard from '../../components/LicenseCard'
import CaseCard from '../../components/CaseCard'
import { useCitizen } from './CitizenData'
import { money, num, isOverdue } from '../../lib/format'

export default function Overview() {
  const { t, lang } = useApp()
  const { profile } = useAuth()
  const { record, pay, paying } = useCitizen()
  const first = (lang === 'bn' ? profile.full_name_bn || profile.full_name : profile.full_name)?.split(' ')[0]

  if (!record)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    )

  const unpaid = record.cases.filter((c) => c.status === 'unpaid')
  const due = unpaid.reduce((s, c) => s + Number(c.fine_amount), 0)
  const overdue = unpaid.filter(isOverdue).length
  const vById = (id) => record.vehicles.find((v) => v.id === id)

  return (
    <Page>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('hello')}, {first} <motion.span className="inline-block origin-[70%_70%]" animate={{ rotate: [0, 18, -8, 18, 0] }} transition={{ delay: 0.5, duration: 1.2 }}></motion.span>
        </h1>
        <p className="text-sm text-ink-500">{t('overview_sub')}</p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          {/* Dues banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`relative overflow-hidden rounded-[28px] p-5 text-white sm:p-7 ${due ? 'bg-gradient-to-br from-flag-500 via-flag-600 to-flag-700' : 'bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900'}`}
          >
            <div className="bg-grid absolute inset-0 opacity-25" />
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 7, repeat: Infinity }} className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/20 blur-2xl" />
            <div className="relative">
              {due ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                    <Wallet size={16} /> {t('amount_due')}
                  </div>
                  <div className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
                    <CountUp to={due} format={(n) => money(n, lang)} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="chip bg-white/20 text-white">
                      <Gavel size={12} /> {num(unpaid.length, lang)} {t('cases_count')}
                    </span>
                    {overdue > 0 && (
                      <span className="chip bg-white text-flag-600">
                        <AlertTriangle size={12} /> {num(overdue, lang)} {t('overdue')}
                      </span>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                    disabled={paying}
                    onClick={() => pay(unpaid.map((c) => c.id))}
                    className="btn mt-5 w-full bg-white !py-4 text-base text-flag-600 shadow-lg hover:bg-flag-50 sm:w-auto"
                  >
                    {paying ? <Spinner /> : <CreditCard size={19} />} {t('pay_all')}
                  </motion.button>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', delay: 0.2 }} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                    <PartyPopper size={28} />
                  </motion.div>
                  <div>
                    <div className="text-2xl font-extrabold">{t('all_clear')}</div>
                    <div className="text-sm text-white/80">{t('all_clear_sub')}</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Gavel} label={t('total_cases')} value={num(record.cases.length, lang)} tone="sky" />
            <StatTile icon={CheckCircle2} label={t('paid_cases')} value={num(record.cases.length - unpaid.length, lang)} tone="brand" delay={0.05} />
            <StatTile icon={Car} label={t('vehicles')} value={num(record.vehicles.length, lang)} tone="amber" delay={0.1} />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold">{t('recent_cases')}</h2>
              <Link to="/dashboard/cases" className="group flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                {t('view_all')} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="space-y-3">
              {record.cases.slice(0, 3).map((c, i) => (
                <CaseCard key={c.id} c={c} vehicle={vById(c.vehicle_id)} index={i} />
              ))}
              {!record.cases.length && <p className="rounded-2xl bg-white p-5 text-center text-sm text-ink-500 dark:bg-ink-900">{t('no_cases_sub')}</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {record.licenses[0] ? (
            <LicenseCard license={record.licenses[0]} name={lang === 'bn' ? record.licenses[0].full_name_bn : record.licenses[0].full_name} />
          ) : (
            <div className="card p-6 text-center text-sm text-ink-500">{lang === 'bn' ? 'কোনো লাইসেন্স যুক্ত নেই' : 'No licence linked to this account'}</div>
          )}
          <Link to="/dashboard/documents" className="card group flex items-center justify-between p-4 transition hover:shadow-lift">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <Car size={20} />
              </span>
              <span>
                <span className="block text-sm font-bold">{t('c_documents')}</span>
                <span className="text-xs text-ink-500">
                  {num(record.vehicles.length, lang)} {t('vehicles')}
                </span>
              </span>
            </span>
            <ArrowRight size={18} className="text-ink-400 transition-transform group-hover:translate-x-1" />
          </Link>
        </aside>
      </div>
    </Page>
  )
}
