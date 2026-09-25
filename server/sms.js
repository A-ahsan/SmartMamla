// SMS via BulkSMSBD — same provider and request format as BRTA Extended (backend/smsService.js).
//
// BulkSMSBD only accepts requests from WHITELISTED IP addresses. Your deployed BRTA Extended backend
// (Render) is whitelisted; a home PC usually is not. So:
//   1. If SMS_API_KEY + SMS_SENDER_ID are set, we try BulkSMSBD directly.
//   2. If that is not configured or the provider refuses, we relay through the BRTA Extended backend
//      (SMS_RELAY_URL, default https://brta-extended.onrender.com → POST /api/violations/send-sms).

// Tolerate values pasted from JS code: quotes and a trailing ';'
const env = (k) => (process.env[k] || '').trim().replace(/;+$/, '').replace(/^['"]|['"]$/g, '').trim()
const SMS_API_URL = () => env('SMS_API_URL') || 'http://bulksmsbd.net/api/smsapi'

export const smsConfigured = () => Boolean(env('SMS_API_KEY') && env('SMS_SENDER_ID'))

/** 01XXXXXXXXX / +8801… / 8801… → 8801XXXXXXXXX */
export function normalizePhone(phone) {
  let n = String(phone || '').replace(/[\s\-()]/g, '')
  if (n.startsWith('+880')) n = n.slice(1)
  else if (n.startsWith('880')) {
    /* ok */
  } else if (n.startsWith('0')) n = '880' + n.slice(1)
  else n = '880' + n
  return n
}

export async function sendSMS(phone, message) {
  if (!smsConfigured()) return { success: false, skipped: true, message: 'SMS not configured (add SMS_API_KEY and SMS_SENDER_ID to server/.env)' }
  const number = normalizePhone(phone)
  if (!/^8801\d{9}$/.test(number)) return { success: false, message: `Invalid phone number: ${phone}` }
  const url =
    `${SMS_API_URL()}?api_key=${encodeURIComponent(env('SMS_API_KEY'))}&type=text` +
    `&number=${number}&senderid=${encodeURIComponent(env('SMS_SENDER_ID'))}&message=${encodeURIComponent(message)}`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
    const text = await r.text()
    let data = {}
    try {
      data = JSON.parse(text)
    } catch {
      console.error('SMS provider returned non-JSON:', r.status, text.slice(0, 200))
    }
    if (data.response_code === 202) return { success: true, to: number.replace(/\d(?=\d{4})/g, '*') }
    console.error('SMS failed:', data)
    return { success: false, message: data.error_message || `SMS provider error ${data.response_code ?? r.status}` }
  } catch (e) {
    console.error('SMS error:', e.message)
    return { success: false, message: e.message }
  }
}

const bdDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : 'N/A')

export const caseFiledMessage = (v, site) =>
  `SmartMamla Fine Alert\n` +
  `Case: ${v.violation_number}\n` +
  `Reason: ${v.violation_name_en}\n` +
  `Amount: ${Number(v.total_amount ?? v.fine_amount)} BDT\n` +
  (v.location ? `Place: ${v.location}\n` : '') +
  `Due: ${bdDate(v.due_date)}\n` +
  `Pay online: ${site}`

export const finePaidMessage = (numbers, amount, tranId) =>
  `SmartMamla Payment Received\n` +
  `Case: ${numbers.join(', ')}\n` +
  `Amount: ${Number(amount)} BDT\n` +
  `Txn: ${tranId}\n` +
  `Thank you.`

export const relayUrl = () => (env('SMS_RELAY_URL') || 'https://brta-extended.onrender.com').replace(/\/$/, '')

/**
 * Sends the "new fine" SMS through the BRTA Extended backend (whose IP is whitelisted at BulkSMSBD).
 * That backend looks up the driver's phone and due date itself. Render free instances can take ~50 s to wake up.
 */
export async function relayCaseFiledSMS(v, site) {
  try {
    const r = await fetch(`${relayUrl()}/api/violations/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: v.user_id,
        violationNumber: v.violation_number,
        violationName: v.violation_name_en,
        amount: Number(v.total_amount ?? v.fine_amount),
        websiteUrl: site,
      }),
      signal: AbortSignal.timeout(90000),
    })
    const data = await r.json().catch(() => ({}))
    if (data.success) return { success: true, to: data.phoneNumber, via: 'relay' }
    return { success: false, message: data.details || data.error || `Relay error ${r.status}` }
  } catch (e) {
    return { success: false, message: `Relay unreachable: ${e.message}` }
  }
}
