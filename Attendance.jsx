import React, { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/Layout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

function SummaryCard({ label, value, tone }) {
  const toneClass = {
    accent: "text-accent",
    danger: "text-danger",
    warn: "text-warn",
    primary: "text-primary",
  }[tone] || "text-ink";
  return (
    <div className="card py-3 px-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className={`text-2xl font-display font-bold mt-0.5 ${toneClass}`}>{value}</p>
    </div>
  );
}

function EmployeeAttendance() {
  const [rows, setRows] = useState([]);
  const [today, setToday] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await api.get("/attendance/me");
    setRows(res.data.attendance);
    const todayStr = new Date().toISOString().slice(0, 10);
    setToday(res.data.attendance.find((a) => a.date === todayStr) || null);
  }

  useEffect(() => { refresh(); }, []);

  const counts = rows.reduce(
    (acc, r) => {
      const key = r.status === "Half-day" ? "half" : r.status.toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { present: 0, absent: 0, leave: 0, half: 0 }
  );
  const marked = counts.present + counts.absent + counts.leave + counts.half;
  const attendancePct = marked > 0 ? Math.round(((counts.present + counts.half * 0.5) / marked) * 100) : 0;

  async function checkIn() {
    setBusy(true); setError("");
    try { await api.post("/attendance/checkin"); await refresh(); }
    catch (err) { setError(err?.response?.data?.error || "Could not check in."); }
    finally { setBusy(false); }
  }
  async function checkOut() {
    setBusy(true); setError("");
    try { await api.post("/attendance/checkout"); await refresh(); }
    catch (err) { setError(err?.response?.data?.error || "Could not check out."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-ink/50 text-sm mt-1">Track your daily check-ins.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkIn} disabled={busy || !!today?.check_in} className="btn-primary">Check in</button>
          <button onClick={checkOut} disabled={busy || !today?.check_in || !!today?.check_out} className="btn-secondary">Check out</button>
        </div>
      </div>

      {error && <div className="text-sm bg-danger-light text-danger rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Present" value={counts.present} tone="accent" />
        <SummaryCard label="Absent" value={counts.absent} tone="danger" />
        <SummaryCard label="On leave" value={counts.leave} tone="primary" />
        <SummaryCard label="Half-day" value={counts.half} tone="warn" />
        <SummaryCard label="Attendance %" value={`${attendancePct}%`} />
      </div>

      <div className="card overflow-x-auto">
        <p className="font-display font-semibold mb-3">Attendance history</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-border">
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Check-in</th>
              <th className="py-2 pr-4 font-medium">Check-out</th>
              <th className="py-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 font-mono">{r.date}</td>
                <td className="py-2 pr-4 font-mono">{r.check_in || "—"}</td>
                <td className="py-2 pr-4 font-mono">{r.check_out || "—"}</td>
                <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-ink/40">No attendance records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/attendance", { params: { date } }).then((r) => setRows(r.data.attendance));
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-ink/50 text-sm mt-1">Organization-wide daily attendance.</p>
        </div>
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-border">
              <th className="py-2 pr-4 font-medium">Employee</th>
              <th className="py-2 pr-4 font-medium">Department</th>
              <th className="py-2 pr-4 font-medium">Check-in</th>
              <th className="py-2 pr-4 font-medium">Check-out</th>
              <th className="py-2 pr-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4">{r.full_name} <span className="text-ink/40 font-mono text-xs">{r.employee_code}</span></td>
                <td className="py-2 pr-4">{r.department}</td>
                <td className="py-2 pr-4 font-mono">{r.check_in || "—"}</td>
                <td className="py-2 pr-4 font-mono">{r.check_out || "—"}</td>
                <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-ink/40">No records for this date.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  return <Layout>{user.role === "admin" ? <AdminAttendance /> : <EmployeeAttendance />}</Layout>;
}
