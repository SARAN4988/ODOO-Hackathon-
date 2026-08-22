# Dayflow — HRMS

Every workday, perfectly aligned. A Next.js + Supabase implementation of the
Dayflow HRMS requirements: auth with role-based access, employee profiles,
attendance check-in/out, leave approval workflows, and payroll visibility.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres, Auth (with email verification), Row Level Security
- **Tailwind CSS**

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
3. In **Authentication → Email templates**, make sure "Confirm signup" is enabled
   (it is by default) — this covers the "email verification is required" requirement.

## 2. Run the schema

Open **SQL Editor** in your Supabase project, paste the contents of
`supabase/schema.sql`, and run it. This creates all tables, enums, and the
Row Level Security policies that enforce role-based access (an employee can
only ever read/write their own rows; an admin can read/write everyone's).

Then run `supabase/migrations_002_advanced_features.sql` (same SQL Editor).
It adds the two extra tables the advanced features below need — `skills` and
`feedback` — with their own RLS policies. Everything else (Analytics, Risk
Radar, Predictive Absenteeism, Workforce Planning) is computed on the fly
from tables you already have, so there's nothing else to migrate.

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the
values from step 1.

## 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll land on the sign-up page.

## How the pieces map to the spec

| Spec section | Where it lives |
|---|---|
| 3.1 Sign Up / Sign In | `app/auth/signup`, `app/auth/login` |
| 3.2 Dashboards | `app/dashboard/employee`, `app/dashboard/admin` |
| 3.3 Profile management | `app/dashboard/employee/profile`, `app/dashboard/admin/employees/[id]` |
| 3.4 Attendance | `app/dashboard/employee/attendance`, `app/dashboard/admin/attendance` |
| 3.5 Leave & time-off | `app/dashboard/employee/leave`, `app/dashboard/admin/leave` |
| 3.6 Payroll | `app/dashboard/employee/payroll`, `app/dashboard/admin/payroll` |
| Role-based access | `middleware.ts` (route gating) + `supabase/schema.sql` (RLS policies) |

## Advanced features (added on top of the base spec)

| Feature | Where it lives | Built from |
|---|---|---|
| Advanced HR Analytics Dashboard | `app/dashboard/admin/analytics` | `users`, `attendance`, `leave_requests`, `salary_structures` |
| Workforce Risk Radar | `app/dashboard/admin/risk` (tab 1) | `attendance`, `leave_requests`, `feedback`, `users.date_joined` via `lib/analytics.ts` |
| Predictive Absenteeism | `app/dashboard/admin/risk` (tab 2) | same as above — a recent-vs-baseline attendance heuristic, not a trained model |
| Employee Skill Graph | `app/dashboard/admin/skills` (org matrix + radar), `app/dashboard/employee/skills` (self-entry) | new `skills` table |
| Workforce Planning & Optimization | `app/dashboard/admin/planning` | `users`, approved `leave_requests`, projected 4 weeks out |
| Employee Feedback | `app/dashboard/employee/feedback` (submit), `app/dashboard/admin/feedback` (aggregate) | new `feedback` table |
| Leave Analytics Reports | `app/dashboard/admin/leave/reports` | `leave_requests`, last 12 months |

`lib/analytics.ts` holds every scoring heuristic (absenteeism risk, leave
overuse, feedback-sentiment risk, tenure risk) as small, named, unit-testable
functions — swap in a real model later without touching any page.

## Suggested demo flow (for judges)

1. Sign up as an **Admin/HR** account, verify email, sign in.
2. Sign up as an **Employee** account in a separate browser/incognito window.
3. As the employee: check in for attendance, apply for leave.
4. As the admin: see the pending leave request appear on the overview + leave
   approvals page, approve it with a comment.
5. Refresh the employee's leave page — status updates to "approved" in real time
   on next load.
6. As the admin: set a salary structure for the employee; switch back to the
   employee's payroll page to show the read-only view.
7. As the employee: log a few skills (My Skills) and submit a piece of
   feedback (Feedback).
8. As the admin: open **HR Analytics** for the org-wide dashboard, **Risk
   Radar** for the department radar + predictive absenteeism list, **Skill
   Graph** to see the org matrix and that employee's radar, **Workforce
   Planning** for the 4-week coverage table, **Feedback** for aggregated
   sentiment, and **Leave Reports** for the type/month/department breakdown.
   The risk and planning numbers are most convincing with a few days of
   seeded attendance/leave history — check in as 2-3 demo employees across a
   couple of days before judging, or seed `attendance`/`leave_requests`
   directly in the SQL editor.

## Notes / things to extend if you have time left

- Profile pictures and documents: the `avatars` storage bucket and `documents`
  table are already scaffolded — wire up a file input with
  `supabase.storage.from('avatars').upload(...)`.
- Analytics/reports dashboard: `recharts` is already installed; a good first
  chart is attendance-present-count-by-day on the admin overview.
- Email/notification alerts on leave decisions: Supabase Edge Functions +
  a transactional email provider (Resend, Postmark) is the fastest path.
