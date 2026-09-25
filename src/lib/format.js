const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

export const toBnDigits = (value) => String(value).replace(/\d/g, (d) => BN_DIGITS[d])

/** Localise digits in any string or number. */
export const num = (value, lang) => (lang === 'bn' ? toBnDigits(value) : String(value))

export const money = (amount, lang) => {
  const n = Number(amount || 0)
  const s = n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  return lang === 'bn' ? `৳${toBnDigits(s)}` : `৳${s}`
}

export const date = (value, lang, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', opts)
}

export const dateTime = (value, lang) =>
  date(value, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export const isOverdue = (c) => c.status === 'unpaid' && c.due_date && new Date(c.due_date) < new Date()

export const cx = (...parts) => parts.filter(Boolean).join(' ')

/** QR payloads look like  SMARTMAMLA|DL|DK0123456789  or  SMARTMAMLA|VR|DHAKA METRO-GA-12-3456 */
export const makeQrPayload = (type, value) => `SMARTMAMLA|${type}|${value}`

export const parseQrPayload = (text) => {
  const raw = String(text || '').trim()
  // SmartMamla cards:  SMARTMAMLA|DL|<no>  /  SMARTMAMLA|VR|<no>
  const parts = raw.split('|')
  if (parts[0] === 'SMARTMAMLA' && parts.length >= 3) {
    return { type: parts[1] === 'VR' ? 'vehicle' : 'license', value: parts.slice(2).join('|') }
  }
  // BRTA Extended licence QR: https://…/license/DL261600304
  const url = raw.match(/\/license\/([A-Za-z0-9-]+)/)
  if (url) return { type: 'license', value: decodeURIComponent(url[1]) }
  // BRTA Extended vehicle smart-card QR: {"registration_number": "REG…", …}
  try {
    const j = JSON.parse(raw)
    if (j?.registration_number) return { type: 'vehicle', value: j.registration_number }
    if (j?.license_number) return { type: 'license', value: j.license_number }
  } catch {
    /* not JSON */
  }
  // VC-<id>|<plate>|…  (downloaded vehicle card)
  if (raw.startsWith('VC-') && parts[1]) return { type: 'vehicle', value: parts[1] }
  if (/^REG\d+/i.test(raw)) return { type: 'vehicle', value: raw }
  if (/^DL\d+/i.test(raw)) return { type: 'license', value: raw }
  // Fallback: plates contain spaces or dashes, licence numbers don't
  if (/[-\s]/.test(raw)) return { type: 'vehicle', value: raw }
  return { type: 'license', value: raw }
}
