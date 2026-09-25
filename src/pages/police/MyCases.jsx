import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, FileText, ScanLine } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { Page, PageHeader, Skeleton, EmptyState } from '../../components/ui'
import CaseCard from '../../components/CaseCard'
import { getOfficerCases } from '../../lib/api'
import { num } from '../../lib/format'

export default function MyCases() {
  const { t, lang } = useApp()
  const { profile } = useAuth()
  const [cases, setCases] = useState(null)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    getOfficerCases(profile.id).then(setCases).catch(() => setCases([]))
  }, [profile.id])

  const shown = useMemo(() => {
    if (!cases) return []
    const query = q.trim().toLowerCase()
    return cases.filter(
      (c) =>
        (filter === 'all' || c.status === filter) &&
        (!query ||
          [c.case_number, c.violation_en, c.violation_bn, c.location, c.vehicle?.registration_number, c.driver?.full_name]
            .filter(Boolean)
            .some((s) => s.toLowerCase().includes(query)))
    )
  }, [cases, filter, q])

  const count = (f) => (cases || []).filter((c) => f === 'all' || c.status === f).length

  return (
    <Page>
      <PageHeader title={t('filed_by_me')} sub={cases ? `${num(cases.length, lang)} ${t('cases_count')}` : t('loading')} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-11" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} />
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 dark:bg-white/5">
          {['all', 'unpaid', 'paid'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="relative shrink-0 rounded-full px-4 py-2 text-xs font-semibold">
              {filter === f && <motion.span layoutId="mc-filter" className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-ink-700" />}
              <span className="relative">
                {f === 'all' ? t('filter_all') : t(`s_${f}`)} <span className="text-ink-400">{num(count(f), lang)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {!cases ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : shown.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((c, i) => (
            <CaseCard
              key={c.id}
              c={c}
              vehicle={c.vehicle}
              driverName={lang === 'bn' ? c.driver?.full_name_bn || c.driver?.full_name : c.driver?.full_name}
              index={i}
              showOfficer={false}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={FileText} title={t('no_cases')}>
          <Link to="/police/lookup" className="btn-primary">
            <ScanLine size={18} /> {t('p_lookup')}
          </Link>
        </EmptyState>
      )}
    </Page>
  )
}
