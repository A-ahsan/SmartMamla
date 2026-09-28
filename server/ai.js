// SmartMamla ← Omni-Eye bridge
//
// Omni-Eye (the video-processing node) POSTs one report per detected violation, with evidence
// images. Police see them on the "AI reports" page, confirm the plate, and file a mamla through
// the normal flow — or dismiss the report as a false alarm. Nothing is filed automatically.
//
//   POST /api/ai/reports                (Omni-Eye, header  x-omnieye-key: <OMNIEYE_INGEST_KEY>)
//   GET  /api/ai/health                 (Omni-Eye connection check, same key)
//   GET  /api/ai/reports?status=pending (police)
//   GET  /api/ai/summary                (police — counts + latest, for the Traffic page)
//   POST /api/ai/reports/:id/review     (police — { action: 'filed' | 'dismissed' | 'pending', case_number?, plate? })
//   GET  /api/ai/evidence/:file         (evidence JPEGs; file names are random and unguessable)
//
// Storage
//  • Supabase Storage (used on Render/Vercel, or whenever SUPABASE_SERVICE_ROLE_KEY is set): a private bucket
//    "omnieye-reports" holding reports.json + evidence/*.jpg. The bucket is created on first use.
//    No database tables are touched.
//  • Local files (dev without a service key): server/ai_data/reports.json + server/ai_data/evidence/*.jpg.
//  Force one with AI_STORE=supabase | file.

import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// ES imports run before app.js calls dotenv, so read the same .env files here.
dotenv.config({ path: path.join(__dirname, '..', '.env') })
dotenv.config({ path: path.join(__dirname, '.env') })
// Running on a host (Render sets RENDER=true, Vercel sets VERCEL=1) rather than on a laptop
const DEPLOYED = Boolean(process.env.RENDER || process.env.VERCEL || process.env.NODE_ENV === 'production')
// The development key is public (it's in the repo), so a deployed server only accepts a key it was given.
const INGEST_KEY = process.env.OMNIEYE_INGEST_KEY || (DEPLOYED ? null : 'omnieye-dev-key')
if (!process.env.OMNIEYE_INGEST_KEY)
  console.warn(
    DEPLOYED
      ? '⚠ SmartMamla AI: OMNIEYE_INGEST_KEY is not set, so Omni-Eye reports are refused. Add it to the server environment (Render → Environment).'
      : '⚠ SmartMamla AI: OMNIEYE_INGEST_KEY not set, using the development key "omnieye-dev-key"'
  )
// "x-demo: 1" lets the demo build use the police pages without a Supabase login — never on a deployed server
// unless AI_ALLOW_DEMO=true.
const ALLOW_DEMO = process.env.AI_ALLOW_DEMO ? process.env.AI_ALLOW_DEMO !== 'false' : !DEPLOYED

// Same public project the frontend uses (see src/lib/supabase.js). Only used to verify police sign-ins.
const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tcqatmkqmvaseakicqkr.supabase.co'
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcWF0bWtxbXZhc2Vha2ljcWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzYyNTgsImV4cCI6MjA3OTY1MjI1OH0.I0ja_FAds6VBLu5OxZvyMR1LhQf-EPp77goGaYvrTgY'
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

/* ───────────── store ───────────── */
const STORE_KIND = process.env.AI_STORE || (SB_SERVICE || DEPLOYED ? 'supabase' : 'file')
const BUCKET = process.env.AI_BUCKET || 'omnieye-reports'

// Local files — for `npm run dev` without a service key. (Render's free disk is wiped on every restart.) Kept in memory, written back shortly after changes.
function fileStore() {
  const DATA_DIR = process.env.AI_DATA_DIR || path.join(__dirname, 'ai_data')
  const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence')
  const STORE = path.join(DATA_DIR, 'reports.json')
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
  let reports = []
  try {
    reports = JSON.parse(fs.readFileSync(STORE, 'utf8'))
  } catch {
    reports = []
  }
  let timer = null
  return {
    kind: 'file',
    async load() {
      return reports
    },
    async save(list) {
      reports = list
      clearTimeout(timer)
      timer = setTimeout(() => {
        fs.writeFileSync(STORE + '.tmp', JSON.stringify(reports, null, 1))
        fs.renameSync(STORE + '.tmp', STORE)
      }, 150)
    },
    async putImage(name, buf) {
      fs.writeFileSync(path.join(EVIDENCE_DIR, name), buf)
    },
    async sendImage(name, res) {
      const p = path.join(EVIDENCE_DIR, name)
      if (!fs.existsSync(p)) return res.status(404).end()
      res.set('Cache-Control', 'private, max-age=86400')
      res.sendFile(p)
    },
  }
}

// Supabase Storage — Render (free) and Vercel have no persistent disk, so everything lives in a private bucket.
function supabaseStore() {
  if (!SB_SERVICE) {
    const err = new Error('SUPABASE_SERVICE_ROLE_KEY is not set on the Smart Mamla server, so AI reports cannot be stored.')
    const fail = async () => {
      throw err
    }
    return { kind: 'supabase', error: err.message, load: fail, save: fail, putImage: fail, sendImage: fail }
  }
  const sb = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })
  const bucket = () => sb.storage.from(BUCKET)
  let ready = null
  const ensureBucket = () =>
    (ready ||= (async () => {
      const { data } = await sb.storage.getBucket(BUCKET)
      if (data) return
      const { error } = await sb.storage.createBucket(BUCKET, { public: false })
      if (error && !/exist/i.test(error.message)) throw error
    })().catch((e) => {
      ready = null
      throw e
    }))
  const signed = new Map() // file → { url, until }
  return {
    kind: 'supabase',
    async load() {
      await ensureBucket()
      const { data, error } = await bucket().download('reports.json', { cacheNonce: Date.now() })
      if (error) {
        const status = error.status || error.statusCode || error.originalError?.status
        const msg = `${error.message} ${error.error || ''} ${status || ''}`
        if (String(status) === '404' || /not.?found/i.test(msg)) return [] // first report ever
        throw error // never treat a failed read as "no reports" — a save would wipe the index
      }
      return JSON.parse(await data.text())
    },
    async save(list) {
      const { error } = await bucket().upload('reports.json', Buffer.from(JSON.stringify(list)), {
        upsert: true,
        contentType: 'application/json',
        cacheControl: '0',
      })
      if (error) throw error
    },
    async putImage(name, buf) {
      await ensureBucket()
      const { error } = await bucket().upload(`evidence/${name}`, buf, { contentType: 'image/jpeg', cacheControl: '86400' })
      if (error) throw error
    },
    async sendImage(name, res) {
      let hit = signed.get(name)
      if (!hit || hit.until < Date.now()) {
        const { data, error } = await bucket().createSignedUrl(`evidence/${name}`, 3600)
        if (error || !data?.signedUrl) return res.status(404).end()
        hit = { url: data.signedUrl, until: Date.now() + 50 * 60_000 }
        signed.set(name, hit)
      }
      res.set('Cache-Control', 'private, max-age=1800')
      res.redirect(302, hit.url)
    },
  }
}

const store = STORE_KIND === 'supabase' ? supabaseStore() : fileStore()
console.log(`SmartMamla AI: reports stored in ${store.kind === 'supabase' ? `Supabase Storage bucket "${BUCKET}"` : 'server/ai_data'}`)

// One read-modify-write at a time (per server instance). Omni-Eye sends its reports one after another.
let chain = Promise.resolve()
function withStore(fn) {
  const run = chain.then(async () => {
    const list = await store.load()
    const out = await fn(list)
    if (out?.changed) await store.save(list)
    return out
  })
  chain = run.catch(() => {})
  return run
}

/* ───────────── violation catalogue (Omni-Eye classes → SmartMamla) ─────────────
   `codes` / `match` let the police UI pick the right entry from violation_types,
   whatever codes the live database uses. */
export const AI_CLASSES = {
  helmet_violation: {
    en: 'Riding without helmet',
    bn: 'হেলমেট ছাড়া চালানো',
    codes: ['NO_HELMET', 'HELMET'],
    match: 'helmet|হেলমেট',
    severity: 'minor',
  },
  '3_person_violation': {
    en: 'Three or more riders',
    bn: 'মোটরসাইকেলে তিন বা ততোধিক আরোহী',
    codes: ['TRIPLE_RIDING', 'OVERLOAD', 'EXTRA_PASSENGER'],
    match: 'triple|passenger|overload|যাত্রী|আরোহী',
    severity: 'moderate',
  },
  footpath_violation: {
    en: 'Riding on the footpath',
    bn: 'ফুটপাথে যান চালানো',
    codes: ['FOOTPATH', 'FOOTPATH_DRIVING', 'SIDEWALK'],
    match: 'footpath|sidewalk|pavement|ফুটপাত|ফুটপাথ',
    severity: 'moderate',
  },
  wrong_side_violation: {
    en: 'Wrong-side driving',
    bn: 'উল্টো পথে চালানো',
    codes: ['WRONG_SIDE', 'WRONG_WAY'],
    match: 'wrong|উল্টো',
    severity: 'severe',
  },
}

/* ───────────── helpers ───────────── */
const publicReport = (r) => ({
  ...r,
  images: Object.fromEntries(Object.entries(r.images || {}).map(([k, f]) => [k, f ? `/api/ai/evidence/${f}` : null])),
})

async function saveImage(data, tag) {
  if (!data || typeof data !== 'string') return null
  const b64 = data.replace(/^data:image\/\w+;base64,/, '')
  const buf = Buffer.from(b64, 'base64')
  if (buf.length < 100 || buf.length > 8e6) return null
  const name = `${crypto.randomBytes(12).toString('hex')}_${tag}.jpg`
  await store.putImage(name, buf)
  return name
}

const fail = (res, where) => (e) => {
  console.error(`ai ${where}`, e)
  res.status(500).json({ error: store.error || e.message || 'Server error' })
}

const ingestAuth = (req, res, next) => {
  if (!INGEST_KEY) return res.status(401).json({ error: 'OMNIEYE_INGEST_KEY is not set on the Smart Mamla server' })
  const got = Buffer.from(String(req.get('x-omnieye-key') || ''))
  const want = Buffer.from(INGEST_KEY)
  if (got.length === want.length && crypto.timingSafeEqual(got, want)) return next()
  res.status(401).json({ error: 'Bad or missing x-omnieye-key (it must match OMNIEYE_INGEST_KEY on the Smart Mamla server)' })
}

// token → { id, name, badge } for 60 s
const tokenCache = new Map()
async function policeFromToken(token) {
  const hit = tokenCache.get(token)
  if (hit && hit.until > Date.now()) return hit.officer
  const anon = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user) return null
  const reader = SB_SERVICE
    ? createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } })
    : createClient(SB_URL, SB_ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: p } = await reader.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  if (!p || !['police', 'admin'].includes(p.role)) return null
  const officer = { id: p.id, name: p.full_name || p.email, badge: p.badge_number || p.email }
  tokenCache.set(token, { officer, until: Date.now() + 60_000 })
  return officer
}

async function policeAuth(req, res, next) {
  try {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (token) {
      const officer = await policeFromToken(token)
      if (officer) {
        req.officer = officer
        return next()
      }
      return res.status(403).json({ error: 'Police only' })
    }
    if (ALLOW_DEMO && req.get('x-demo') === '1') {
      req.officer = { id: 'demo', name: req.get('x-demo-officer') || 'Demo officer', badge: 'DEMO' }
      return next()
    }
    res.status(401).json({ error: 'Not signed in' })
  } catch (e) {
    console.error('ai auth', e)
    res.status(500).json({ error: 'Auth check failed' })
  }
}


/* ───────────── evidence → case ─────────────
   When an officer files a mamla from an AI report, the report's snapshots are attached to the
   case (traffic_violations.evidence_images) so the driver sees them in their dashboard. */
const caseDb = SB_SERVICE ? createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } }) : null
const PUBLIC_API = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '')

async function attachEvidence(r) {
  if (!caseDb || !r?.case_number) return false
  const evidence = ['frame', 'crop', 'plate']
    .filter((k) => r.images?.[k])
    .map((k) => ({ kind: k, url: `/api/ai/evidence/${r.images[k]}` }))
  if (!evidence.length) return false
  const { error } = await caseDb
    .from('traffic_violations')
    .update({
      evidence_images: evidence,
      source: 'ai',
      ai_report_id: r.id,
      // BRTA Extended shows photo_evidence_url, so give it the main frame as an absolute link
      ...(PUBLIC_API ? { photo_evidence_url: `${PUBLIC_API}${evidence[0].url}` } : {}),
    })
    .eq('violation_number', r.case_number)
  if (error) console.error('ai evidence attach', r.case_number, error.message)
  return !error
}

// Once per start: attach evidence to cases filed before this feature existed (idempotent)
setTimeout(async () => {
  if (!caseDb) return
  try {
    const reports = await store.load()
    const filed = reports.filter((x) => x.status === 'filed' && x.case_number)
    if (!filed.length) return
    const { data } = await caseDb
      .from('traffic_violations')
      .select('violation_number, evidence_images')
      .in('violation_number', filed.map((x) => x.case_number))
    const missing = filed.filter((x) => {
      const row = data?.find((d) => d.violation_number === x.case_number)
      return row && !(row.evidence_images || []).length
    })
    for (const r of missing) await attachEvidence(r)
    if (missing.length) console.log(`SmartMamla AI: attached evidence to ${missing.length} earlier case(s)`)
  } catch (e) {
    console.warn('ai evidence backfill skipped:', e.message)
  }
}, 5000)

/* ───────────── routes ───────────── */
const ai = express.Router()
ai.use(cors({ origin: true, credentials: true }))
ai.use(express.json({ limit: '25mb' }))

ai.get('/health', ingestAuth, async (_req, res) => {
  try {
    const reports = await store.load()
    res.json({ ok: true, store: store.kind, reports: reports.length, pending: reports.filter((r) => r.status === 'pending').length })
  } catch (e) {
    res.status(503).json({ ok: false, store: store.kind, error: store.error || e.message })
  }
})

ai.post('/reports', ingestAuth, async (req, res) => {
  try {
    const b = req.body || {}
    const cls = AI_CLASSES[b.violation_class]
    if (!cls) return res.status(400).json({ error: `Unknown violation_class ${b.violation_class}` })
    const key = String(b.report_key || '')

    // cheap duplicate check before uploading any images (Omni-Eye re-sends are common)
    const before = await store.load()
    const dup = key && before.find((r) => r.report_key === key)
    if (dup) return res.json({ ok: true, id: dup.id, duplicate: true })

    const [frame, crop, plate] = await Promise.all([
      saveImage(b.images?.frame, 'frame'),
      saveImage(b.images?.crop, 'crop'),
      saveImage(b.images?.plate, 'plate'),
    ])
    const images = { frame, crop, plate }

    const out = await withStore((reports) => {
      const existing = key && reports.find((r) => r.report_key === key)
      if (existing) return { id: existing.id, duplicate: true }
      const id = `AI-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      reports.push({
        id,
        report_key: key || id,
        status: 'pending',
        violation_class: b.violation_class,
        violation_en: cls.en,
        violation_bn: cls.bn,
        violation_codes: cls.codes,
        violation_match: cls.match,
        severity: cls.severity,
        confidence: Number(b.confidence) || null,
        mean_confidence: Number(b.mean_confidence) || null,
        frames: Number(b.frames) || null,
        duration_s: Number(b.duration_s) || null,
        detected_at: b.detected_at || new Date().toISOString(),
        video_time_s: Number(b.video_time_s) || 0,
        camera: String(b.camera || 'Camera'),
        location: String(b.location || b.camera || ''),
        location_bn: String(b.location_bn || b.location || b.camera || ''),
        node: String(b.node || 'omni-eye'),
        model: String(b.model || ''),
        video: String(b.video || ''),
        job_id: String(b.job_id || ''),
        has_plate: Boolean(images.plate),
        plate_confidence: Number(b.plate_confidence) || null,
        images,
        received_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        case_number: null,
        plate: null,
      })
      return { id, changed: true }
    })
    res.status(out.duplicate ? 200 : 201).json({ ok: true, id: out.id, duplicate: Boolean(out.duplicate) })
  } catch (e) {
    fail(res, 'ingest')(e)
  }
})

ai.get('/reports', policeAuth, async (req, res) => {
  try {
    const status = req.query.status
    const list = (await store.load())
      .filter((r) => !status || status === 'all' || r.status === status)
      .sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))
    res.set('Cache-Control', 'no-store')
    res.json(list.map(publicReport))
  } catch (e) {
    fail(res, 'list')(e)
  }
})

ai.get('/summary', policeAuth, async (_req, res) => {
  try {
    const reports = await store.load()
    // "today" in Bangladesh time, whatever timezone the server runs in (Render runs in UTC)
    const bdDay = (d) => new Date(new Date(d).getTime() + 6 * 3600_000).toISOString().slice(0, 10)
    const today = bdDay(Date.now())
    const pending = reports.filter((r) => r.status === 'pending')
    const byClass = {}
    const byCamera = {}
    for (const r of reports) {
      if (bdDay(r.detected_at) !== today && bdDay(r.received_at) !== today) continue
      byClass[r.violation_class] = (byClass[r.violation_class] || 0) + 1
      byCamera[r.location || r.camera] = (byCamera[r.location || r.camera] || 0) + 1
    }
    res.set('Cache-Control', 'no-store')
    res.json({
      total: reports.length,
      pending: pending.length,
      filed: reports.filter((r) => r.status === 'filed').length,
      dismissed: reports.filter((r) => r.status === 'dismissed').length,
      today: Object.values(byClass).reduce((a, b) => a + b, 0),
      by_class: byClass,
      by_camera: byCamera,
      latest: pending
        .sort((a, b) => new Date(b.received_at) - new Date(a.received_at))
        .slice(0, 4)
        .map(publicReport),
    })
  } catch (e) {
    fail(res, 'summary')(e)
  }
})

ai.post('/reports/:id/review', policeAuth, async (req, res) => {
  try {
    const action = req.body?.action
    if (!['filed', 'dismissed', 'pending'].includes(action)) return res.status(400).json({ error: 'Bad action' })
    const out = await withStore((reports) => {
      const r = reports.find((x) => x.id === req.params.id)
      if (!r) return { missing: true }
      r.status = action
      r.reviewed_at = action === 'pending' ? null : new Date().toISOString()
      r.reviewed_by = action === 'pending' ? null : req.officer
      r.case_number = action === 'filed' ? String(req.body.case_number || '') || null : null
      r.plate = req.body.plate ? String(req.body.plate).toUpperCase().trim() : r.plate
      r.dismiss_reason = action === 'dismissed' ? String(req.body.reason || '') || null : null
      return { report: r, changed: true }
    })
    if (out.missing) return res.status(404).json({ error: 'Report not found' })
    if (action === 'filed') await attachEvidence(out.report)
    res.json(publicReport(out.report))
  } catch (e) {
    fail(res, 'review')(e)
  }
})

ai.get('/evidence/:file', async (req, res) => {
  const f = req.params.file
  if (!/^[a-f0-9]{24}_(frame|crop|plate)\.jpg$/.test(f)) return res.status(404).end()
  try {
    await store.sendImage(f, res)
  } catch (e) {
    console.error('ai evidence', e)
    res.status(404).end()
  }
})

export default ai
