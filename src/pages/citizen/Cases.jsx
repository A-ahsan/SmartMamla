import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { Page, PageHeader, Skeleton, EmptyState, Spinner } from '../../components/ui'
import CaseCard from '../../components/CaseCard'
import { useCitizen } from './CitizenData'
import { money, num } from '../../lib/format'

export default function Cases() {
  const { t, lang } = useApp()
  const { record, pay, paying } = useCitizen()
  const [tab, setTab] = useState('unpaid')
  const [selected, setSelected] = useState([])

  const unpaid = useMemo(() => (record?.cases || []).filter((c) => c.status === 'unpaid'), [record])
  const others = useMemo(() => (record?.cases || []).filter((c) => c.status !== 'unpaid'), [record])

  // pre-select everything unpaid
  useEffect(() => {
    setSelected(unpaid.map((c) => c.id))
  }, [unpaid])

  const total = unpaid.filter((c) => selected.includes(c.id)).reduce((s, c) => s + Number(c.fine_amount), 0)
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const vById = (id) => record?.vehicles.find((v) => v.id === id)
  const list = tab === 'unpaid' ? unpaid : others

  return (
    <Page>
      <PageHeader title={t('c_cases')} sub={record ? `${num(record.cases.length, lang)} ${t('cases_count')}` : t('loading')} />

      <div className="mb-4 inline-flex rounded-full bg-ink-100 p-1 dark:bg-white/5">
        {[
          { id: 'unpaid', label: t('s_unpaid'), n: unpaid.length },
          { id: 'history', label: t('case_history'), n: others.length },
        ].map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className="relative rounded-full px-4 py-2 text-sm font-semibold">
            {tab === x.id && <motion.span layoutId="cc-tab" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-ink-700" />}
            <span className="relative">
              {x.label} <span className={x.id === 'unpaid' && x.n ? 'text-flag-600' : 'text-ink-400'}>{num(x.n, lang)}</span>
            </span>
          </button>
        ))}
      </div>

      {!record ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : list.length ? (
        <div className="grid gap-3 pb-28 md:grid-cols-2 lg:pb-24">
          {list.map((c, i) => (
            <CaseCard
              key={c.id}
              c={c}
              vehicle={vById(c.vehicle_id)}
              index={i}
              selectable={tab === 'unpaid'}
              selected={selected.includes(c.id)}
              onToggle={() => toggle(c.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={CheckCircle2} title={tab === 'unpaid' ? t('all_clear') : t('no_cases')} sub={tab === 'unpaid' ? t('all_clear_sub') : t('no_cases_sub')} />
      )}

      {/* Sticky pay bar — sits above the mobile tab bar */}
      <AnimatePresence>
        {tab === 'unpaid' && selected.length > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-x-3 bottom-[92px] z-30 lg:bottom-6 lg:left-[calc(18rem+2.5rem)] lg:right-10"
          >
            <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-3xl bg-ink-900 p-3 pl-5 text-white shadow-lift dark:bg-ink-800">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-white/60">
                  {num(selected.length, lang)} {t('cases_count')}
                </div>
                <motion.div key={total} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-xl font-extrabold">
                  {money(total, lang)}
                </motion.div>
              </div>
              <span className="hidden items-center gap-1 text-[11px] text-white/50 sm:flex">
                <ShieldCheck size={13} /> SSLCommerz
              </span>
              <motion.button whileTap={{ scale: 0.96 }} disabled={paying} onClick={() => pay(selected)} className="btn bg-brand-500 !py-3.5 text-white hover:bg-brand-400">
                {paying ? <Spinner /> : <CreditCard size={18} />} {t('pay_now')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}
