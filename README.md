# SmartMamla · স্মার্ট মামলা

A bilingual (বাংলা / English), mobile-first portal for **traffic cases (mamla)** in Bangladesh.

- **Police** scan a driving-licence QR code, or enter a licence or registration number. They see the driver's full record, including every fine and whether it is paid, and can file a new mamla on the spot.
- **Citizens** log in to see their licence, vehicles and cases, and pay fines online through **SSLCommerz**.

Built with React 18, Vite, Tailwind CSS, Framer Motion, Supabase and Express.

---

## 1. Run it (demo mode, no setup)

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no Supabase keys the app runs in **demo mode** on sample data stored in your browser:

| Portal  | Login              | Password   |
|---------|--------------------|------------|
| Citizen | `citizen@demo.bd`  | `demo1234` |
| Police  | `police@demo.bd` or badge `DMP-TR-4521` | `demo1234` |

Demo lookup numbers: licence `DK0123456789`, registration `DHAKA METRO-GA-12-3456`.
The citizen's licence card flips to show its QR code. Scan it with the police portal from a second device.

> **Testing on a phone:** run `npm run dev:phone` and open the `https://192.168.x.x:5173` Network URL on the phone (same Wi‑Fi). Accept the certificate warning once. Browsers only allow the camera (QR scan) on HTTPS or `localhost`, so plain `http://192.168…` loads the site but can't scan.

## 2. Connect Supabase

**Current setup:** SmartMamla uses the existing **BRTA_Extended** Supabase project and its tables
(`profiles`, `licenses`, `registered_vehicles`, `tax_tokens`, `violation_types`, `traffic_violations`, `payments`).
Cases filed here show up in BRTA Extended and the other way round. The only changes made to that database are
`supabase/brta_extended_migration.sql` (optional badge number / rank / station on profiles),
`supabase/appeals_migration.sql` (appeals table) and `supabase/officer_area_migration.sql` (officer area and
SMS-alert switch on profiles).
**Do not run `supabase/schema.sql` on that project.** It is only for a brand-new, separate database.

For a fresh project instead:

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Copy `.env.example` to `.env` and fill in these values:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Project Settings → API)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only; never expose this key to the browser)
4. Restart `npm run dev`. The demo badge disappears when the app is live.

**Police accounts:** create the user in Supabase Auth, then run
`update profiles set role='police', badge_number='…', rank='…', station='…' where email='…';`

New sign-ups are always created as citizens. The database, not the browser, decides roles.

## 3. SSLCommerz payments

```bash
copy ..\brta_extended\backend\.env server\.env   # one time: reuse the same Supabase service key + SSLCommerz store
npm run dev                                       # the payment API is served at /api by the dev server itself
```
For production, build the site and run `npm run server` (standalone API on :5050) behind the same domain.

- Sandbox credentials (`testbox` / `qwerty`) are the defaults. Put your real store ID and password in `.env` and set `SSLCZ_SANDBOX=false` when you go live.
- The server computes the amount from the database. It never trusts the amount the browser sends.
- Before marking a case paid, the server checks the payment with SSLCommerz's validator API. It does this on both the success redirect and the IPN.
- SSLCommerz must be able to reach the server. When deployed, set `PUBLIC_API_URL` to its public URL, and point `VITE_API_URL` in the frontend at the same address.

## 4. Omni-Eye AI camera reports

The Omni-Eye detection node (`~/FYDP/dashboard`) analyses the footbridge camera videos. It sends every
violation it finds to the Smart Mamla backend. Police review each one under **AI reports** (`/police/ai`)
before a mamla is filed. Nothing is written to the database tables until an officer presses **File a mamla**.

```
Omni-Eye (your PC) ──POST /api/ai/reports──▶ backend on Render (server/) ──▶ Supabase Storage
                                                   ▲
police on the Vercel site ──VITE_API_URL──────────┘
```

- `server/ai.js` holds the endpoints, mounted at `/api/ai` on the same Express server as payments.
  `npm run server` runs it on Render, and `npm run dev` serves it locally.
- `POST /api/ai/reports` is used by Omni-Eye. It needs the header `x-omnieye-key: <OMNIEYE_INGEST_KEY>`.
- `GET /api/ai/reports`, `GET /api/ai/summary` and `POST /api/ai/reports/:id/review` are for police.
  The Supabase session must belong to a `police` or `admin` profile.
- **Storage:** Render's free disk is wiped on every restart, so reports and evidence photos go into a
  private Supabase Storage bucket, `omnieye-reports`. It is created automatically, and no tables are
  added or changed. Locally without a service key they go to `server/ai_data/`, which git ignores.
- The **Traffic** page shows a live "AI camera detections" panel. It refreshes every 15 s.

### Render setup (once)

In Render → your backend service → Environment:

| Name | Value |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | probably already there for payments. Supabase → Project Settings → API keys → service_role / secret key |
| `OMNIEYE_INGEST_KEY` | any long random string. Omni-Eye must send the same one |

Save, and let Render redeploy. Nothing changes on Vercel: the site already calls the backend through
`VITE_API_URL`. Check it with `https://<backend>.onrender.com/api/ai/health`. Without the key header it
should answer `{"error":"Bad or missing x-omnieye-key ..."}`, which proves the route is live.

The free Render service sleeps after 15 minutes without traffic, and the first request takes about a
minute to wake it. Omni-Eye waits for that before sending.

### Local run

```bash
npm run dev                                   # Smart Mamla on http://localhost:5173
cd ~/FYDP && bash run_dashboard.sh            # Omni-Eye node on http://localhost:8765
```

Omni-Eye reads its settings from `~/FYDP/dashboard/smartmamla.env`:
- `SMARTMAMLA_URL`: the backend that receives the reports (the Render URL)
- `SMARTMAMLA_SITE`: the Vercel site, used for the "Open in Smart Mamla" links
- `OMNIEYE_INGEST_KEY`: the shared key

For local testing, leave both URLs empty and use `omnieye-dev-key`.

### Officer SMS when a video is processed

When Omni-Eye finishes sending the reports of one video, it calls `POST /api/ai/alerts/video`. The backend
then sends **one SMS** to every officer whose area matches the camera location, summarising all the
violations in that video:

```
8 traffic violations detected at Rampura footbridge
Time: 18/09/2026 16:49
No helmet 5, 3+ riders 2, Wrong side 1
Plate visible: 3/8
Please go to the location and respond.
Evidence: https://smart-mamla.vercel.app/police/ai
```

Every officer whose area matches gets their own copy.

- **Who gets it:** officers (`profiles.role` police/admin) with a phone number, `sms_alerts` on, and an
  `area` that matches the location. `area` is free text, several places separated by commas, e.g.
  `Rampura, Badda`. A place matches when every word of it appears in the camera location (or the other
  way round); generic words such as footbridge, traffic, division or Dhaka are ignored, so the station
  name is matched as a fallback (`Tejgaon Traffic Division` matches `Tejgaon footbridge`). `*` matches
  everything.
- **Setup once:** run `supabase/officer_area_migration.sql` in the Supabase SQL editor (adds
  `profiles.area` and `profiles.sms_alerts`), and set `SMS_API_KEY`, `SMS_SENDER_ID` and
  `PUBLIC_SITE_URL` on Render.
- **Officers set their own area and phone** under Police → **Profile → Camera alerts by SMS**
  (`PUT /api/ai/officer/me`), or you set them with the SQL in the migration file.
- A video is texted once. Pressing "Send again" in Omni-Eye does not text anyone again, unless new
  reports were added. If no officer matched or SMS was not configured, the video is not marked, so
  fixing that and pressing "Send again" sends the SMS.
- Check who would be texted for a location:
  `GET /api/ai/alerts/officers?location=Rampura%20footbridge` with the `x-omnieye-key` header.
- Omni-Eye shows the outcome under the report status ("Summary SMS sent to 2 officers: …", or why not).
- Code: `server/alerts.js` (matching, message, once-per-video logic), routes in `server/ai.js`.

## 5. Appeals against AI-camera fines

A driver can appeal a fine that came from an AI report **once**, while it is unpaid.

- **Driver:** My cases → "Appeal this fine" → writes a reason. The fine shows "Under appeal" and cannot be paid meanwhile.
- **Police:** AI reports → **Appeals** tab → check the photos and the driver's reason → accept or reject (a note is required to reject).
- **Accepted:** the fine is removed (`traffic_violations.status = 'waived'`).
- **Rejected:** the fine stands (`status = 'active'`) and the driver gets at least 7 more days to pay.
- **SMS:** the driver is told the result either way. Sent directly through BulkSMSBD, so the server's IP must be whitelisted there.
- Code: `server/appeals.js` (all writes, service role), `src/components/Appeal.jsx`, `src/pages/police/AppealsQueue.jsx`.
  Table: `violation_appeals` (`supabase/appeals_migration.sql`), read-only from the browser.

## Project structure

```
src/
  pages/            Landing, AuthPage, PaymentResult, SandboxGateway
  pages/police/     TrafficUpdates, AiReports (Omni-Eye review queue), Lookup (QR + search), MyCases, Profile
  pages/citizen/    Overview, Cases (select & pay), Documents, Payments
  components/       PortalShell (sidebar + mobile tab bar), QrScanner, FileCaseSheet,
                    DriverRecord, LicenseCard (flip → QR), VehicleCard, CaseCard, Sheet …
  i18n/translations.js   all UI text in en + bn
  lib/api.js        one data layer: Supabase when configured, demo store otherwise
server/index.js     SSLCommerz initiate / success / fail / cancel / IPN
server/ai.js        Omni-Eye report ingest + police review queue (/api/ai)
supabase/           schema.sql (tables + RLS), seed.sql
```

## QR format

`SMARTMAMLA|DL|<licence number>` or `SMARTMAMLA|VR|<registration number>`. A plain licence number or registration number also works.


TEST TEST TEST TEST
