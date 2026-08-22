import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api";

const employeeLinks = [
  { to: "/dashboard", label: "Dashboard", icon: "grid" },
  { to: "/profile", label: "Profile", icon: "user" },
  { to: "/attendance", label: "Attendance", icon: "clock" },
  { to: "/leave", label: "Leave", icon: "calendar" },
  { to: "/payroll", label: "Payroll", icon: "wallet" },
];

const adminLinks = [
  { to: "/dashboard", label: "Dashboard", icon: "grid" },
  { to: "/employees", label: "Employees", icon: "users" },
  { to: "/attendance", label: "Attendance", icon: "clock" },
  { to: "/leave", label: "Leave Approvals", icon: "calendar" },
  { to: "/payroll", label: "Payroll", icon: "wallet" },
  { to: "/profile", label: "Profile", icon: "user" },
];

function Icon({ name, className }) {
  const paths = {
    grid: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
    user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z" />,
    clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm1-9V7h-2v6l5 3 1-1.7-4-2.3Z" />,
    calendar: <path d="M7 2v2M17 2v2M3 8h18M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
    wallet: <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm14 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />,
    users: <path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 20c0-3.3 3.6-6 8-6s8 2.7 8 6v1H1v-1Zm14.5-5.4c2.6.5 4.5 2.4 4.5 4.4v2h3v-1c0-2.5-2.7-4.6-6.3-5.2a1 1 0 0 0-1.2-.2Z" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      {paths[name]}
    </svg>
  );
}

function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  async function refresh() {
    try {
      const res = await api.get("/leave/notifications");
      setItems(res.data.notifications);
    } catch {
      // silently ignore — notifications are non-critical
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function markRead(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try { await api.put("/leave/notifications/read", { id }); } catch { /* ignore */ }
  }

  async function markAllRead() {
    const ids = items.map((i) => i.id);
    setItems([]);
    if (ids.length === 0) return;
    try { await api.put("/leave/notifications/read", {}); } catch { /* ignore */ }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        className="relative p-2 rounded-lg hover:bg-white/10 text-white"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] leading-4 text-center font-semibold">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white text-ink rounded-xl shadow-card border border-border z-30">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <p className="font-display font-semibold text-sm">Notifications</p>
            {items.length > 0 && (
              <button className="text-xs text-primary hover:underline" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-ink/40 text-center py-6 px-4">You're all caught up.</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className="px-4 py-3 border-b border-border last:border-0">
                  <p className="text-sm">
                    Your <span className="font-medium">{n.leave_type}</span> leave request
                    ({n.start_date} → {n.end_date}) was{" "}
                    <span className={n.status === "Approved" ? "text-accent font-medium" : "text-danger font-medium"}>
                      {n.status.toLowerCase()}
                    </span> by HR.
                  </p>
                  {n.admin_comment && <p className="text-xs text-ink/50 mt-1">"{n.admin_comment}"</p>}
                  <button className="text-xs text-primary hover:underline mt-1.5" onClick={() => markRead(n.id)}>
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = user?.role === "admin" ? adminLinks : employeeLinks;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-16 shrink-0 bg-primary text-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 -ml-2 rounded hover:bg-white/10"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-lg tracking-tight text-white">Dayflow</span>
            <span className="hidden sm:inline text-xs text-white/60 font-body">Every workday, perfectly aligned.</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.role !== "admin" && <NotificationBell />}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium leading-tight">{user?.full_name}</div>
            <div className="text-[11px] text-white/60 leading-tight capitalize">{user?.role === "admin" ? "HR Officer" : "Employee"}</div>
          </div>
          <button onClick={handleLogout} className="btn bg-white/10 hover:bg-white/20 text-white text-sm">
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className={`
            bg-white border-r border-border w-60 shrink-0 py-4 px-3
            fixed md:sticky top-16 h-[calc(100vh-4rem)] z-10 transition-transform
            ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-ink/70 hover:bg-canvas hover:text-ink"
                  }`
                }
              >
                <Icon name={link.icon} className="w-4 h-4 shrink-0" />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Overlay for mobile menu */}
        {menuOpen && (
          <button
            className="fixed inset-0 bg-ink/30 z-[5] md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
        )}

        <main className="flex-1 min-w-0 p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
