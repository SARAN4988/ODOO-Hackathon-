-- ============================================================
-- Dayflow HRMS — migration 002
-- Adds the tables behind: Employee Skill Graph and Employee Feedback.
-- (Advanced HR Analytics, Workforce Risk Radar, Predictive Absenteeism
-- and Workforce Planning are all computed from EXISTING tables —
-- attendance, leave_requests, users, salary_structures — via
-- lib/analytics.ts, so they need no new tables.)
--
-- Run this in the Supabase SQL editor AFTER supabase/schema.sql.
-- ============================================================

-- ---------- skills ----------
create table skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  skill_name text not null,
  category text default 'General',
  proficiency smallint not null check (proficiency between 1 and 5),
  updated_at timestamptz default now(),
  unique (user_id, skill_name)
);

alter table skills enable row level security;

create policy "Employees manage own skills"
  on skills for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins view all skills"
  on skills for select
  using (is_admin());

-- ---------- feedback ----------
create table feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  category text not null default 'General',
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_anonymous boolean not null default false,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Employees view own feedback"
  on feedback for select
  using (user_id = auth.uid());

create policy "Employees submit own feedback"
  on feedback for insert
  with check (user_id = auth.uid());

-- Admins can read every row (including anonymous ones — the app
-- layer masks the author's name in the UI when is_anonymous is
-- true). For stricter DB-level anonymity, replace this policy with
-- a view that omits user_id for anonymous rows.
create policy "Admins view all feedback"
  on feedback for select
  using (is_admin());
