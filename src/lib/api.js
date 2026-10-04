// Single data layer for the app.
// With Supabase keys set it talks to Supabase (+ the payment server);
// without them it runs on an in-browser demo database so the UI can be tried immediately.

import { supabase, DEMO_MODE, API_URL } from './supabase'
import { load, save, remove } from './storage'
import {
  VIOLATION_TYPES,
  DEMO_USERS,
  DEMO_LICENSES,
  DEMO_VEHICLES,
  DEMO_CASES,
  DEMO_PAYMENTS,
} from './demoData'

export { DEMO_MODE }

/* ─────────────────────────── demo store ─────────────────────────── */

const DB_KEY = 'sm.demo.db.v1'
const SESSION_KEY = 'sm.demo.session'
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms))
const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`

const demoDb = () => {
  const db = load(DB_KEY, null)
  if (db) return db
  const fresh = {
    users: DEMO_USERS,
    licenses: DEMO_LICENSES,
    vehicles: DEMO_VEHICLES,
    cases: DEMO_CASES,
    payments: DEMO_PAYMENTS,
  }
  save(DB_KEY, fresh)
  return fresh
}
const commit = (db) => save(DB_KEY, db)
const publicProfile = (u) => {
  if (!u) return null
  const { password, ...rest } = u
  return rest
}

export const resetDemo = () => {
  remove(DB_KEY)
  remove(SESSION_KEY)
}

/* ─────────────────────────── Supabase (BRTA Extended schema) mappers ───────────────────────────
   SmartMamla reads the existing BRTA Extended tables:
     profiles · licenses · registered_vehicles · tax_tokens · violation_types · traffic_violations · payments
   and maps them to the shapes the UI uses. */

const LICENSE_CLASS_BN = { Light: 'হালকা', Motor: 'মোটরসাইকেল', 'Light+Motor': 'হালকা + মোটরসাইকেল' }

const mapProfile = (p) =>
  p && {
    ...p,
    db_role: p.role,
    role: ['police', 'admin'].includes(p.role) ? 'police' : 'citizen',
    full_name_bn: p.full_name_bn || p.full_name,
  }

const mapLicense = (l) => ({
  ...l,
  full_name: l.full_name_en,
  full_name_bn: l.full_name_bn || l.full_name_en,
  license_class: l.license_type,
  license_class_bn: LICENSE_CLASS_BN[l.license_type] || l.license_type,
})

const mapVehicle = (v, taxTokens = []) => {
  const tax = taxTokens
    .filter((t) => t.registered_vehicle_id === v.id)
    .sort((a, b) => new Date(b.valid_until) - new Date(a.valid_until))[0]
  return {
    id: v.id,
    owner_id: v.user_id,
    reg_id: v.registration_number,
    registration_number: v.registration_plate?.en || v.registration_number,
    registration_number_bn: v.registration_plate?.bn || v.registration_plate?.en || v.registration_number,
    vehicle_type: /bike|motor/i.test(v.vehicle_type || '') ? 'motorcycle' : 'car',
    make: v.vehicle_name,
    model: v.model,
    color: v.engine_cc ? `${v.engine_cc} cc` : '',
    engine_number: v.engine_number,
    registration_date: v.registration_date,
    registration_valid_until: v.valid_until,
    tax_token_expiry: tax?.valid_until || null,
    fitness_expiry: null,
    status: v.status,
    photo_url: v.vehicle_photo_url,
  }
}

let typeCache = null
async function violationTypes() {
  if (typeCache) return typeCache
  const { data, error } = await supabase.from('violation_types').select('*').eq('is_active', true).order('base_fine_amount')
  if (error) throw error
  typeCache = data.map((v) => ({
    id: v.id,
    code: v.code,
    name_en: v.name_en,
    name_bn: v.name_bn,
    fine: Number(v.base_fine_amount),
    severity: v.severity,
  }))
  return typeCache
}

const mapCase = (tv, types = [], appeals = []) => {
  const appeal = appeals.find((a) => a.violation_id === tv.id) || null
  return {
  id: tv.id,
  case_number: tv.violation_number,
  user_id: tv.user_id,
  vehicle_id: tv.registered_vehicle_id,
  officer_id: tv.police_user_id,
  officer_name: tv.police_name,
  officer_badge: tv.police_badge_number,
  violation_code: tv.violation_code,
  violation_en: tv.violation_name_en,
  violation_bn: tv.violation_name_bn,
  severity: types.find((t) => t.code === tv.violation_code)?.severity || 'moderate',
  fine_amount: Number(tv.total_amount ?? tv.fine_amount),
  location: tv.location,
  location_bn: tv.location_bn,
  notes: tv.notes,
  status:
    tv.status === 'waived' ? 'waived' : tv.payment_status === 'paid' ? 'paid' : tv.status === 'appealed' ? 'disputed' : 'unpaid',
  created_at: tv.violation_date || tv.created_at,
  due_date: tv.due_date,
  paid_at: tv.paid_at,
  transaction_id: tv.payment_id,
  source: tv.source || 'officer',
  evidence: evidenceOf(tv),
  // Appeals: only AI-camera fines, only while unpaid, and only once
  appeal,
  can_appeal: (tv.source || 'officer') === 'ai' && tv.status === 'active' && tv.payment_status === 'unpaid' && !appeal,
  }
}

/** Evidence snapshots of a case: [{ kind: 'frame' | 'crop' | 'plate', url }] with absolute URLs */
function evidenceOf(tv) {
  const list =
    Array.isArray(tv.evidence_images) && tv.evidence_images.length
      ? tv.evidence_images
      : tv.photo_evidence_url
        ? [{ kind: 'frame', url: tv.photo_evidence_url }]
        : []
  return list.filter((e) => e?.url).map((e) => ({ ...e, url: /^https?:/i.test(e.url) ? e.url : `${API_URL}${e.url}` }))
}

const PAY_STATUS = { success: 'success', completed: 'success', initiated: 'pending', pending: 'pending', failed: 'failed', cancelled: 'failed' }

const mapPayment = (p, cases = []) => ({
  id: p.id,
  tran_id: p.tran_id,
  user_id: p.user_id,
  amount: Number(p.amount),
  status: PAY_STATUS[p.status] || 'pending',
  method: p.metadata?.method || null,
  created_at: p.created_at,
  case_ids: p.metadata?.violation_ids || cases.filter((c) => c.transaction_id === p.id).map((c) => c.id),
})

/* ─────────────────────────── auth ─────────────────────────── */

const fetchProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return mapProfile(data)
}

export async function getCurrentProfile() {
  if (DEMO_MODE) {
    const id = load(SESSION_KEY, null)
    return publicProfile(demoDb().users.find((u) => u.id === id))
  }
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  try {
    return await fetchProfile(data.session.user.id)
  } catch {
    return null
  }
}

export function onAuthChange(cb) {
  if (DEMO_MODE) return () => {}
  const { data } = supabase.auth.onAuthStateChange((evt, session) => {
    if (evt === 'INITIAL_SESSION') return
    if (!session) return cb(null)
    // defer: calling Supabase inside this callback can deadlock the auth client
    setTimeout(() => fetchProfile(session.user.id).then(cb, () => cb(null)), 0)
  })
  return () => data.subscription.unsubscribe()
}

/** identifier can be an email, or a police badge number */
export async function signIn(identifier, password) {
  const id = identifier.trim()
  if (DEMO_MODE) {
    await wait(600)
    const u = demoDb().users.find(
      (x) =>
        (x.email.toLowerCase() === id.toLowerCase() || x.badge_number?.toLowerCase() === id.toLowerCase()) &&
        x.password === password
    )
    if (!u) throw new Error('invalid')
    save(SESSION_KEY, u.id)
    return publicProfile(u)
  }
  let email = id
  if (!id.includes('@')) {
    const { data, error } = await supabase.rpc('email_for_badge', { p_badge: id })
    if (error || !data) throw new Error('invalid')
    email = data
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return fetchProfile(data.user.id)
}

export async function signUp({ email, password, full_name, phone }) {
  if (DEMO_MODE) {
    await wait(600)
    const db = demoDb()
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('exists')
    db.users.push({ id: uid('u'), email, password, role: 'citizen', full_name, full_name_bn: full_name, phone })
    commit(db)
    return
  }
  // No `role` in metadata: the database trigger defaults new users to 'user' (citizen).
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })
  if (error) throw error
}

export async function signOut() {
  if (DEMO_MODE) return remove(SESSION_KEY)
  await supabase.auth.signOut()
}

/* ─────────────────────────── reference data ─────────────────────────── */

export async function getViolationTypes() {
  if (DEMO_MODE) return VIOLATION_TYPES
  return violationTypes()
}

/* ─────────────────────────── records ─────────────────────────── */

const sortCases = (list) => [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
const must = (r) => {
  if (r.error) throw r.error
  return r.data
}

async function recordForUser(userId) {
  if (DEMO_MODE) {
    const db = demoDb()
    return {
      profile: publicProfile(db.users.find((u) => u.id === userId)),
      licenses: db.licenses.filter((l) => l.user_id === userId),
      vehicles: db.vehicles.filter((v) => v.owner_id === userId),
      cases: sortCases(db.cases.filter((c) => c.user_id === userId)),
      payments: db.payments
        .filter((p) => p.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    }
  }
  const [profile, licenses, vehicles, taxTokens, violations, payments, types, appeals] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle().then(must),
    supabase.from('licenses').select('*').eq('user_id', userId).order('issue_date', { ascending: false }).then(must),
    supabase.from('registered_vehicles').select('*').eq('user_id', userId).then(must),
    supabase.from('tax_tokens').select('registered_vehicle_id, valid_until').eq('user_id', userId).then((r) => r.data || []),
    supabase.from('traffic_violations').select('*').eq('user_id', userId).order('violation_date', { ascending: false }).then(must),
    supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .in('payment_type', ['violation_fine', 'fine'])
      .order('created_at', { ascending: false })
      .then(must),
    violationTypes(),
    // RLS: a driver sees only their own appeals, police see all
    supabase.from('violation_appeals').select('*').eq('user_id', userId).then((r) => r.data || []),
  ])
  const cases = violations.map((v) => mapCase(v, types, appeals))
  return {
    profile: mapProfile(profile),
    licenses: licenses.map(mapLicense),
    vehicles: vehicles.map((v) => mapVehicle(v, taxTokens)),
    cases,
    payments: payments.map((p) => mapPayment(p, cases)),
  }
}

export const getMyRecord = (userId) => (DEMO_MODE ? wait(300).then(() => recordForUser(userId)) : recordForUser(userId))

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim()

/**
 * Police lookup by licence or registration number / plate.
 * Returns the owner's full record, or null when nothing matches.
 */
export async function lookup(type, value) {
  const q = norm(value)
  if (!q) return null
  if (DEMO_MODE) {
    await wait(500)
    const db = demoDb()
    let userId = null
    let matchedVehicleId = null
    if (type === 'vehicle') {
      const v = db.vehicles.find((x) => norm(x.registration_number) === q || norm(x.registration_number_bn) === q)
      if (v) {
        userId = v.owner_id
        matchedVehicleId = v.id
      }
    } else {
      const l = db.licenses.find((x) => norm(x.license_number) === q)
      if (l) userId = l.user_id
    }
    if (!userId) return null
    return { ...(await recordForUser(userId)), matchedVehicleId, payments: undefined }
  }

  let userId = null
  let matchedVehicleId = null
  if (type === 'vehicle') {
    // "DHAKA METRO GA 83 1413", "DHAKA-METRO-GA-83-1413" and "REG2026…" all match
    const pat = q.replace(/[^\p{L}\p{N}]+/gu, '%')
    const { data } = await supabase
      .from('registered_vehicles')
      .select('id, user_id')
      .or(`registration_number.ilike.${pat},registration_plate->>en.ilike.${pat},registration_plate->>bn.ilike.${pat}`)
      .limit(1)
    if (data?.[0]) {
      userId = data[0].user_id
      matchedVehicleId = data[0].id
    }
  } else {
    const { data } = await supabase.from('licenses').select('user_id').ilike('license_number', q).limit(1)
    if (data?.[0]) userId = data[0].user_id
  }
  if (!userId) return null
  const rec = await recordForUser(userId)
  return { ...rec, matchedVehicleId, payments: undefined }
}

/* ─────────────────────────── cases ─────────────────────────── */

export async function fileCase({ officer, userId, licenseId, vehicleId, violation, location, locationBn, notes }) {
  if (DEMO_MODE) {
    await wait(700)
    const db = demoDb()
    const row = {
      user_id: userId,
      license_id: licenseId || null,
      vehicle_id: vehicleId || null,
      officer_id: officer.id,
      officer_name: officer.full_name,
      officer_badge: officer.badge_number,
      violation_code: violation.code,
      violation_en: violation.name_en,
      violation_bn: violation.name_bn,
      severity: violation.severity,
      fine_amount: violation.fine,
      location,
      notes,
      status: 'unpaid',
      due_date: new Date(Date.now() + 30 * 864e5).toISOString(),
      id: uid('c'),
      case_number: `SM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`,
      created_at: new Date().toISOString(),
    }
    db.cases.push(row)
    commit(db)
    return row
  }
  const { data: number, error: numErr } = await supabase.rpc('generate_violation_number')
  if (numErr) throw numErr
  const { data, error } = await supabase
    .from('traffic_violations')
    .insert({
      violation_number: number,
      registered_vehicle_id: vehicleId || null,
      user_id: userId,
      police_user_id: officer.id,
      police_name: officer.full_name,
      police_badge_number: officer.badge_number || officer.email,
      violation_type_id: violation.id || null,
      violation_code: violation.code,
      violation_name_en: violation.name_en,
      violation_name_bn: violation.name_bn,
      fine_amount: violation.fine,
      additional_charges: 0,
      location,
      location_bn: locationBn || null,
      notes: notes || null,
      payment_status: 'unpaid',
      status: 'active',
    })
    .select()
    .single()
  if (error) throw error
  const row = mapCase(data, await violationTypes())
  row.sms = await notifyDriver(data.id)
  return row
}

/** Asks the payment/SMS server to text the driver about a new case. Never throws. */
async function notifyDriver(caseId) {
  try {
    const { data: sess } = await supabase.auth.getSession()
    const res = await fetch(`${API_URL}/api/sms/case-filed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token}` },
      body: JSON.stringify({ case_id: caseId, site_url: window.location.origin }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function getOfficerCases(officerId) {
  if (DEMO_MODE) {
    await wait(300)
    const db = demoDb()
    return sortCases(db.cases.filter((c) => c.officer_id === officerId)).map((c) => ({
      ...c,
      vehicle: db.vehicles.find((v) => v.id === c.vehicle_id) || null,
      driver: publicProfile(db.users.find((u) => u.id === c.user_id)),
    }))
  }
  const [rows, types] = await Promise.all([
    supabase.from('traffic_violations').select('*').eq('police_user_id', officerId).order('violation_date', { ascending: false }).then(must),
    violationTypes(),
  ])
  const vIds = [...new Set(rows.map((r) => r.registered_vehicle_id).filter(Boolean))]
  const uIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  const [vehicles, people] = await Promise.all([
    vIds.length ? supabase.from('registered_vehicles').select('*').in('id', vIds).then(must) : [],
    uIds.length ? supabase.from('profiles').select('id, full_name').in('id', uIds).then(must) : [],
  ])
  return rows.map((r) => {
    const v = vehicles.find((x) => x.id === r.registered_vehicle_id)
    return {
      ...mapCase(r, types),
      vehicle: v ? mapVehicle(v) : null,
      driver: mapProfile(people.find((p) => p.id === r.user_id)) || null,
    }
  })
}

/* ─────────────────────────── payments ─────────────────────────── */

/**
 * Starts an SSLCommerz payment for the given unpaid cases.
 * Returns the URL to send the browser to.
 */
export async function startPayment(caseIds, profile) {
  if (DEMO_MODE) {
    await wait(500)
    const db = demoDb()
    const cases = db.cases.filter((c) => caseIds.includes(c.id) && c.status === 'unpaid')
    const amount = cases.reduce((s, c) => s + Number(c.fine_amount), 0)
    const tran_id = `SMTX${Date.now().toString().slice(-8)}`
    db.payments.push({
      id: uid('p'),
      tran_id,
      user_id: profile.id,
      case_ids: cases.map((c) => c.id),
      amount,
      status: 'pending',
      method: null,
      created_at: new Date().toISOString(),
    })
    commit(db)
    return `/payment/sandbox?tran_id=${tran_id}`
  }
  const { data: sess } = await supabase.auth.getSession()
  const res = await fetch(`${API_URL}/api/payment/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token}` },
    body: JSON.stringify({ case_ids: caseIds, frontend_url: window.location.origin }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.url) throw new Error(body.error || 'payment')
  return body.url
}

export async function getPayment(tranId) {
  if (DEMO_MODE) return demoDb().payments.find((p) => p.tran_id === tranId) || null
  const { data } = await supabase.from('payments').select('*').eq('tran_id', tranId).maybeSingle()
  return data ? mapPayment(data) : null
}

/** Demo only: resolve a sandbox payment. */
export async function completeDemoPayment(tranId, success, method = 'bKash') {
  await wait(900)
  const db = demoDb()
  const p = db.payments.find((x) => x.tran_id === tranId)
  if (!p) throw new Error('not found')
  p.status = success ? 'success' : 'failed'
  p.method = success ? method : null
  if (success) {
    const now = new Date().toISOString()
    db.cases.forEach((c) => {
      if (p.case_ids.includes(c.id)) {
        c.status = 'paid'
        c.paid_at = now
        c.transaction_id = tranId
      }
    })
  }
  commit(db)
  return p
}

/* ─────────────────────────── police dashboard stats ─────────────────────────── */

export async function getOfficerStats(officerId) {
  const cases = await getOfficerCases(officerId)
  const today = new Date().toDateString()
  return {
    today: cases.filter((c) => new Date(c.created_at).toDateString() === today).length,
    collected: cases.filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.fine_amount), 0),
    pending: cases.filter((c) => c.status === 'unpaid').reduce((s, c) => s + Number(c.fine_amount), 0),
    total: cases.length,
  }
}

/* ─────────────────────────── AI reports (Omni-Eye) ───────────────────────────
   Omni-Eye, the video-processing node, sends one report per detected violation to the
   SmartMamla server (server/ai.js). Officers review them here and file a mamla through
   the normal flow, or dismiss them. */

async function aiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (DEMO_MODE) {
    headers['x-demo'] = '1'
  } else {
    const { data } = await supabase.auth.getSession()
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`
  }
  const res = await fetch(`${API_URL}/api/ai${path}`, { ...opts, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

export const getAiReports = (status = 'pending') => aiFetch(`/reports?status=${encodeURIComponent(status)}`)
export const getAiSummary = () => aiFetch('/summary')
export const reviewAiReport = (id, body) =>
  aiFetch(`/reports/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(body) })
export const aiImage = (url) => (url ? `${API_URL}${url}` : null)

/** The violation type that matches an AI report: by code first, then by name. */
export function matchViolationType(types, report) {
  if (!report || !types?.length) return null
  for (const code of report.violation_codes || []) {
    const hit = types.find((t) => String(t.code).toUpperCase() === code)
    if (hit) return hit
  }
  if (report.violation_match) {
    const re = new RegExp(report.violation_match, 'i')
    return types.find((t) => re.test(t.name_en || '') || re.test(t.name_bn || '')) || null
  }
  return null
}

/* ─────────────────────────── appeals (AI-camera fines) ───────────────────────────
   A driver may appeal an AI-camera fine once. Police accept (fine removed) or reject (fine stands),
   and the driver gets an SMS. All writes go through the server (server/appeals.js). */

async function appealFetch(path, opts = {}) {
  if (DEMO_MODE) throw new Error('Appeals need the live database (not available in demo mode)')
  const { data } = await supabase.auth.getSession()
  const res = await fetch(`${API_URL}/api/appeals${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body.error || `HTTP ${res.status}`)
    err.code = body.code
    throw err
  }
  return body
}

export const submitAppeal = (caseId, reason) => appealFetch('', { method: 'POST', body: JSON.stringify({ case_id: caseId, reason }) })
export const getAppealCount = () => appealFetch('/count').then((r) => r.pending)
export const reviewAppeal = (id, decision, note) =>
  appealFetch(`/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify({ decision, note }) })

/** Police queue. Each item: the appeal + `c` (the case, UI shape) + driver / license / vehicle. */
export async function getAppeals(status = 'pending') {
  const [list, types] = await Promise.all([appealFetch(`?status=${encodeURIComponent(status)}`), violationTypes()])
  return list.map((a) => ({
    ...a,
    c: a.violation ? mapCase(a.violation, types, [a]) : null,
    vehicle: a.vehicle ? mapVehicle({ ...a.vehicle, user_id: a.user_id }) : null,
  }))
}
