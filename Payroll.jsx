import React, { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/Layout.jsx";

function EmployeePayroll() {
  const [payroll, setPayroll] = useState(null);

  useEffect(() => {
    api.get("/payroll/me").then((r) => setPayroll(r.data.payroll));
  }, []);

  if (!payroll) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Payroll</h1>
        <p className="text-ink/50 text-sm mt-1">Read-only view of your current salary structure.</p>
      </div>

      <div className="card space-y-3">
        <Row label="Basic salary" value={payroll.basic_salary} />
        <Row label="Allowances" value={payroll.allowances} positive />
        <Row label="Deductions" value={payroll.deductions} negative />
        <div className="border-t border-border pt-3 flex justify-between items-baseline">
          <span className="font-display font-semibold">Net salary</span>
          <span className="font-mono text-xl font-bold text-primary">₹{payroll.net_salary.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, positive, negative }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink/60">{label}</span>
      <span className={`font-mono ${positive ? "text-accent" : negative ? "text-danger" : ""}`}>
        {negative ? "− " : ""}₹{value.toLocaleString()}
      </span>
    </div>
  );
}

function AdminPayroll() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ basic_salary: "", allowances: "", deductions: "" });
  const [error, setError] = useState("");

  async function refresh() {
    const res = await api.get("/payroll");
    setRows(res.data.payroll);
  }
  useEffect(() => { refresh(); }, []);

  function startEdit(row) {
    setEditing(row.user_id);
    setForm({ basic_salary: row.basic_salary, allowances: row.allowances, deductions: row.deductions });
    setError("");
  }

  async function save(userId) {
    const payload = {
      basic_salary: Number(form.basic_salary),
      allowances: Number(form.allowances),
      deductions: Number(form.deductions),
    };
    for (const [k, v] of Object.entries(payload)) {
      if (Number.isNaN(v) || v < 0) {
        setError(`${k.replace("_", " ")} must be a non-negative number.`);
        return;
      }
    }
    try {
      await api.put(`/payroll/${userId}`, payload);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not update payroll.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll management</h1>
        <p className="text-ink/50 text-sm mt-1">Update salary structures for employees.</p>
      </div>

      {error && <div className="text-sm bg-danger-light text-danger rounded-lg px-3 py-2">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-border">
              <th className="py-2 pr-4 font-medium">Employee</th>
              <th className="py-2 pr-4 font-medium">Basic</th>
              <th className="py-2 pr-4 font-medium">Allowances</th>
              <th className="py-2 pr-4 font-medium">Deductions</th>
              <th className="py-2 pr-4 font-medium">Net</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4">{r.full_name} <span className="text-ink/40 font-mono text-xs">{r.employee_code}</span></td>
                {editing === r.user_id ? (
                  <>
                    <td className="py-2 pr-4"><input type="number" min="0" className="input w-24" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} /></td>
                    <td className="py-2 pr-4"><input type="number" min="0" className="input w-24" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })} /></td>
                    <td className="py-2 pr-4"><input type="number" min="0" className="input w-24" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} /></td>
                    <td className="py-2 pr-4 font-mono">—</td>
                    <td className="py-2 pr-4 flex gap-2">
                      <button onClick={() => save(r.user_id)} className="btn-primary text-xs px-3 py-1.5">Save</button>
                      <button onClick={() => setEditing(null)} className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-4 font-mono">₹{r.basic_salary.toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono text-accent">₹{r.allowances.toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono text-danger">₹{r.deductions.toLocaleString()}</td>
                    <td className="py-2 pr-4 font-mono font-semibold">₹{r.net_salary.toLocaleString()}</td>
                    <td className="py-2 pr-4"><button onClick={() => startEdit(r)} className="btn-secondary text-xs px-3 py-1.5">Edit</button></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Payroll() {
  const { user } = useAuth();
  return <Layout>{user.role === "admin" ? <AdminPayroll /> : <EmployeePayroll />}</Layout>;
}
