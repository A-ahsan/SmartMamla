-- ════════════════════════════════════════════════════════════════
--  SmartMamla — Supabase schema
--  Run this whole file once in Supabase → SQL Editor.
--  Then run seed.sql for violation types (+ optional demo records).
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────── profiles (one per auth user) ─────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  role          text not null default 'citizen' check (role in ('citizen', 'police', 'admin')),
  full_name     text,
  full_name_bn  text,
  phone         text,
  nid           text,
  -- police only
  badge_number  text unique,
  rank          text,
  rank_bn       text,
  station       text,
  station_bn    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- New sign-ups always become citizens. Promote officers manually (see bottom of seed.sql).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, full_name_bn, phone, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    'citizen'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer so RLS policies can call them without recursion)
create or replace function public.is_police()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('police', 'admin'));
$$;

-- Lets police log in with their badge number instead of email
create or replace function public.email_for_badge(p_badge text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles where upper(badge_number) = upper(trim(p_badge)) and role in ('police', 'admin') limit 1;
$$;
grant execute on function public.email_for_badge(text) to anon, authenticated;

-- ───────────── driving licences ─────────────
create table if not exists public.driving_licenses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  license_number    text unique not null,
  full_name         text not null,
  full_name_bn      text,
  date_of_birth     date,
  blood_group       text,
  license_class     text,
  license_class_bn  text,
  issue_date        date not null default current_date,
  expiry_date       date not null,
  status            text not null default 'active' check (status in ('active', 'expired', 'suspended', 'revoked')),
  address           text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_dl_user on public.driving_licenses(user_id);
create index if not exists idx_dl_number_upper on public.driving_licenses(upper(license_number));

-- ───────────── vehicles ─────────────
create table if not exists public.vehicles (
  id                      uuid primary key default gen_random_uuid(),
  owner_id                uuid not null references public.profiles(id) on delete cascade,
  registration_number     text unique not null,
  registration_number_bn  text,
  vehicle_type            text not null default 'car' check (vehicle_type in ('car', 'motorcycle', 'bus', 'truck', 'cng', 'microbus', 'other')),
  make                    text,
  model                   text,
  color                   text,
  chassis_number          text,
  engine_number           text,
  registration_date       date,
  tax_token_expiry        date,
  fitness_expiry          date,
  created_at              timestamptz not null default now()
);
create index if not exists idx_vehicle_owner on public.vehicles(owner_id);
create index if not exists idx_vehicle_reg_upper on public.vehicles(upper(registration_number));

-- ───────────── violation types (fine schedule) ─────────────
create table if not exists public.violation_types (
  code       text primary key,
  name_en    text not null,
  name_bn    text not null,
  fine       numeric(10,2) not null check (fine >= 0),
  severity   text not null check (severity in ('minor', 'moderate', 'severe', 'critical')),
  points     int not null default 1,
  is_active  boolean not null default true
);

-- ───────────── cases (mamla) ─────────────
create sequence if not exists public.case_seq start 100001;

create table if not exists public.cases (
  id              uuid primary key default gen_random_uuid(),
  case_number     text unique not null default ('SM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.case_seq')::text, 6, '0')),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  license_id      uuid references public.driving_licenses(id) on delete set null,
  vehicle_id      uuid references public.vehicles(id) on delete set null,
  officer_id      uuid not null references public.profiles(id),
  officer_name    text,
  officer_badge   text,
  violation_code  text not null references public.violation_types(code),
  violation_en    text not null,
  violation_bn    text not null,
  severity        text,
  fine_amount     numeric(10,2) not null check (fine_amount >= 0),
  location        text,
  location_bn     text,
  notes           text,
  status          text not null default 'unpaid' check (status in ('unpaid', 'paid', 'disputed', 'waived')),
  due_date        timestamptz not null default (now() + interval '30 days'),
  paid_at         timestamptz,
  transaction_id  text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_cases_user on public.cases(user_id);
create index if not exists idx_cases_officer on public.cases(officer_id);
create index if not exists idx_cases_status on public.cases(status);

-- Officers cannot tamper with the fine: it is always copied from violation_types.
create or replace function public.cases_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v public.violation_types;
begin
  select * into v from public.violation_types where code = new.violation_code and is_active;
  if not found then raise exception 'Unknown violation %', new.violation_code; end if;
  new.fine_amount  := v.fine;
  new.violation_en := v.name_en;
  new.violation_bn := v.name_bn;
  new.severity     := v.severity;
  new.status       := 'unpaid';
  new.paid_at      := null;
  new.transaction_id := null;
  select full_name, badge_number into new.officer_name, new.officer_badge from public.profiles where id = new.officer_id;
  return new;
end $$;

drop trigger if exists trg_cases_before_insert on public.cases;
create trigger trg_cases_before_insert before insert on public.cases
  for each row execute function public.cases_before_insert();

-- ───────────── payments ─────────────
create table if not exists public.payments (
  id                uuid primary key default gen_random_uuid(),
  tran_id           text unique not null,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  case_ids          uuid[] not null,
  amount            numeric(10,2) not null,
  status            text not null default 'pending' check (status in ('pending', 'success', 'failed', 'cancelled')),
  method            text,
  val_id            text,
  gateway_response  jsonb,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_payments_user on public.payments(user_id);

-- ════════════════════════════════════════════════════════════════
--  Row Level Security
--  Citizens see only their own data. Police can read everyone's
--  records and file cases. Payments are written only by the
--  payment server (service role bypasses RLS).
-- ════════════════════════════════════════════════════════════════
alter table public.profiles         enable row level security;
alter table public.driving_licenses enable row level security;
alter table public.vehicles         enable row level security;
alter table public.violation_types  enable row level security;
alter table public.cases            enable row level security;
alter table public.payments         enable row level security;

drop policy if exists "profiles: self or police read" on public.profiles;
create policy "profiles: self or police read" on public.profiles
  for select using (id = auth.uid() or public.is_police());

drop policy if exists "licences: owner or police read" on public.driving_licenses;
create policy "licences: owner or police read" on public.driving_licenses
  for select using (user_id = auth.uid() or public.is_police());

drop policy if exists "vehicles: owner or police read" on public.vehicles;
create policy "vehicles: owner or police read" on public.vehicles
  for select using (owner_id = auth.uid() or public.is_police());

drop policy if exists "violation types: signed-in read" on public.violation_types;
create policy "violation types: signed-in read" on public.violation_types
  for select to authenticated using (true);

drop policy if exists "cases: owner or police read" on public.cases;
create policy "cases: owner or police read" on public.cases
  for select using (user_id = auth.uid() or public.is_police());

drop policy if exists "cases: police file" on public.cases;
create policy "cases: police file" on public.cases
  for insert with check (public.is_police() and officer_id = auth.uid());

drop policy if exists "payments: owner read" on public.payments;
create policy "payments: owner read" on public.payments
  for select using (user_id = auth.uid());
