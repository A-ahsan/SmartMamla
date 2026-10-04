// Officer SMS alerts for Omni-Eye videos.
//
// When Omni-Eye finishes sending the reports of one video, it calls POST /api/ai/alerts/video
// (server/ai.js). The officers whose area matches the camera location then get ONE SMS that
// summarises every violation found in that video. Nothing is filed; it is a heads-up so the
// officers on the ground know to open the AI reports queue.
//
// Who counts as "in the area"
//   An officer's area is profiles.area (free text, several places separated by commas, e.g.
//   "Rampura, Badda") with profiles.station as a fallback. A place matches the camera location
//   when every word of the place appears in the location, or every word of the location appears
//   in the place. Generic words (footbridge, traffic, division, Dhaka, ...) are ignored, so
//   "Tejgaon Traffic Division" matches "Tejgaon footbridge". "*" or "all" matches every location.
//   The officer also needs a phone number and profiles.sms_alerts not set to false.
//
// This file is pure logic (no Express, no Supabase) so it can be unit-tested; ai.js wires it up.

const STOP_WORDS = new Set([
  'footbridge', 'foot', 'bridge', 'overbridge', 'over', 'flyover', 'traffic', 'division', 'div', 'police', 'station',
  'thana', 'zone', 'area', 'road', 'rd', 'street', 'st', 'avenue', 'ave', 'mor', 'more', 'circle', 'intersection',
  'crossing', 'signal', 'point', 'camera', 'cam', 'dhaka', 'bangladesh', 'north', 'south', 'east', 'west', 'the',
  'of', 'and', 'at', 'near', 'metro', 'metropolitan', 'dmp',
])

/** "Rampura footbridge, Dhaka" → ["rampura"]. Keeps letters and digits in any script. */
export function areaTokens(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !STOP_WORDS.has(w))
}

const sameWord = (a, b) => {
  if (a === b) return true
  // "rampura" ~ "rampuras", "hatirjheel" ~ "hatirjhil" is NOT matched: only prefix, both at least 5 letters
  if (/\d/.test(a) || /\d/.test(b)) return false
  return a.length >= 5 && b.length >= 5 && (a.startsWith(b) || b.startsWith(a))
}
const covers = (big, small) => small.every((w) => big.some((x) => sameWord(x, w)))

/** True when one of the officer's places (profiles.area, then profiles.station) names the camera location. */
export function officerMatchesLocation(officer, location) {
  const loc = areaTokens(location)
  if (!loc.length) return false
  const places = []
  for (const raw of String(officer?.area || '').split(/[,;/|\n]+/)) {
    const p = raw.trim()
    if (!p) continue
    if (p === '*' || /^(all|everywhere|সব)$/i.test(p)) return true
    places.push(p)
  }
  if (officer?.station) places.push(officer.station)
  if (officer?.station_bn) places.push(officer.station_bn)
  return places.some((p) => {
    const t = areaTokens(p)
    return t.length > 0 && (covers(loc, t) || covers(t, loc))
  })
}

/* ───────────── message ───────────── */

// Short names so the SMS stays within two segments. Plain ASCII: one Unicode character would
// switch the whole message to 70-character segments.
const SHORT = {
  helmet_violation: 'No helmet',
  '3_person_violation': '3+ riders',
  footpath_violation: 'Footpath riding',
  wrong_side_violation: 'Wrong side',
}
const ORDER = Object.keys(SHORT)

const bdTime = (d) => {
  if (!d) return ''
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    })
      .formatToParts(x)
      .map((q) => [q.type, q.value])
  )
  return `${p.day}/${p.month}/${p.year} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`
}

const shortName = (name, max = 28) => {
  const n = String(name || '').trim()
  return n.length <= max ? n : n.slice(0, max - 1) + '~'
}

/** Counts per Omni-Eye class, how many had a readable plate, and the earliest detection time. */
export function summariseReports(reports) {
  const counts = {}
  let plates = 0
  let first = null
  for (const r of reports) {
    counts[r.violation_class] = (counts[r.violation_class] || 0) + 1
    if (r.has_plate) plates++
    const t = r.detected_at ? new Date(r.detected_at).getTime() : NaN
    if (!Number.isNaN(t) && (first === null || t < first)) first = t
  }
  return { total: reports.length, counts, plates, first: first === null ? null : new Date(first).toISOString() }
}

/** The SMS. `video` and `duration_s` are accepted for compatibility but not shown. */
export function videoSummaryMessage({ location, summary, site }) {
  const { total, counts, plates, first } = summary
  const lines = [`${total} traffic violation${total === 1 ? '' : 's'} detected at ${shortName(location, 40) || 'unknown location'}`]
  const when = bdTime(first)
  if (when) lines.push(`Time: ${when}`)
  const parts = ORDER.filter((k) => counts[k]).map((k) => `${SHORT[k]} ${counts[k]}`)
  for (const k of Object.keys(counts)) if (!SHORT[k]) parts.push(`${k.replace(/_/g, ' ')} ${counts[k]}`)
  if (parts.length) lines.push(parts.join(', '))
  lines.push(`Plate visible: ${plates}/${total}`)
  lines.push('Please go to the location and respond.')
  if (site) lines.push(`Evidence: ${site}`)
  return lines.join('\n')
}

/* ───────────── orchestration ───────────── */

const mask = (phone) => String(phone || '').replace(/\d(?=\d{4})/g, '*')
const publicOfficer = (o) => ({ id: o.id, name: o.name, badge: o.badge || null, area: o.area || null, station: o.station || null, phone: mask(o.phone) })

/**
 * Text the officers of a camera's area about one processed video.
 *
 *   reports      every stored report (the list from the store; matching entries are marked in place)
 *   job_id/node  identify the video (Omni-Eye sends them on each report)
 *   location     camera location typed in the Omni-Eye dashboard (falls back to the reports' own)
 *   video        file name, duration_s: accepted from the node, kept for the response, not shown in the SMS
 *   findOfficers async () → [{ id, name, badge, phone, station, area, sms_alerts }]
 *   send         async (phone, message) → { success, to?, message?, skipped? }   (sms.js sendSMS)
 *
 * Returns { ok, sent, failed, officers, message, location, total, changed } or { ok, skipped, ... }.
 * `changed: true` tells the store to persist (reports get `area_alert`). A video is texted once:
 * resending its reports does not text anyone again, but a video with no matching officer or with SMS
 * unconfigured is NOT marked, so fixing that and pressing "Send again" in Omni-Eye works.
 */
export async function alertOfficersForVideo({ reports, job_id, node, location, video, duration_s, site, findOfficers, send, now = () => new Date() }) {
  const jobId = String(job_id || '')
  if (!jobId) return { ok: false, error: 'job_id is required' }
  const mine = reports.filter((r) => r.job_id === jobId && (!node || !r.node || r.node === node))
  if (!mine.length) return { ok: true, skipped: 'no_reports', total: 0, location: location || '' }

  const loc = String(location || mine[0].location || mine[0].camera || '').trim()
  const already = mine.find((r) => r.area_alert)
  if (already && mine.every((r) => r.area_alert)) {
    return { ok: true, skipped: 'already_sent', total: mine.length, location: loc, at: already.area_alert.at, officers: already.area_alert.officers || [] }
  }

  let officers
  try {
    officers = (await findOfficers()) || []
  } catch (e) {
    return { ok: false, error: e.message || 'Could not load officers', total: mine.length, location: loc }
  }
  const matched = officers.filter((o) => o.sms_alerts !== false && officerMatchesLocation(o, loc))
  const withPhone = matched.filter((o) => String(o.phone || '').trim())
  if (!withPhone.length) {
    return {
      ok: true, skipped: 'no_officers', total: mine.length, location: loc,
      officers: matched.map((o) => ({ ...publicOfficer(o), success: false, error: 'No phone number on file' })),
    }
  }

  const summary = summariseReports(mine)
  const message = videoSummaryMessage({ location: loc, summary, site })

  const results = []
  for (const o of withPhone) {
    let r
    try {
      r = await send(o.phone, message)
    } catch (e) {
      r = { success: false, message: e.message }
    }
    if (r?.skipped) {
      return { ok: false, skipped: 'sms_not_configured', error: r.message, total: mine.length, location: loc, officers: withPhone.map(publicOfficer), message }
    }
    results.push({ ...publicOfficer(o), success: Boolean(r?.success), error: r?.success ? null : r?.message || 'SMS failed' })
  }
  const sent = results.filter((r) => r.success)
  if (sent.length) {
    const at = now().toISOString()
    const officersBrief = sent.map((r) => ({ id: r.id, name: r.name, badge: r.badge }))
    for (const r of mine) r.area_alert = { at, location: loc, officers: officersBrief }
  }
  return {
    ok: sent.length > 0, sent: sent.length, failed: results.length - sent.length, officers: results, message, location: loc,
    total: mine.length, summary, changed: sent.length > 0,
    ...(sent.length ? {} : { error: results[0]?.error || 'SMS failed' }),
  }
}
