const express = require("express");
const db = require("../db/init");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  return new Date().toISOString().slice(11, 19);
}

// Employee: my attendance (optionally filter by range, defaults to last 14 days)
router.get("/me", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 60"
  ).all(req.user.id);
  res.json({ attendance: rows });
});

// Admin: attendance for everyone (today by default, or ?date=YYYY-MM-DD)
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const date = req.query.date || todayStr();
  const rows = db.prepare(`
    SELECT a.*, u.full_name, u.employee_code, u.department
    FROM attendance a JOIN users u ON u.id = a.user_id
    WHERE a.date = ?
    ORDER BY u.full_name ASC
  `).all(date);
  res.json({ date, attendance: rows });
});

router.post("/checkin", requireAuth, (req, res) => {
  const date = todayStr();
  const existing = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(req.user.id, date);
  if (existing && existing.check_in) {
    return res.status(409).json({ error: "You have already checked in today." });
  }
  if (existing) {
    db.prepare("UPDATE attendance SET check_in = ?, status = 'Present' WHERE id = ?").run(nowTime(), existing.id);
  } else {
    db.prepare(
      "INSERT INTO attendance (user_id, date, check_in, status) VALUES (?, ?, ?, 'Present')"
    ).run(req.user.id, date, nowTime());
  }
  const row = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(req.user.id, date);
  res.json({ attendance: row });
});

router.post("/checkout", requireAuth, (req, res) => {
  const date = todayStr();
  const existing = db.prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?").get(req.user.id, date);
  if (!existing || !existing.check_in) {
    return res.status(400).json({ error: "Check in before checking out." });
  }
  if (existing.check_out) {
    return res.status(409).json({ error: "You have already checked out today." });
  }
  db.prepare("UPDATE attendance SET check_out = ? WHERE id = ?").run(nowTime(), existing.id);
  const row = db.prepare("SELECT * FROM attendance WHERE id = ?").get(existing.id);
  res.json({ attendance: row });
});

module.exports = router;
