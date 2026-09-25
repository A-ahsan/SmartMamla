import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'
import { getMyRecord, startPayment } from '../../lib/api'

const Ctx = createContext(null)

/** Loads the signed-in citizen's record once and shares it across the portal tabs. */
export function CitizenDataProvider({ children }) {
  const { profile } = useAuth()
  const { t } = useApp()
  const nav = useNavigate()
  const [record, setRecord] = useState(null)
  const [paying, setPaying] = useState(false)

  const reload = useCallback(() => {
    return getMyRecord(profile.id)
      .then(setRecord)
      .catch((e) => {
        console.error(e)
        toast.error(t('error_generic'))
        setRecord({ profile, licenses: [], vehicles: [], cases: [], payments: [] })
      })
  }, [profile, t])

  useEffect(() => {
    reload()
  }, [reload])

  const pay = useCallback(
    async (caseIds) => {
      if (!caseIds.length) return
      setPaying(true)
      const tid = toast.loading(t('paying'))
      try {
        const url = await startPayment(caseIds, profile)
        toast.dismiss(tid)
        if (url.startsWith('/')) nav(url)
        else window.location.assign(url)
      } catch (e) {
        console.error(e)
        const msg = e?.message && e.message !== 'payment' && e.message !== 'Failed to fetch' ? e.message : t('error_generic')
        toast.error(msg, { id: tid })
      } finally {
        setPaying(false)
      }
    },
    [profile, nav, t]
  )

  return <Ctx.Provider value={{ record, reload, pay, paying }}>{children}</Ctx.Provider>
}

export const useCitizen = () => useContext(Ctx)
