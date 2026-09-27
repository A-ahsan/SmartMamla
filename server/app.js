// SmartMamla payment API — SSLCommerz + Supabase
// In development this runs INSIDE `npm run dev` (see vite.config.js), on the same address as the site,
// so it works from phones on Wi‑Fi too. For production run `npm run server` (server/index.js).
//
// Flow
//  1. Frontend POST /api/payment/initiate { case_ids } with the user's Supabase access token.
//  2. We verify the user, load their UNPAID traffic_violations, compute the amount server-side,
//     create a `payments` row (payment_type 'violation_fine', same as BRTA Extended),
//     link the violations to it and ask SSLCommerz for a checkout URL.
//  3. SSLCommerz redirects the browser to /api/payment/success|fail|cancel (POST)
//     and calls /api/payment/ipn server-to-server.
//  4. On success we validate the transaction with SSLCommerz's validator API
//     before marking cases paid, then redirect back to the frontend.

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { sendSMS, smsConfigured, caseFiledMessage, finePaidMessage, relayCaseFiledSMS } from './sms.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Reads SmartMamla/.env, then server/.env (you can copy brta_extended/backend/.env to server/.env)
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config({ path: path.join(__dirname, '.env') })

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SSLCZ_STORE_ID = 'testbox',
  SSLCZ_STORE_PASSWORD = 'qwerty',
  SSLCZ_SANDBOX,
  SSLCZ_API_URL = '',
  FRONTEND_URL = 'http://localhost:5173',
  PUBLIC_SITE_URL = 'https://smart-mamla.vercel.app',
  PUBLIC_API_URL,
} = process.env

export const configured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
if (!configured) console.warn('⚠ SmartMamla payments disabled: put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env')

const sandbox = SSLCZ_SANDBOX ? SSLCZ_SANDBOX !== 'false' : !SSLCZ_API_URL.includes('securepay')
const SSLCZ_BASE = sandbox ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com'
const INIT_URL = `${SSLCZ_BASE}/gwprocess/v4/api.php`
const VALIDATE_URL = `${SSLCZ_BASE}/validator/api/validationserverAPI.php`

const db = configured ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null

const api = express.Router()
api.use(cors({ origin: true, credentials: true }))
api.use(express.json())
api.use(express.urlencoded({ extended: false })) // SSLCommerz posts form data
api.use((req, res, next) => {
  if (configured || req.path === '/health') return next()
  res.status(503).json({ error: 'Payment server not configured: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server/.env' })
})

const baseUrl = (req) => {
  if (PUBLIC_API_URL) return PUBLIC_API_URL.replace(/\/$/, '')
  const proto = req.get('x-forwarded-proto') || req.protocol
  return `${proto}://${req.get('host')}`
}

// Remember where each transaction should return to (falls back to FRONTEND_URL)
const returnTo = new Map()
const frontendFor = (tranId) => returnTo.get(tranId) || FRONTEND_URL

const redirectHtml = (url) =>
  `<!doctype html><meta http-equiv="refresh" content="0;url=${url}"><script>location.replace(${JSON.stringify(url)})</script>Redirecting…`

api.get('/health', (_req, res) => res.json({ ok: true, configured, sandbox, sms: smsConfigured() }))

/** Signed-in user from the Bearer token (null if missing/invalid) */
async function authUser(req) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await db.auth.getUser(token)
  return data?.user || null
}

async function phoneOf(userId) {
  const { data } = await db.from('profiles').select('phone').eq('id', userId).maybeSingle()
  return data?.phone || null
}

/* ───────────── SMS to the driver after a police officer files a case ───────────── */
api.post('/sms/case-filed', async (req, res) => {
  try {
    const user = await authUser(req)
    if (!user) return res.status(401).json({ success: false, error: 'Not signed in' })
    const { data: officer } = await db.from('profiles').select('role').eq('id', user.id).single()
    if (!['police', 'admin'].includes(officer?.role)) return res.status(403).json({ success: false, error: 'Police only' })

    const { data: v } = await db.from('traffic_violations').select('*').eq('id', req.body.case_id).single()
    if (!v) return res.status(404).json({ success: false, error: 'Case not found' })

    const phone = await phoneOf(v.user_id)
    if (!phone) return res.json({ success: false, error: 'Driver has no phone number on file' })

    // SMS links must always point to the public website, never localhost / LAN addresses
    const site = `${PUBLIC_SITE_URL.replace(/\/$/, '')}/login`

    // 1) direct to BulkSMSBD (works only from a whitelisted IP)
    if (smsConfigured()) {
      const r = await sendSMS(phone, caseFiledMessage(v, site))
      if (r.success) return res.json({ success: true, to: r.to })
      if (/invalid phone/i.test(r.message)) return res.json({ success: false, error: r.message })
      console.warn('Direct SMS failed, relaying via BRTA Extended backend:', r.message)
    }

    // 2) relay through the BRTA Extended backend in the background (it may need ~50 s to wake up)
    relayCaseFiledSMS(v, site).then((r) =>
      r.success ? console.log('✔ SMS relayed for', v.violation_number) : console.error('✖ SMS relay failed:', r.message)
    )
    res.json({ success: true, queued: true, to: phone.replace(/\d(?=\d{4})/g, '*') })
  } catch (e) {
    console.error('sms/case-filed', e)
    res.status(500).json({ success: false, error: 'Server error' })
  }
})

/* ───────────── 1. initiate ───────────── */
api.post('/payment/initiate', async (req, res) => {
  try {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: auth, error: authErr } = await db.auth.getUser(token)
    if (authErr || !auth?.user) return res.status(401).json({ error: 'Not signed in' })
    const user = auth.user

    const caseIds = Array.isArray(req.body.case_ids) ? req.body.case_ids : []
    if (!caseIds.length) return res.status(400).json({ error: 'No cases selected' })

    const { data: cases, error } = await db
      .from('traffic_violations')
      .select('id, total_amount, fine_amount, violation_number')
      .in('id', caseIds)
      .eq('user_id', user.id)
      .eq('payment_status', 'unpaid')
      .eq('status', 'active')
    if (error) throw error
    if (!cases.length) return res.status(400).json({ error: 'Nothing to pay' })

    const amount = cases.reduce((s, c) => s + Number(c.total_amount ?? c.fine_amount), 0)
    const tran_id = `FINE-SM-${Date.now()}${Math.floor(Math.random() * 1000)}`
    const violation_ids = cases.map((c) => c.id)

    const { data: profile } = await db.from('profiles').select('full_name, phone').eq('id', user.id).single()

    const { data: payment, error: payErr } = await db
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        currency: 'BDT',
        tran_id,
        status: 'initiated',
        payment_type: 'violation_fine',
        metadata: { source: 'smartmamla', violation_ids, violation_numbers: cases.map((c) => c.violation_number) },
      })
      .select('id')
      .single()
    if (payErr) throw payErr
    await db.from('traffic_violations').update({ payment_id: payment.id }).in('id', violation_ids)

    const frontend = typeof req.body.frontend_url === 'string' ? req.body.frontend_url : FRONTEND_URL
    returnTo.set(tran_id, frontend)

    const api = baseUrl(req)
    const payload = {
      store_id: SSLCZ_STORE_ID,
      store_passwd: SSLCZ_STORE_PASSWORD,
      total_amount: amount.toFixed(2),
      currency: 'BDT',
      tran_id,
      success_url: `${api}/api/payment/success`,
      fail_url: `${api}/api/payment/fail`,
      cancel_url: `${api}/api/payment/cancel`,
      ipn_url: `${api}/api/payment/ipn`,
      cus_name: profile?.full_name || 'SmartMamla user',
      cus_email: user.email || 'noreply@smartmamla.local',
      cus_phone: profile?.phone || '01700000000',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      product_name: `Traffic fine (${cases.length})`,
      product_category: 'Government',
      product_profile: 'non-physical-goods',
      value_a: user.id,
    }

    const r = await fetch(INIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString(),
    })
    const data = await r.json()
    if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
      await db.from('payments').update({ status: 'failed' }).eq('tran_id', tran_id)
      return res.status(502).json({ error: data.failedreason || 'Gateway error' })
    }
    res.json({ url: data.GatewayPageURL, tran_id })
  } catch (e) {
    console.error('initiate', e)
    res.status(500).json({ error: 'Server error' })
  }
})

/* ───────────── validation + settle ───────────── */
async function validate(val_id) {
  const url = `${VALIDATE_URL}?val_id=${encodeURIComponent(val_id)}&store_id=${encodeURIComponent(SSLCZ_STORE_ID)}&store_passwd=${encodeURIComponent(SSLCZ_STORE_PASSWORD)}&format=json`
  const r = await fetch(url)
  return r.json()
}

async function settle(body) {
  const { tran_id, val_id } = body
  const { data: payment } = await db.from('payments').select('*').eq('tran_id', tran_id).single()
  if (!payment) return { ok: false }
  if (['success', 'completed'].includes(payment.status)) return { ok: true, payment } // idempotent (IPN + redirect)

  const v = val_id ? await validate(val_id) : null
  const valid =
    v &&
    ['VALID', 'VALIDATED'].includes(v.status) &&
    v.tran_id === tran_id &&
    Math.abs(Number(v.amount) - Number(payment.amount)) < 0.01 &&
    v.currency_type === 'BDT'

  if (!valid) {
    await db.from('payments').update({ status: 'failed' }).eq('id', payment.id)
    return { ok: false, payment }
  }

  const now = new Date().toISOString()
  await db
    .from('payments')
    .update({
      status: 'success',
      sslcommerz_val_id: val_id,
      sslcommerz_tran_date: v.tran_date || null,
      metadata: { ...(payment.metadata || {}), method: v.card_issuer || v.card_type || null, bank_tran_id: v.bank_tran_id || null },
    })
    .eq('id', payment.id)

  const ids = payment.metadata?.violation_ids
  let q = db.from('traffic_violations').update({ payment_status: 'paid', paid_at: now, payment_id: payment.id })
  q = ids?.length ? q.in('id', ids) : q.eq('payment_id', payment.id)
  await q.eq('payment_status', 'unpaid')

  // Receipt SMS (best effort, never blocks the payment)
  phoneOf(payment.user_id)
    .then((phone) => phone && sendSMS(phone, finePaidMessage(payment.metadata?.violation_numbers || [tran_id], payment.amount, tran_id)))
    .catch(() => {})
  return { ok: true, payment }
}

/* ───────────── 3. browser redirects from SSLCommerz ───────────── */
api.post('/payment/success', async (req, res) => {
  const tran = req.body.tran_id
  try {
    const { ok } = await settle(req.body)
    res.send(redirectHtml(`${frontendFor(tran)}/payment/${ok ? 'success' : 'fail'}?tran_id=${encodeURIComponent(tran)}`))
  } catch (e) {
    console.error('success', e)
    res.send(redirectHtml(`${frontendFor(tran)}/payment/fail?tran_id=${encodeURIComponent(tran)}`))
  } finally {
    returnTo.delete(tran)
  }
})

api.post('/payment/fail', async (req, res) => {
  const tran = req.body.tran_id
  await db.from('payments').update({ status: 'failed' }).eq('tran_id', tran).eq('status', 'initiated')
  res.send(redirectHtml(`${frontendFor(tran)}/payment/fail?tran_id=${encodeURIComponent(tran)}`))
  returnTo.delete(tran)
})

api.post('/payment/cancel', async (req, res) => {
  const tran = req.body.tran_id
  await db.from('payments').update({ status: 'cancelled' }).eq('tran_id', tran).eq('status', 'initiated')
  res.send(redirectHtml(`${frontendFor(tran)}/payment/cancel?tran_id=${encodeURIComponent(tran)}`))
  returnTo.delete(tran)
})

/* ───────────── 3b. IPN (server to server) ───────────── */
api.post('/payment/ipn', async (req, res) => {
  try {
    if (req.body.status === 'VALID') await settle(req.body)
    res.sendStatus(200)
  } catch (e) {
    console.error('ipn', e)
    res.sendStatus(500)
  }
})

const app = express()
app.use('/api', api)
export default app
