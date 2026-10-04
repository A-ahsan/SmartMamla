// Telegram evidence posts for Omni-Eye videos.
//
// One Telegram group (or channel) receives every processed video, whatever the location: the text
// summary (same wording as the officer SMS), a button to the AI reports queue, and an album with
// the evidence photo of every violation (crop of the violation, plus the plate crop when there is
// one). Officers in the group see the pictures straight away; the SMS stays as the plain-text
// fallback for those who are not on Telegram.
//
// Setup (once): create a bot with @BotFather, add it to the group, then on Render set
//   TELEGRAM_BOT_TOKEN = 123456:ABC...   (from BotFather)
//   TELEGRAM_CHAT_ID   = -100123456789   (GET /api/ai/telegram/chats lists the chats the bot can see)
// Bot API docs: https://core.telegram.org/bots/api
//
// Pure-ish module: every network call goes through `fetchImpl` so it can be unit-tested with a fake.

const env = (k) => (process.env[k] || '').trim().replace(/^['"]|['"]$/g, '').trim()
export const telegramConfigured = () => Boolean(env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID'))
const api = (method, token = env('TELEGRAM_BOT_TOKEN')) => `https://api.telegram.org/bot${token}/${method}`

const ALBUM_MAX = 10 // Telegram: 2–10 items per media group
const CAPTION_MAX = 1024
const SHORT = { helmet_violation: 'No helmet', '3_person_violation': '3+ riders', footpath_violation: 'Footpath riding', wrong_side_violation: 'Wrong side' }

const bdClock = (d) => {
  if (!d) return ''
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false }).format(x)
}

async function call(method, body, { fetchImpl = fetch, token } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  const r = await fetchImpl(api(method, token), {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  })
  const data = await r.json().catch(() => ({}))
  if (!data.ok) {
    const e = new Error(data.description || `Telegram HTTP ${r.status}`)
    e.code = data.error_code
    throw e
  }
  return data.result
}

/** Photos to post for one video: [{ name (evidence file), caption }] in detection order. */
export function evidencePhotos(reports) {
  const out = []
  const sorted = [...reports].sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at))
  sorted.forEach((r, i) => {
    const main = r.images?.crop || r.images?.frame
    if (!main) return
    const label = SHORT[r.violation_class] || r.violation_en || r.violation_class
    const pct = r.confidence ? ` ${Math.round(r.confidence * 100)}%` : ''
    const caption = `${i + 1}. ${label}${pct}${bdClock(r.detected_at) ? `, ${bdClock(r.detected_at)}` : ''}${r.images?.plate ? ', plate below' : ', no plate'}`
    out.push({ name: main, caption: caption.slice(0, CAPTION_MAX) })
    if (r.images?.plate) out.push({ name: r.images.plate, caption: `${i + 1}. plate` })
  })
  return out
}

/** Split into albums of 2–10 (Telegram rejects a media group of one, so a leftover single joins the previous album). */
export function chunkAlbums(items, max = ALBUM_MAX) {
  const chunks = []
  for (let i = 0; i < items.length; i += max) chunks.push(items.slice(i, i + max))
  if (chunks.length > 1 && chunks[chunks.length - 1].length === 1) {
    const last = chunks.pop()
    const prev = chunks[chunks.length - 1]
    if (prev.length < max) prev.push(last[0])
    else chunks.push([prev.pop(), last[0]])
  }
  return chunks
}

/**
 * Post one processed video to the Telegram group: text + button, then the evidence albums.
 *   message   the summary text (alerts.js videoSummaryMessage)
 *   reports   this video's reports (with .images file names)
 *   getImage  async (fileName) → Buffer | null   (from the store)
 *   site      review URL for the button
 * Returns { ok, photos, albums, chat } or throws with a readable message.
 */
export async function postVideoToTelegram({ message, reports, getImage, site, fetchImpl = fetch, chatId = env('TELEGRAM_CHAT_ID'), token }) {
  const opts = { fetchImpl, token }
  const sent = await call('sendMessage', {
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
    ...(site ? { reply_markup: { inline_keyboard: [[{ text: 'Open AI reports', url: site }]] } } : {}),
  }, opts)

  const wanted = evidencePhotos(reports)
  const items = []
  for (const p of wanted) {
    try {
      const buf = await getImage(p.name)
      if (buf && buf.length > 100) items.push({ ...p, buf })
    } catch (e) {
      console.warn('telegram: evidence image missing', p.name, e.message)
    }
  }

  let albums = 0
  if (items.length === 1) {
    const fd = new FormData()
    fd.append('chat_id', String(chatId))
    fd.append('caption', items[0].caption)
    fd.append('reply_to_message_id', String(sent.message_id))
    fd.append('photo', new Blob([items[0].buf], { type: 'image/jpeg' }), items[0].name)
    await call('sendPhoto', fd, opts)
    albums = 1
  } else if (items.length > 1) {
    for (const group of chunkAlbums(items)) {
      const fd = new FormData()
      fd.append('chat_id', String(chatId))
      fd.append('reply_to_message_id', String(sent.message_id))
      fd.append('media', JSON.stringify(group.map((it, i) => ({ type: 'photo', media: `attach://p${i}`, caption: it.caption }))))
      group.forEach((it, i) => fd.append(`p${i}`, new Blob([it.buf], { type: 'image/jpeg' }), it.name))
      await call('sendMediaGroup', fd, opts)
      albums++
      if (albums % 3 === 0) await new Promise((r) => setTimeout(r, 1500)) // stay under 20 messages/minute per group
    }
  }
  return { ok: true, photos: items.length, albums, chat: String(chatId), message_id: sent.message_id }
}

/** Chats the bot has seen recently (after being added to a group, or messaged). Helps find TELEGRAM_CHAT_ID. */
export async function listChats({ fetchImpl = fetch, token } = {}) {
  const updates = await call('getUpdates', { limit: 100, allowed_updates: ['message', 'channel_post', 'my_chat_member'] }, { fetchImpl, token })
  const chats = new Map()
  for (const u of updates) {
    const c = u.message?.chat || u.channel_post?.chat || u.my_chat_member?.chat
    if (c) chats.set(c.id, { id: c.id, type: c.type, title: c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || '' })
  }
  return [...chats.values()]
}

export async function botInfo({ fetchImpl = fetch, token } = {}) {
  const me = await call('getMe', {}, { fetchImpl, token })
  return { id: me.id, username: me.username, name: me.first_name }
}
