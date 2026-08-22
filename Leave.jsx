import React, { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/Layout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const SESSION_OPTIONS = [
  { value: "Full Day", label: "Full day" },
  { value: "First Half", label: "Half day — first half (morning)" },
  { value: "Second Half", label: "Half day — second half (afternoon)" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function EmployeeLeave() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ leave_type: "Paid", start_date: "", end_date: "", session: "Full Day", remarks: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const min = todayStr();
  const isSingleDay = form.start_date && form.start_date === form.end_date;

  async function refresh() {
    const res = await api.get("/leave/me");
    setRows(res.data.leave);
  }
  useEffect(() => { refresh(); }, []);

  function validate() {
    const e = {};
    if (!form.start_date) e.start_date = "Start date is required.";
    else if (form.start_date < min) e.start_date = "Start date cannot be in the past.";
    if (!form.end_date) e.end_date = "End date is required.";
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      e.end_date = "End date cannot be before start date.";
    }
    if (form.remarks.length > 300) e.remarks = "Remarks must be under 300 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function updateDates(field, value) {
    const next = { ...form, [field]: value };
    // Half-day time slots only make sense for a single-day request.
    if (next.start_date !== next.end_date) next.session = "Full Day";
    setForm(next);
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post("/leave", form);
      setForm({ leave_type: "Paid", start_date: "", end_date: "", session: "Full Day", remarks: "" });
      await refresh();
    } catch (err) {
      setServerError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leave</h1>
        <p className="text-ink/50 text-sm mt-1">Apply for time off and track your requests.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card space-y-4 max-w-xl">
        <p className="font-display font-semibold">New request</p>
        {serverError && <div className="text-sm bg-danger-light text-danger rounded-lg px-3 py-2">{serverError}</div>}

        <div>
          <label className="label" htmlFor="leave_type">Leave type</label>
          <select id="leave_type" className="input" value={form.leave_type}
            onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
            <option value="Paid">Paid</option>
            <option value="Sick">Sick</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="start_date">Start date</label>
            <input id="start_date" type="date" className="input" value={form.start_date} min={min}
              onChange={(e) => updateDates("start_date", e.target.value)} />
            {errors.start_date && <p className="field-error">{errors.start_date}</p>}
          </div>
          <div>
            <label className="label" htmlFor="end_date">End date</label>
            <input id="end_date" type="date" className="input" value={form.end_date} min={form.start_date || min}
              onChange={(e) => updateDates("end_date", e.target.value)} />
            {errors.end_date && <p className="field-error">{errors.end_date}</p>}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="session">Time slot</label>
          <select id="session" className="input" value={form.session} disabled={!isSingleDay}
            onChange={(e) => setForm({ ...form, session: e.target.value })}>
            {SESSION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="text-xs text-ink/40 mt-1">
            {isSingleDay ? "Half-day slots are available for single-day requests." : "Half-day slots only apply when start and end date are the same."}
          </p>
        </div>

        <div>
          <label className="label" htmlFor="remarks">Remarks (optional)</label>
          <textarea id="remarks" className="input" rows={2} value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          {errors.remarks && <p className="field-error">{errors.remarks}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <p className="font-display font-semibold mb-3">My requests</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-border">
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Dates</th>
              <th className="py-2 pr-4 font-medium">Time slot</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium">HR comment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4">{l.leave_type}</td>
                <td className="py-2 pr-4 font-mono">{l.start_date} → {l.end_date}</td>
                <td className="py-2 pr-4">{l.session || "Full Day"}</td>
                <td className="py-2 pr-4"><StatusBadge status={l.status} /></td>
                <td className="py-2 pr-4 text-ink/50">{l.admin_comment || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-ink/40">No leave requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminLeave() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("Pending");
  const [comments, setComments] = useState({});
  const [error, setError] = useState("");

  async function refresh() {
    const res = await api.get("/leave", { params: filter === "All" ? {} : { status: filter } });
    setRows(res.data.leave);
  }
  useEffect(() => { refresh(); }, [filter]);

  async function act(id, status) {
    setError("");
    try {
      await api.put(`/leave/${id}`, { status, admin_comment: comments[id] || "" });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update request.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leave approvals</h1>
          <p className="text-ink/50 text-sm mt-1">Review and act on employee leave requests.</p>
        </div>
        <select className="input w-40" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>All</option>
        </select>
      </div>

      {error && <div className="text-sm bg-danger-light text-danger rounded-lg px-3 py-2">{error}</div>}

      <div className="space-y-3">
        {rows.map((l) => (
          <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <p className="text-sm font-medium">{l.full_name} <span className="text-ink/40 font-mono text-xs">{l.employee_code}</span></p>
              <p className="text-sm text-ink/60">
                {l.leave_type} · {l.start_date} → {l.end_date}
                {l.session && l.session !== "Full Day" && <span className="text-ink/40"> · {l.session}</span>}
              </p>
              {l.remarks && <p className="text-xs text-ink/40 mt-1">"{l.remarks}"</p>}
              <div className="mt-1"><StatusBadge status={l.status} /></div>
            </div>
            {l.status === "Pending" && (
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input
                  className="input sm:w-48 text-sm"
                  placeholder="Comment (optional)"
                  value={comments[l.id] || ""}
                  onChange={(e) => setComments({ ...comments, [l.id]: e.target.value })}
                />
                <div className="flex gap-2">
                  <button onClick={() => act(l.id, "Approved")} className="btn-primary text-sm">Approve</button>
                  <button onClick={() => act(l.id, "Rejected")} className="btn-danger text-sm">Reject</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="card text-center text-ink/40 text-sm">No requests match this filter.</div>
        )}
      </div>
    </div>
  );
}

export default function Leave() {
  const { user } = useAuth();
  return <Layout>{user.role === "admin" ? <AdminLeave /> : <EmployeeLeave />}</Layout>;
}
