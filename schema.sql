-- ============================================================
-- Dayflow HRMS — Supabase schema + Row Level Security policies
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
create type user_role as enum ('admin', 'employee');
create type attendance_status as enum ('present', 'absent', 'half_day', 'leave');
create type leave_type as enum ('paid', 'sick', 'unpaid');
create type leave_status as enum ('pending', 'approved', 'rejected');

-- ---------- users (extends auth.users) ----------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text unique not null,
  email text unique not null,
  role user_role not null default 'employee',
  full_name text not null,
  phone text,
  address text,
  profile_picture_url text,
  job_title text,
  department text,
  date_joined date default current_date,
  created_at timestamptz default now()
);

-- ---------- salary_structures ----------
create table salary_structures (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  base_salary numeric not null,
  allowances jsonb default '{}',
  deductions jsonb default '{}',
  effective_date date default current_date,
  updated_by uuid references users(id),
  created_at timestamptz default now()
);

-- ---------- attendance ----------
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  status attendance_status not null default 'present',
  unique (user_id, date)
);

-- ---------- leave_requests ----------
create table leave_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  leave_type leave_type not null,
  start_date date not null,
  end_date date not null,
  remarks text,
  status leave_status not null default 'pending',
  admin_comment text,
  reviewed_by uuid references users(id),
  created_at timestamptz default now()
);

-- ---------- documents ----------
create table documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  file_url text not null,
  doc_type text not null,
  uploaded_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table users enable row level security;
alter table salary_structures enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table documents enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- users policies ----------
create policy "Users can view own profile"
  on users for select
  using (id = auth.uid());

create policy "Admins can view all profiles"
  on users for select
  using (is_admin());

create policy "Users can update limited own fields"
  on users for update
  using (id = auth.uid());

create policy "Admins can update any profile"
  on users for update
  using (is_admin());

create policy "Users can insert own row on signup"
  on users for insert
  with check (id = auth.uid());

-- ---------- salary_structures policies ----------
create policy "Employees view own salary"
  on salary_structures for select
  using (user_id = auth.uid());

create policy "Admins view all salaries"
  on salary_structures for select
  using (is_admin());

create policy "Admins manage salaries"
  on salary_structures for all
  using (is_admin())
  with check (is_admin());

-- ---------- attendance policies ----------
create policy "Employees view own attendance"
  on attendance for select
  using (user_id = auth.uid());

create policy "Employees check in/out for self"
  on attendance for insert
  with check (user_id = auth.uid());

create policy "Employees update own open attendance row"
  on attendance for update
  using (user_id = auth.uid());

create policy "Admins view all attendance"
  on attendance for select
  using (is_admin());

create policy "Admins manage all attendance"
  on attendance for all
  using (is_admin())
  with check (is_admin());

-- ---------- leave_requests policies ----------
create policy "Employees view own leave requests"
  on leave_requests for select
  using (user_id = auth.uid());

create policy "Employees create own leave requests"
  on leave_requests for insert
  with check (user_id = auth.uid());

create policy "Admins view all leave requests"
  on leave_requests for select
  using (is_admin());

create policy "Admins update leave requests"
  on leave_requests for update
  using (is_admin());

-- ---------- documents policies ----------
create policy "Employees view own documents"
  on documents for select
  using (user_id = auth.uid());

create policy "Admins view all documents"
  on documents for select
  using (is_admin());

create policy "Admins manage documents"
  on documents for all
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- Storage bucket for profile pictures / documents
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
