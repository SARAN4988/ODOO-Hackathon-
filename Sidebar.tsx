"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string };

const EMPLOYEE_NAV: NavItem[] = [
  { href: "/dashboard/employee", label: "Overview" },
  { href: "/dashboard/employee/profile", label: "Profile" },
  { href: "/dashboard/employee/attendance", label: "Attendance" },
  { href: "/dashboard/employee/leave", label: "Leave" },
  { href: "/dashboard/employee/payroll", label: "Payroll" },
  { href: "/dashboard/employee/skills", label: "My Skills" },
  { href: "/dashboard/employee/feedback", label: "Feedback" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/employees", label: "Employees" },
  { href: "/dashboard/admin/attendance", label: "Attendance" },
  { href: "/dashboard/admin/leave", label: "Leave approvals" },
  { href: "/dashboard/admin/leave/reports", label: "Leave Reports" },
  { href: "/dashboard/admin/payroll", label: "Payroll" },
  { href: "/dashboard/admin/analytics", label: "HR Analytics" },
  { href: "/dashboard/admin/risk", label: "Risk Radar" },
  { href: "/dashboard/admin/planning", label: "Workforce Planning" },
  { href: "/dashboard/admin/skills", label: "Skill Graph" },
  { href: "/dashboard/admin/feedback", label: "Feedback" },
];

export function Sidebar({
  role,
  name,
}: {
  role: "admin" | "employee";
  name: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = role === "admin" ? ADMIN_NAV : EMPLOYEE_NAV;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6">
      <div className="mb-8 px-2">
        <p className="font-display text-lg font-semibold text-ink">Dayflow</p>
        <p className="text-xs text-slate">Every workday, aligned.</p>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/dashboard/${role}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-flow-light text-flow-dark"
                  : "text-slate hover:bg-mist hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line pt-4">
        <p className="px-3 text-sm font-medium text-ink">{name}</p>
        <p className="px-3 text-xs capitalize text-slate">{role}</p>
        <button
          onClick={handleLogout}
          className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-bad hover:bg-bad/10"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
