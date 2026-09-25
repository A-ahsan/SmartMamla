import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Crosshair, Search, Gavel, Car, Bike } from 'lucide-react'
import toast from 'react-hot-toast'
import Sheet from './Sheet'
import { Spinner, SeverityDot } from './ui'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { getViolationTypes, fileCase } from '../lib/api'
import { money } from '../lib/format'

export default function FileCaseSheet({ open, onClose, record, onFiled }) {
  const { t, lang } = useApp()
  const { profile } = useAuth()
  const [types, setTypes] = useState([])
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)
  const [vehicleId, setVehicleId] = useState(null)
  const [location, setLocation] = useState('')
  const [locationBn, setLocationBn] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!open) return
    getViolationTypes().then(setTypes).catch(() => toast.error(t('error_generic')))
    setPicked(null)
    setQuery('')
    setNotes('')
    setLocationBn('')
    setVehicleId(record?.matchedVehicleId || record?.vehicles?.[0]?.id || null)
  }, [open, record, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return types
    return types.filter((v) => v.name_en.toLowerCase().includes(q) || v.name_bn.includes(q) || v.code.toLowerCase().includes(q))
  }, [types, query])

  // GPS → place name (OpenStreetMap). Browsers only allow location on https:// or localhost.
  const useGps = () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      toast.error(
        lang === 'bn'
          ? 'লোকেশন শুধু https বা localhost-এ কাজ করে। npm run dev:phone ব্যবহার করুন।'
          : 'Location only works on https:// or localhost. Use npm run dev:phone.'
      )
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        const coords = `${lat.toFixed(5)}, ${lon.toFixed(5)}`
        const place = async (l) => {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lon}&accept-language=${l}`)
          const j = await r.json()
          const a = j.address || {}
          return [a.road, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.city_district || a.county]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .join(', ')
        }
        try {
          const [en, bn] = await Promise.all([place('en'), place('bn')])
          setLocation(en || coords)
          setLocationBn(bn || en || coords)
        } catch {
          setLocation(coords)
          setLocationBn(coords)
        }
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        toast.error(
          err.code === 1
            ? lang === 'bn'
              ? 'লোকেশনের অনুমতি দেওয়া হয়নি'
              : 'Location permission denied'
            : lang === 'bn'
              ? 'লোকেশন পাওয়া যায়নি'
              : 'Could not get location'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const submit = async () => {
    if (!picked || !location.trim()) return
    setBusy(true)
    try {
      const row = await fileCase({
        officer: profile,
        userId: record.profile.id,
        licenseId: record.licenses?.[0]?.id,
        vehicleId,
        violation: picked,
        location: location.trim(),
        locationBn: locationBn.trim() || location.trim(),
        notes: notes.trim(),
      })
      navigator.vibrate?.([40, 40, 80])
      toast.success(t('case_filed'))
      if (row.sms?.success && row.sms.queued)
        toast.success(lang === 'bn' ? `চালককে SMS পাঠানো হচ্ছে (${row.sms.to})` : `Sending SMS to driver (${row.sms.to})…`)
      else if (row.sms?.success) toast.success(lang === 'bn' ? `চালককে SMS পাঠানো হয়েছে (${row.sms.to})` : `SMS sent to driver (${row.sms.to})`)
      else if (row.sms) toast.error(lang === 'bn' ? `SMS যায়নি: ${row.sms.error}` : `SMS not sent: ${row.sms.error}`, { duration: 5000 })
      onFiled?.(row)
      onClose()
    } catch (e) {
      console.error(e)
      toast.error(t('error_generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('file_mamla')}
      wide
      footer={
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[11px] text-ink-500">{t('fine')}</div>
            <motion.div key={picked?.code} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-xl font-extrabold">
              {money(picked?.fine || 0, lang)}
            </motion.div>
          </div>
          <button onClick={submit} disabled={!picked || !location.trim() || busy} className="btn-danger min-w-[150px]">
            {busy ? <Spinner /> : <Gavel size={18} />} {t('submit_case')}
          </button>
        </div>
      }
    >
      {/* Vehicle */}
      {record?.vehicles?.length > 0 && (
        <div className="mb-5">
          <span className="label">{t('select_vehicle')}</span>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {record.vehicles.map((v) => {
              const I = v.vehicle_type === 'motorcycle' ? Bike : Car
              const on = vehicleId === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setVehicleId(v.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs transition ${
                    on ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/10' : 'border-ink-200 dark:border-white/10'
                  }`}
                >
                  <I size={18} className={on ? 'text-brand-700 dark:text-brand-300' : 'text-ink-400'} />
                  <span>
                    <span className="block font-mono font-bold">{v.registration_number}</span>
                    <span className="text-ink-500">
                      {v.make} {v.model}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Violation */}
      <span className="label">{t('select_violation')}</span>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')} />
      </div>
      <div className="grid max-h-[34dvh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((v) => {
          const on = picked?.code === v.code
          return (
            <motion.button
              key={v.code}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPicked(v)}
              className={`relative rounded-2xl border p-3 text-left transition ${
                on ? 'border-flag-500 bg-flag-50 dark:bg-flag-500/10' : 'border-ink-200 hover:border-ink-300 dark:border-white/10'
              }`}
            >
              <div className="text-sm font-semibold leading-snug">{lang === 'bn' ? v.name_bn : v.name_en}</div>
              <div className="mt-1 flex items-center justify-between">
                <SeverityDot severity={v.severity} />
                <span className="text-sm font-bold">{money(v.fine, lang)}</span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Location + notes */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">{t('location')}</span>
          <div className="relative">
            <input className="input pr-12" value={location} onChange={(e) => {
                setLocation(e.target.value)
                setLocationBn('')
              }} placeholder={t('ph_location')} />
            <button
              type="button"
              onClick={useGps}
              title={t('use_gps')}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-white/5"
            >
              {locating ? <Spinner size={16} /> : <Crosshair size={18} />}
            </button>
          </div>
        </div>
        <div>
          <span className="label">{t('notes')}</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Sheet>
  )
}
