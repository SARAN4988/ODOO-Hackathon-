const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/init");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// at least 8 chars, one uppercase, one lowercase, one number, one special char
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, full_name: user.full_name, email: user.email },
    process.env.JWT_SECRET || "dayflow_super_secret_change_me",
    { expiresIn: "8h" }
  );
}

function publicUser(u) {
  const { password_hash, ...rest } = u;
  return rest;
}

router.post("/signup", (req, res) => {
  const { employee_code, full_name, email, password, role } = req.body || {};

  if (!employee_code || !full_name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (!PASSWORD_RE.test(password)) {
    return res.status(400).json({
      error: "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character."
    });
  }
  if (!["admin", "employee"].includes(role)) {
    return res.status(400).json({ error: "Role must be Employee or HR." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ? OR employee_code = ?").get(email, employee_code);
  if (existing) {
    return res.status(409).json({ error: "An account with that email or employee ID already exists." });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (employee_code, full_name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(employee_code, full_name, email, hash, role);

  db.prepare(`INSERT INTO payroll (user_id, basic_salary, allowances, deductions) VALUES (?, 0, 0, 0)`)
    .run(info.lastInsertRowid);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

module.exports = router;
