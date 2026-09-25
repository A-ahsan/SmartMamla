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
// Reports are kept in server/ai_data/reports.json and server/ai_data/evidence/*.jpg.

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
const DATA_DIR = process.env.AI_DATA_DIR || path.join(__dirname, 'ai_data')
const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence')
const STORE = path.join(DATA_DIR, 'reports.json')
fs.mkdirSync(EVIDENCE_DIR, { recursive: true })

const INGEST_KEY = process.env.OMNIEYE_INGEST_KEY || 'omnieye-dev-key'
if (!process.env.OMNIEYE_INGEST_KEY)
  console.warn('⚠ SmartMamla AI: OMNIEYE_INGEST_KEY not set, using the development key "omnieye-dev-key"')
const ALLOW_DEMO = process.env.AI_ALLOW_DEMO !== 'false'

// Same public project the frontend uses (see src/lib/supabase.js). Only used to verify police sign-ins.
const SB_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tcqatmkqmvaseakicqkr.supabase.co'
const SB_ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcWF0bWtxbXZhc2Vha2ljcWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzYyNTgsImV4cCI6MjA3OTY1MjI1OH0.I0ja_FAds6VBLu5OxZvyMR1LhQf-EPp77goGaYvrTgY'
const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

/* ───────────── store ───────────── */
let reports = []
try {
  reports = JSON.parse(fs.readFileSync(STORE, 'utf8'))
} catch {
  reports = []
}
let saveTimer = null
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const tmp = STORE + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(reports, null, 1))
    fs.renameSync(tmp, STORE)
  }, 150)
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

function saveImage(data, tag) {
  if (!data || typeof data !== 'string') return null
  const b64 = data.replace(/^data:image\/\w+;base64,/, '')
  const buf = Buffer.from(b64, 'base64')
  if (buf.length < 100 || buf.length > 8e6) return null
  const name = `${crypto.randomBytes(12).toString('hex')}_${tag}.jpg`
  fs.writeFileSync(path.join(EVIDENCE_DIR, name), buf)
  return name
}

const ingestAuth = (req, res, next) => {
  if (req.get('x-omnieye-key') === INGEST_KEY) return next()
  res.status(401).json({ error: 'Bad or missing x-omnieye-key' })
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

/* ───────────── routes ───────────── */
const ai = express.Router()
ai.use(cors({ origin: true, credentials: true }))
ai.use(express.json({ limit: '25mb' }))

ai.get('/health', ingestAuth, (_req, res) =>
  res.json({ ok: true, reports: reports.length, pending: reports.filter((r) => r.status === 'pending').length })
)

ai.post('/reports', ingestAuth, (req, res) => {
  try {
    const b = req.body || {}
    const cls = AI_CLASSES[b.violation_class]
    if (!cls) return res.status(400).json({ error: `Unknown violation_class ${b.violation_class}` })
    const key = String(b.report_key || '')
    const existing = key && reports.find((r) => r.report_key === key)
    if (existing) return res.json({ ok: true, id: existing.id, duplicate: true })

    const id = `AI-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
    const images = {
      frame: saveImage(b.images?.frame, 'frame'),
      crop: saveImage(b.images?.crop, 'crop'),
      plate: saveImage(b.images?.plate, 'plate'),
    }
    const report = {
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
    }
    reports.push(report)
    persist()
    res.status(201).json({ ok: true, id })
  } catch (e) {
    console.error('ai ingest', e)
    res.status(500).json({ error: 'Server error' })
  }
})

ai.get('/reports', policeAuth, (req, res) => {
  const status = req.query.status
  const list = reports
    .filter((r) => !status || status === 'all' || r.status === status)
    .sort((a, b) => new Date(b.detected_at) - new Date(a.detected_at))
  res.json(list.map(publicReport))
})

ai.get('/summary', policeAuth, (_req, res) => {
  const today = new Date().toDateString()
  const pending = reports.filter((r) => r.status === 'pending')
  const byClass = {}
  const byCamera = {}
  for (const r of reports) {
    if (new Date(r.detected_at).toDateString() !== today && new Date(r.received_at).toDateString() !== today) continue
    byClass[r.violation_class] = (byClass[r.violation_class] || 0) + 1
    byCamera[r.location || r.camera] = (byCamera[r.location || r.camera] || 0) + 1
  }
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
})

ai.post('/reports/:id/review', policeAuth, (req, res) => {
  const r = reports.find((x) => x.id === req.params.id)
  if (!r) return res.status(404).json({ error: 'Report not found' })
  const action = req.body?.action
  if (!['filed', 'dismissed', 'pending'].includes(action)) return res.status(400).json({ error: 'Bad action' })
  r.status = action
  r.reviewed_at = action === 'pending' ? null : new Date().toISOString()
  r.reviewed_by = action === 'pending' ? null : req.officer
  r.case_number = action === 'filed' ? String(req.body.case_number || '') || null : null
  r.plate = req.body.plate ? String(req.body.plate).toUpperCase().trim() : r.plate
  r.dismiss_reason = action === 'dismissed' ? String(req.body.reason || '') || null : null
  persist()
  res.json(publicReport(r))
})

ai.get('/evidence/:file', (req, res) => {
  const f = req.params.file
  if (!/^[a-f0-9]{24}_(frame|crop|plate)\.jpg$/.test(f)) return res.status(404).end()
  const p = path.join(EVIDENCE_DIR, f)
  if (!fs.existsSync(p)) return res.status(404).end()
  res.set('Cache-Control', 'private, max-age=86400')
  res.sendFile(p)
})

export default ai
