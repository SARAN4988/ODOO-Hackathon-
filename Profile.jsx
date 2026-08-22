import React, { useEffect, useState } from "react";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext.jsx";
import Layout from "../components/Layout.jsx";

const PHONE_RE = /^[0-9+\-\s()]{6,20}$/;
const PINCODE_RE = /^\d{6}$/;

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    phone: "",
    profile_picture: "",
    address_door_no: "",
    address_street: "",
    address_district: "",
    address_state: "",
    address_pincode: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone || "",
        profile_picture: user.profile_picture || "",
        address_door_no: user.address_door_no || "",
        address_street: user.address_street || "",
        address_district: user.address_district || "",
        address_state: user.address_state || "",
        address_pincode: user.address_pincode || "",
      });
    }
  }, [user]);

  function validate() {
    const e = {};
    if (form.phone && !PHONE_RE.test(form.phone)) e.phone = "Enter a valid phone number.";
    if (form.address_pincode && !PINCODE_RE.test(form.address_pincode)) e.address_pincode = "Enter a valid 6-digit PIN code.";
    for (const f of ["address_door_no", "address_street", "address_district", "address_state"]) {
      if (form[f] && form[f].length > 100) e[f] = "Must be under 100 characters.";
    }
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
            <p className="label mb-2">Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="address_door_no">Door no.</label>
                <input id="address_door_no" className="input" value={form.address_door_no}
                  onChange={(e) => setForm({ ...form, address_door_no: e.target.value })} />
                {errors.address_door_no && <p className="field-error">{errors.address_door_no}</p>}
              </div>
              <div>
                <label className="label" htmlFor="address_street">Street name</label>
                <input id="address_street" className="input" value={form.address_street}
                  onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
                {errors.address_street && <p className="field-error">{errors.address_street}</p>}
              </div>
              <div>
                <label className="label" htmlFor="address_district">District</label>
                <input id="address_district" className="input" value={form.address_district}
                  onChange={(e) => setForm({ ...form, address_district: e.target.value })} />
                {errors.address_district && <p className="field-error">{errors.address_district}</p>}
              </div>
              <div>
                <label className="label" htmlFor="address_state">State</label>
                <input id="address_state" className="input" value={form.address_state}
                  onChange={(e) => setForm({ ...form, address_state: e.target.value })} />
                {errors.address_state && <p className="field-error">{errors.address_state}</p>}
              </div>
              <div>
                <label className="label" htmlFor="address_pincode">PIN code</label>
                <input id="address_pincode" className="input" inputMode="numeric" maxLength={6} value={form.address_pincode}
                  onChange={(e) => setForm({ ...form, address_pincode: e.target.value.replace(/\D/g, "") })} />
                {errors.address_pincode && <p className="field-error">{errors.address_pincode}</p>}
              </div>
            </div>
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
