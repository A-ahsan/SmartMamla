-- Applied to the BRTA_Extended project as migration "smartmamla_violation_appeals" (2026-10-04).
-- One appeal per AI-camera fine. Browsers can only READ this table; the SmartMamla server writes it.
create table if not exists public.violation_appeals (
  id               uuid primary key default gen_random_uuid(),
  violation_id     uuid not null unique references public.traffic_violations(id) on delete cascade, -- unique = appeal once
  user_id          uuid not null references auth.users(id) on delete cascade,
  reason           text not null check (char_length(reason) between 10 and 1000),
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  review_note      text,
  reviewed_by      uuid references auth.users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at      timestamptz,
  sms_sent         boolean,
  created_at       timestamptz not null default now()
);
create index if not exists idx_violation_appeals_user on public.violation_appeals(user_id);
create index if not exists idx_violation_appeals_status on public.violation_appeals(status);

alter table public.violation_appeals enable row level security;

create policy "appeals: owner or police read" on public.violation_appeals
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('police', 'admin'))
  );
