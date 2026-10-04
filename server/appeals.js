// SmartMamla appeals — a driver may contest an AI-camera fine ONCE; police review it; the driver gets an SMS.
//
//   POST /api/appeals                 (driver)  { case_id, reason }
//   GET  /api/appeals?status=pending  (police)  pending | accepted | rejected | all
//   GET  /api/appeals/count           (police)  { pending }
//   POST /api/appeals/:id/review      (police)  { decision: 'accepted' | 'rejected', note }
//
// What happens to the case (traffic_violations.status, same values BRTA Extended already uses):
//   appeal sent      → 'appealed'  (cannot be paid while police are deciding)
//   appeal accepted  → 'waived'    (fine removed)
//   appeal rejected  → 'active'    (fine stands; at least 7 more days to pay)
//
// All writes happen here with the service role: the browser can only READ violation_appeals (RLS),
// so "appeal only once" and "only police decide" cannot be bypassed.

import { sendSMS } from './sms.js'

const REASON_MIN = 10
const REASON_MAX = 1000
const EXTRA_DAYS_AFTER_REJECT = 7

const bdDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : 'N/A')
const amountOf = (v) => Number(v.total_amount ?? v.fine_amount)

export const appealAcceptedMessage = (v) =>
  `SmartMamla Appeal Result\n` +
  `Case: ${v.violation_number}\n` +
  `Your appeal was ACCEPTED. The fine of ${amountOf(v)} BDT has been removed.\n` +
  `No payment is needed.`

export const appealRejectedMessage = (v, site) =>
  `SmartMamla Appeal Result\n` +
  `Case: ${v.violation_number}\n` +
  `Your appeal was NOT accepted. The fine of ${amountOf(v)} BDT still stands.\n` +
  `Pay by: ${bdDate(v.due_date)}\n` +
  `Pay online: ${site}`

export function mountAppeals(api, { db, authUser, phoneOf, site }) {
  async function police(req, res) {
    const user = await authUser(req)
    if (!user) {
      res.status(401).json({ error: 'Not signed in' })
      return null
    }
    const { data: p } = await db.from('profiles').select('id, role, full_name, email').eq('id', user.id).maybeSingle()
    if (!['police', 'admin'].includes(p?.role)) {
      res.status(403).json({ error: 'Police only' })
      return null
    }
    return p
  }

  /* ───────────── driver: send an appeal ───────────── */
  api.post('/appeals', async (req, res) => {
    try {
      const user = await authUser(req)
      if (!user) return res.status(401).json({ error: 'Not signed in' })

      const reason = String(req.body?.reason || '').trim()
      if (reason.length < REASON_MIN) return res.status(400).json({ error: `Please explain your reason (at least ${REASON_MIN} characters).`, code: 'reason_short' })
      if (reason.length > REASON_MAX) return res.status(400).json({ error: `Reason is too long (max ${REASON_MAX} characters).`, code: 'reason_long' })

      const { data: v } = await db.from('traffic_violations').select('*').eq('id', req.body?.case_id).maybeSingle()
      if (!v || v.user_id !== user.id) return res.status(404).json({ error: 'Case not found', code: 'not_found' })
      if (v.source !== 'ai') return res.status(400).json({ error: 'Only fines from AI camera reports can be appealed.', code: 'not_ai' })
      if (v.payment_status === 'paid') return res.status(400).json({ error: 'This fine is already paid.', code: 'paid' })

      const { data: existing } = await db.from('violation_appeals').select('id').eq('violation_id', v.id).maybeSingle()
      if (existing) return res.status(409).json({ error: 'You have already appealed this fine. Each fine can be appealed once.', code: 'already' })
      if (v.status !== 'active') return res.status(400).json({ error: 'This fine cannot be appealed.', code: 'closed' })

      const { data: appeal, error } = await db
        .from('violation_appeals')
        .insert({ violation_id: v.id, user_id: user.id, reason })
        .select()
        .single()
      if (error) {
        // unique(violation_id): two requests at once
        if (error.code === '23505') return res.status(409).json({ error: 'You have already appealed this fine.', code: 'already' })
        throw error
      }

      const { error: upErr } = await db.from('traffic_violations').update({ status: 'appealed' }).eq('id', v.id).eq('status', 'active')
      if (upErr) {
        await db.from('violation_appeals').delete().eq('id', appeal.id)
        throw upErr
      }
      res.status(201).json({ ok: true, appeal })
    } catch (e) {
      console.error('appeals submit', e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  /* ───────────── police: how many are waiting ───────────── */
  api.get('/appeals/count', async (req, res) => {
    try {
      if (!(await police(req, res))) return
      const { count, error } = await db.from('violation_appeals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      if (error) throw error
      res.set('Cache-Control', 'no-store')
      res.json({ pending: count || 0 })
    } catch (e) {
      console.error('appeals count', e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  /* ───────────── police: the queue ───────────── */
  api.get('/appeals', async (req, res) => {
    try {
      if (!(await police(req, res))) return
      const status = String(req.query.status || 'pending')
      let q = db.from('violation_appeals').select('*').order('created_at', { ascending: status === 'pending' }).limit(200)
      if (status !== 'all') q = q.eq('status', status)
      const { data: appeals, error } = await q
      if (error) throw error
      if (!appeals.length) return res.json([])

      const vIds = [...new Set(appeals.map((a) => a.violation_id))]
      const uIds = [...new Set(appeals.map((a) => a.user_id))]
      const [{ data: violations }, { data: people }, { data: licenses }] = await Promise.all([
        db.from('traffic_violations').select('*').in('id', vIds),
        db.from('profiles').select('id, full_name, phone').in('id', uIds),
        db.from('licenses').select('user_id, license_number, full_name_en, full_name_bn, photo_url').in('user_id', uIds),
      ])
      const rvIds = [...new Set((violations || []).map((v) => v.registered_vehicle_id).filter(Boolean))]
      const { data: vehicles } = rvIds.length
        ? await db.from('registered_vehicles').select('id, registration_number, registration_plate, vehicle_name, model, vehicle_type').in('id', rvIds)
        : { data: [] }

      res.set('Cache-Control', 'no-store')
      res.json(
        appeals.map((a) => {
          const v = (violations || []).find((x) => x.id === a.violation_id) || null
          return {
            ...a,
            violation: v,
            driver: (people || []).find((p) => p.id === a.user_id) || null,
            license: (licenses || []).find((l) => l.user_id === a.user_id) || null,
            vehicle: v ? (vehicles || []).find((x) => x.id === v.registered_vehicle_id) || null : null,
          }
        })
      )
    } catch (e) {
      console.error('appeals list', e)
      res.status(500).json({ error: 'Server error' })
    }
  })

  /* ───────────── police: decide ───────────── */
  api.post('/appeals/:id/review', async (req, res) => {
    try {
      const officer = await police(req, res)
      if (!officer) return

      const decision = req.body?.decision
      const note = String(req.body?.note || '').trim().slice(0, 500)
      if (!['accepted', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Bad decision' })
      if (decision === 'rejected' && note.length < 5)
        return res.status(400).json({ error: 'Please write a short reason for the driver.', code: 'note_required' })

      // Only a still-pending appeal can be decided (two officers pressing at once → the second gets 409)
      const now = new Date().toISOString()
      const { data: appeal, error } = await db
        .from('violation_appeals')
        .update({
          status: decision,
          review_note: note || null,
          reviewed_by: officer.id,
          reviewed_by_name: officer.full_name || officer.email,
          reviewed_at: now,
        })
        .eq('id', req.params.id)
        .eq('status', 'pending')
        .select()
        .maybeSingle()
      if (error) throw error
      if (!appeal) return res.status(409).json({ error: 'This appeal has already been reviewed.', code: 'already_reviewed' })

      const { data: before } = await db.from('traffic_violations').select('*').eq('id', appeal.violation_id).single()
      let patch
      if (decision === 'accepted') {
        patch = { status: 'waived', waived_reason: note || 'Appeal accepted', waived_by: officer.id, waived_at: now }
      } else {
        // fine stands: make sure the driver has at least a week left to pay
        const min = new Date(Date.now() + EXTRA_DAYS_AFTER_REJECT * 864e5).toISOString().slice(0, 10)
        patch = { status: 'active', ...(!before.due_date || String(before.due_date).slice(0, 10) < min ? { due_date: min } : {}) }
      }
      const { data: v, error: vErr } = await db.from('traffic_violations').update(patch).eq('id', appeal.violation_id).select().single()
      if (vErr) {
        // put the appeal back so it can be decided again
        await db
          .from('violation_appeals')
          .update({ status: 'pending', review_note: null, reviewed_by: null, reviewed_by_name: null, reviewed_at: null })
          .eq('id', appeal.id)
        throw vErr
      }

      // Tell the driver
      let sms = { success: false, error: 'Driver has no phone number on file' }
      const phone = await phoneOf(appeal.user_id)
      if (phone) {
        const r = await sendSMS(phone, decision === 'accepted' ? appealAcceptedMessage(v) : appealRejectedMessage(v, site))
        sms = r.success ? { success: true, to: r.to } : { success: false, error: r.message }
      }
      await db.from('violation_appeals').update({ sms_sent: sms.success }).eq('id', appeal.id)

      res.json({ ok: true, appeal: { ...appeal, sms_sent: sms.success }, sms })
    } catch (e) {
      console.error('appeals review', e)
      res.status(500).json({ error: 'Server error' })
    }
  })
}
