import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { apiErrorMessage } from "../api";
import { useAuth } from "../context/AuthContext.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    employee_code: "",
    full_name: "",
    email: "",
    password: "",
    confirm: "",
    role: "employee",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const e = {};
    if (!form.employee_code.trim()) e.employee_code = "Employee ID is required.";
    if (!form.full_name.trim()) e.full_name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email address.";
    if (!PASSWORD_RE.test(form.password)) {
      e.password = "Min 8 characters, with uppercase, lowercase, number and special character.";
    }
    if (form.confirm !== form.password) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/signup", {
        employee_code: form.employee_code.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setServerError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-2xl text-primary">Dayflow</h1>
          <p className="text-sm text-ink/50 mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-4">
          {serverError && (
            <div className="text-sm bg-danger-light text-danger rounded-lg px-3 py-2">{serverError}</div>
          )}

          <div>
            <label className="label" htmlFor="employee_code">Employee ID</label>
            <input id="employee_code" className="input" value={form.employee_code}
              onChange={(e) => set("employee_code", e.target.value)} />
            {errors.employee_code && <p className="field-error">{errors.employee_code}</p>}
          </div>

          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input id="full_name" className="input" value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)} />
            {errors.full_name && <p className="field-error">{errors.full_name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email}
              onChange={(e) => set("email", e.target.value)} autoComplete="email" />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="role">Role</label>
            <select id="role" className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="employee">Employee</option>
              <option value="admin">HR</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={form.password}
              onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <div>
            <label className="label" htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" className="input" value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)} autoComplete="new-password" />
            {errors.confirm && <p className="field-error">{errors.confirm}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account…" : "Sign up"}
          </button>

          <p className="text-xs text-center text-ink/50">
            Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
