import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScanLine, IdCard, Car, Search, SearchX, RotateCcw } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { Page, PageHeader, Skeleton, EmptyState, Spinner } from '../../components/ui'
import QrScanner from '../../components/QrScanner'
import DriverRecord from '../../components/DriverRecord'
import FileCaseSheet from '../../components/FileCaseSheet'
import { lookup, DEMO_MODE } from '../../lib/api'
import { parseQrPayload } from '../../lib/format'

const TABS = [
  { id: 'scan', icon: ScanLine, key: 'tab_scan' },
  { id: 'license', icon: IdCard, key: 'tab_license' },
  { id: 'vehicle', icon: Car, key: 'tab_vehicle' },
]

const DEMO_SAMPLES = { license: 'DK0123456789', vehicle: 'DHAKA METRO-GA-12-3456' }

export default function Lookup() {
  const { t } = useApp()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('type') || 'scan')
  const [value, setValue] = useState(params.get('q') || '')
  const [state, setState] = useState('idle') // idle | loading | found | none
  const [record, setRecord] = useState(null)
  const [fileOpen, setFileOpen] = useState(false)

  const run = useCallback(
    async (type, q, { silent = false } = {}) => {
      if (!q?.trim()) return
      if (!silent) setState('loading')
      setParams({ type, q }, { replace: true })
      try {
        const r = await lookup(type, q)
        setRecord(r)
        setState(r ? 'found' : 'none')
        if (r) navigator.vibrate?.(30)
      } catch (e) {
        console.error(e)
        setState('none')
      }
    },
    [setParams]
  )

  // restore from URL (e.g. after refresh)
  useEffect(() => {
    const type = params.get('type')
    const q = params.get('q')
    if (type && q && type !== 'scan') run(type, q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScan = (text) => {
    const { type, value: v } = parseQrPayload(text)
    setTab(type)
    setValue(v)
    run(type, v)
  }

  const reset = () => {
    setRecord(null)
    setState('idle')
    setValue('')
    setParams({}, { replace: true })
  }

  const refresh = () => run(params.get('type') || tab, params.get('q') || value, { silent: true })

  return (
    <Page>
      <PageHeader
        title={t('lookup_title')}
        sub={t('lookup_sub')}
        action={
          state !== 'idle' && (
            <button onClick={reset} className="btn-ghost !py-2.5">
              <RotateCcw size={16} /> {t('new_search')}
            </button>
          )
        }
      />

      <>
        {state === 'idle' || state === 'loading' ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card mx-auto max-w-xl p-4 sm:p-6">
            {/* Tabs */}
            <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-ink-100 p-1 dark:bg-white/5">
              {TABS.map((tb) => (
                <button key={tb.id} onClick={() => setTab(tb.id)} className="relative flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] font-semibold sm:flex-row sm:justify-center sm:gap-2 sm:text-sm">
                  {tab === tb.id && <motion.span layoutId="lookup-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-ink-800" transition={{ type: 'spring', stiffness: 450, damping: 34 }} />}
                  <tb.icon size={18} className={`relative ${tab === tb.id ? 'text-brand-700 dark:text-brand-300' : 'text-ink-400'}`} />
                  <span className={`relative ${tab === tb.id ? '' : 'text-ink-500'}`}>{t(tb.key)}</span>
                </button>
              ))}
            </div>

            <>
              {tab === 'scan' ? (
                <motion.div key="scan" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  {state === 'loading' ? (
                    <div className="flex h-72 items-center justify-center text-brand-700">
                      <Spinner size={32} />
                    </div>
                  ) : (
                    <QrScanner onResult={onScan} />
                  )}
                </motion.div>
              ) : (
                <motion.form
                  key={tab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    run(tab, value)
                  }}
                >
                  <label className="label">{t(tab === 'license' ? 'tab_license' : 'tab_vehicle')}</label>
                  <div className="relative">
                    {tab === 'license' ? (
                      <IdCard size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                    ) : (
                      <Car size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                    )}
                    <input
                      autoFocus
                      className="input pl-12 font-mono text-base uppercase tracking-wide"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={t(tab === 'license' ? 'ph_license' : 'ph_vehicle')}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="text"
                    />
                  </div>
                  <button disabled={!value.trim() || state === 'loading'} className="btn-primary mt-4 w-full !py-4 text-base">
                    {state === 'loading' ? <Spinner /> : <Search size={19} />} {t('search')}
                  </button>
                  {DEMO_MODE && (
                    <button type="button" onClick={() => setValue(DEMO_SAMPLES[tab])} className="mt-3 w-full text-center text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300">
                      {t('try_demo')}: <span className="font-mono">{DEMO_SAMPLES[tab]}</span>
                    </button>
                  )}
                </motion.form>
              )}
            </>

            {state === 'loading' && tab !== 'scan' && (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-16" />
              </div>
            )}
          </motion.div>
        ) : state === 'none' ? (
          <motion.div key="none" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl">
            <EmptyState icon={SearchX} title={t('not_found')} sub={t('not_found_sub')}>
              <button onClick={reset} className="btn-primary">
                <Search size={18} /> {t('new_search')}
              </button>
            </EmptyState>
          </motion.div>
        ) : (
          <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DriverRecord record={record} onFile={() => setFileOpen(true)} />
          </motion.div>
        )}
      </>

      <FileCaseSheet open={fileOpen} onClose={() => setFileOpen(false)} record={record} onFiled={refresh} />
    </Page>
  )
}
