// db/init.js
// Sets up the SQLite database (real, persistent, file-backed — not static JSON).
// The .db file is created on first run and updated live as the app is used.
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "dayflow.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','employee')),
  job_title TEXT DEFAULT 'Employee',
  department TEXT DEFAULT 'General',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  profile_picture TEXT DEFAULT '',
  is_verified INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT NOT NULL DEFAULT 'Present' CHECK(status IN ('Present','Absent','Half-day','Leave')),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK(leave_type IN ('Paid','Sick','Unpaid')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  remarks TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
  admin_comment TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  basic_salary REAL NOT NULL DEFAULT 0,
  allowances REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Seed one admin account on first run so there's always a way in.
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync("Admin@123", 10);
  const info = db.prepare(`
    INSERT INTO users (employee_code, full_name, email, password_hash, role, job_title, department)
    VALUES (?, ?, ?, ?, 'admin', 'HR Manager', 'Human Resources')
  `).run("ADM001", "Alex Morgan", "admin@dayflow.io", hash);

  db.prepare(`INSERT INTO payroll (user_id, basic_salary, allowances, deductions) VALUES (?, ?, ?, ?)`)
    .run(info.lastInsertRowid, 60000, 5000, 2000);

  console.log("Seeded default admin -> email: admin@dayflow.io  password: Admin@123");
}

module.exports = db;
