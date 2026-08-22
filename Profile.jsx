import React, { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/Layout.jsx";

const PHONE_RE = /^[0-9+\-\s()]{6,20}$/;

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ phone: "", address: "", profile_picture: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone || "",
        address: user.address || "",
        profile_picture: user.profile_picture || "",
      });
    }
  }, [user]);

  function validate() {
    const e = {};
    if (form.phone && !PHONE_RE.test(form.phone)) e.phone = "Enter a valid phone number.";
    if (form.address && form.address.length > 200) e.address = "Address must be under 200 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setMessage("");
    setServerError("");
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await api.put(`/employees/${user.id}`, form);
      setUser(res.data.employee);
      setMessage("Profile updated.");
    } catch (err) {
      setServerError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-ink/50 text-sm mt-1">Your personal and job details.</p>
        </div>

        <div className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="label mb-0.5">Employee ID</p>
            <p className="text-sm font-mono">{user.employee_code}</p>
          </div>
          <div>
            <p className="label mb-0.5">Full name</p>
            <p className="text-sm">{user.full_name}</p>
          </div>
          <div>
            <p className="label mb-0.5">Email</p>
            <p className="text-sm">{user.email}</p>
          </div>
          <div>
            <p className="label mb-0.5">Job title</p>
            <p className="text-sm">{user.job_title}</p>
          </div>
          <div>
            <p className="label mb-0.5">Department</p>
            <p className="text-sm">{user.department}</p>
          </div>
          <div>
            <p className="label mb-0.5">Role</p>
            <p className="text-sm capitalize">{user.role === "admin" ? "HR Officer" : "Employee"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-4">
          <p className="font-display font-semibold">Editable details</p>
          {message && <div className="text-sm bg-accent-light text-accent rounded-lg px-3 py-2">{message}</div>}
          {serverError && <div className="text-sm bg-danger-light text-danger rounded-lg px-3 py-2">{serverError}</div>}

          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" className="input" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>

          <div>
            <label className="label" htmlFor="address">Address</label>
            <textarea id="address" className="input" rows={3} value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
            {errors.address && <p className="field-error">{errors.address}</p>}
          </div>

          <div>
            <label className="label" htmlFor="pic">Profile picture URL</label>
            <input id="pic" className="input" placeholder="https://…" value={form.profile_picture}
              onChange={(e) => setForm({ ...form, profile_picture: e.target.value })} />
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
