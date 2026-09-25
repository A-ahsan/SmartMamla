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
Cases filed here show up in BRTA Extended and the other way round. The only change made to that database is
`supabase/brta_extended_migration.sql` (optional badge number / rank / station on profiles).
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

## 4. Traffic AI model (later)

`src/pages/police/TrafficUpdates.jsx` → `loadTrafficFeed()` is the single integration point. Return
`[{ id, en, bn, level: 0..1, speed }]` from your model and the map and hotspot list update automatically. The feed refreshes every 15 s.

## Project structure

```
src/
  pages/            Landing, AuthPage, PaymentResult, SandboxGateway
  pages/police/     TrafficUpdates, Lookup (QR + search), MyCases, Profile
  pages/citizen/    Overview, Cases (select & pay), Documents, Payments
  components/       PortalShell (sidebar + mobile tab bar), QrScanner, FileCaseSheet,
                    DriverRecord, LicenseCard (flip → QR), VehicleCard, CaseCard, Sheet …
  i18n/translations.js   all UI text in en + bn
  lib/api.js        one data layer: Supabase when configured, demo store otherwise
server/index.js     SSLCommerz initiate / success / fail / cancel / IPN
supabase/           schema.sql (tables + RLS), seed.sql
```

## QR format

`SMARTMAMLA|DL|<licence number>` or `SMARTMAMLA|VR|<registration number>`. A plain licence number or registration number also works.
