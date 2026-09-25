-- Applied to the BRTA_Extended project (tcqatmkqmvaseakicqkr) on 2026-09-25 as
-- migration "smartmamla_police_profile_fields". Additive only; BRTA Extended is unaffected.
alter table public.profiles add column if not exists badge_number text;
alter table public.profiles add column if not exists rank text;
alter table public.profiles add column if not exists station text;
create unique index if not exists profiles_badge_number_key on public.profiles (upper(badge_number)) where badge_number is not null;

create or replace function public.email_for_badge(p_badge text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles
  where upper(badge_number) = upper(trim(p_badge)) and role in ('police', 'admin')
  limit 1;
$$;
revoke all on function public.email_for_badge(text) from public;
grant execute on function public.email_for_badge(text) to anon, authenticated;

-- Give an officer a badge number (optional; email login always works):
-- update public.profiles set badge_number = 'DMP-TR-1001', rank = 'Sergeant', station = 'Tejgaon' where email = 'police@brta.com';
