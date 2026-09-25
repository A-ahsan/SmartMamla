import { motion } from 'framer-motion'
import { ReceiptText, CreditCard } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { Page, PageHeader, Skeleton, EmptyState, StatusChip } from '../../components/ui'
import { useCitizen } from './CitizenData'
import { money, num, dateTime } from '../../lib/format'

export default function Payments() {
  const { t, lang } = useApp()
  const { record } = useCitizen()

  return (
    <Page>
      <PageHeader title={t('payment_history')} />
      {!record ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : record.payments.length ? (
        <div className="card divide-y divide-ink-100 overflow-hidden dark:divide-white/5">
          {record.payments.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4 p-4 sm:p-5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  p.status === 'success' ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'bg-ink-100 text-ink-500 dark:bg-white/5'
                }`}
              >
                {p.status === 'success' ? <ReceiptText size={22} /> : <CreditCard size={22} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{p.tran_id}</span>
                  {p.method && <span className="chip bg-ink-100 text-ink-600 dark:bg-white/5 dark:text-ink-300">{p.method}</span>}
                </div>
                <div className="mt-0.5 text-xs text-ink-500">
                  {dateTime(p.created_at, lang)} · {num(p.case_ids?.length || 0, lang)} {t('cases_count')}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-base font-extrabold">{money(p.amount, lang)}</span>
                <StatusChip status={p.status} />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState icon={ReceiptText} title={t('no_payments')} />
      )}
    </Page>
  )
}
