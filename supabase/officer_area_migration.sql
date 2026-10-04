-- ════════════════════════════════════════════════════════════════
--  Officer SMS alerts for Omni-Eye videos (server/alerts.js)
--  Apply to the BRTA_Extended project: Supabase → SQL editor → paste → Run.
--  Additive only; BRTA Extended is unaffected. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════
--
--  area        the places an officer covers, comma-separated, written the way the camera
--              location is typed in the Omni-Eye dashboard (English), e.g. 'Rampura, Badda'.
--              An officer is texted when every word of one of their places appears in the
--              camera location, or every word of the location appears in the place. Generic
--              words (footbridge, traffic, division, Dhaka ...) are ignored, so the station name
--              'Tejgaon Traffic Division' also matches 'Tejgaon footbridge'. '*' = every location.
--  sms_alerts  false = never text this officer about processed videos.
--
--  Officers can edit area, phone and the switch themselves: Police portal → Profile →
--  "Camera alerts by SMS". The SMS goes to profiles.phone.

alter table public.profiles add column if not exists area text;
alter table public.profiles add column if not exists sms_alerts boolean not null default true;

comment on column public.profiles.area is 'Police only: places covered, comma-separated. Matched against the Omni-Eye camera location for SMS alerts.';
comment on column public.profiles.sms_alerts is 'Police only: false = no SMS when a video from their area is processed.';

-- ── 1. See who the officers are and what they have on file ─────────────────
select email, full_name, badge_number, station, area, phone, sms_alerts
from public.profiles
where role in ('police', 'admin')
order by full_name;

-- ── 2. Assign areas (edit the emails and places, then run) ─────────────────
-- update public.profiles set area = 'Rampura, Hatirjheel', phone = '01712345678'
--   where email = 'officer1@example.com' and role in ('police', 'admin');
-- update public.profiles set area = 'Tejgaon, Farmgate'
--   where email = 'officer2@example.com' and role in ('police', 'admin');

-- ── 3. Check who would be texted for a camera location (same rule as the server, simplified) ──
-- select full_name, area, station, phone
-- from public.profiles
-- where role in ('police', 'admin') and sms_alerts and phone is not null
--   and (lower('Rampura footbridge') like '%' || lower(split_part(area, ',', 1)) || '%');
