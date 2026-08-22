import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/Layout.jsx";
import DayStrip from "../components/DayStrip.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

function EmployeeHome() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [leave, setLeave] = useState([]);
  const [payroll, setPayroll] = useState(null);
  const [today, setToday] = useState(null);

  async function refresh() {
    const [attRes, leaveRes, payRes] = await Promise.all([
      api.get("/attendance/me"),
      api.get("/leave/me"),
      api.get("/payroll/me"),
    ]);
    setAttendance(attRes.data.attendance);
    setLeave(leaveRes.data.leave);
    setPayroll(payRes.data.payroll);
    const todayStr = new Date().toISOString().slice(0, 10);
    setToday(attRes.data.attendance.find((a) => a.date === todayStr) || null);
  }

  useEffect(() => { refresh(); }, []);

  async function checkIn() {
    await api.post("/attendance/checkin");
    refresh();
  }
  async function checkOut() {
    await api.post("/attendance/checkout");
    refresh();
  }

  const pendingLeave = leave.filter((l) => l.status === "Pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.full_name.split(" ")[0]}</h1>
        <p className="text-ink/50 text-sm mt-1">Here's where your workday stands.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="label mb-3">This week</p>
          <DayStrip records={attendance} />
        </div>

        <div className="card">
          <p className="label mb-2">Today</p>
          {today?.check_in ? (
            <div className="space-y-2">
              <p className="text-sm">Checked in at <span className="font-mono">{today.check_in}</span></p>
              {today.check_out ? (
                <p className="text-sm text-ink/50">Checked out at <span className="font-mono">{today.check_out}</span></p>
              ) : (
                <button onClick={checkOut} className="btn-secondary text-sm">Check out</button>
              )}
            </div>
          ) : (
            <button onClick={checkIn} className="btn-primary text-sm">Check in</button>
          )}
        </div>

        <div className="card">
          <p className="label mb-2">Leave requests</p>
          <p className="text-2xl font-display font-bold text-primary">{pendingLeave}</p>
          <p className="text-xs text-ink/50">pending approval</p>
          <Link to="/leave" className="text-xs text-primary font-medium mt-2 inline-block">Apply for leave →</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <p className="label mb-3">Recent leave requests</p>
          {leave.length === 0 && <p className="text-sm text-ink/40">No leave requests yet.</p>}
          <ul className="space-y-2">
            {leave.slice(0, 4).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <span>{l.leave_type} · {l.start_date} → {l.end_date}</span>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <p className="label mb-3">Salary snapshot</p>
          {payroll ? (
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span className="text-ink/50">Net salary</span><span className="font-mono font-semibold">₹{payroll.net_salary.toLocaleString()}</span></div>
              <Link to="/payroll" className="text-xs text-primary font-medium mt-2 inline-block">View full breakdown →</Link>
            </div>
          ) : <p className="text-sm text-ink/40">No payroll data yet.</p>}
        </div>
      </div>
    </div>
  );
}

function AdminHome() {
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [pendingLeave, setPendingLeave] = useState([]);

  useEffect(() => {
    api.get("/employees").then((r) => setEmployees(r.data.employees));
    api.get("/attendance").then((r) => setTodayAttendance(r.data.attendance));
    api.get("/leave", { params: { status: "Pending" } }).then((r) => setPendingLeave(r.data.leave));
  }, []);

  const presentToday = todayAttendance.filter((a) => a.status === "Present").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Overview</h1>
        <p className="text-ink/50 text-sm mt-1">A snapshot of the organization today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="label">Total employees</p>
          <p className="text-3xl font-display font-bold text-primary">{employees.length}</p>
        </div>
        <div className="card">
          <p className="label">Present today</p>
          <p className="text-3xl font-display font-bold text-accent">{presentToday}</p>
        </div>
        <div className="card">
          <p className="label">Pending leave</p>
          <p className="text-3xl font-display font-bold text-warn">{pendingLeave.length}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="label mb-0">Pending leave requests</p>
          <Link to="/leave" className="text-xs text-primary font-medium">Review all →</Link>
        </div>
        {pendingLeave.length === 0 && <p className="text-sm text-ink/40">Nothing pending. All caught up.</p>}
        <ul className="space-y-2">
          {pendingLeave.slice(0, 5).map((l) => (
            <li key={l.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2 last:pb-0">
              <span>{l.full_name} · {l.leave_type} · {l.start_date} → {l.end_date}</span>
              <StatusBadge status={l.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Layout>
      {user.role === "admin" ? <AdminHome /> : <EmployeeHome />}
    </Layout>
  );
}
