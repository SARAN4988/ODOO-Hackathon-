const express = require("express");
const db = require("../db/init");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SESSIONS = ["Full Day", "First Half", "Second Half"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.get("/me", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC"
  ).all(req.user.id);
  res.json({ leave: rows });
});

// Employee: unseen leave decisions (approved/rejected by HR), for the notification bar
router.get("/notifications", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM leave_requests
    WHERE user_id = ? AND status != 'Pending' AND seen_by_employee = 0
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ notifications: rows });
});

// Employee: mark one or all notifications as read
router.put("/notifications/read", requireAuth, (req, res) => {
  const { id } = req.body || {};
  if (id) {
    db.prepare("UPDATE leave_requests SET seen_by_employee = 1 WHERE id = ? AND user_id = ?")
      .run(Number(id), req.user.id);
  } else {
    db.prepare("UPDATE leave_requests SET seen_by_employee = 1 WHERE user_id = ? AND seen_by_employee = 0")
      .run(req.user.id);
  }
  res.json({ ok: true });
});

router.post("/", requireAuth, (req, res) => {
  const { leave_type, start_date, end_date, session, remarks } = req.body || {};

  if (!leave_type || !["Paid", "Sick", "Unpaid"].includes(leave_type)) {
    return res.status(400).json({ error: "Select a valid leave type." });
  }
  if (!start_date || !end_date || !DATE_RE.test(start_date) || !DATE_RE.test(end_date)) {
    return res.status(400).json({ error: "Provide a valid start and end date (YYYY-MM-DD)." });
  }
  if (start_date < todayStr()) {
    return res.status(400).json({ error: "Start date cannot be in the past." });
  }
  if (end_date < start_date) {
    return res.status(400).json({ error: "End date cannot be before the start date." });
  }
  const sessionValue = session || "Full Day";
  if (!SESSIONS.includes(sessionValue)) {
    return res.status(400).json({ error: "Select a valid time slot." });
  }
  if (sessionValue !== "Full Day" && start_date !== end_date) {
    return res.status(400).json({ error: "Half-day time slots can only be used for a single-day request." });
  }
  if (remarks && remarks.length > 300) {
    return res.status(400).json({ error: "Remarks must be under 300 characters." });
  }

  const info = db.prepare(`
    INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, session, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, leave_type, start_date, end_date, sessionValue, remarks || "");

  const row = db.prepare("SELECT * FROM leave_requests WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ leave: row });
});

// Admin: view all leave requests, optional ?status=Pending
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const status = req.query.status;
  let rows;
  if (status && ["Pending", "Approved", "Rejected"].includes(status)) {
    rows = db.prepare(`
      SELECT l.*, u.full_name, u.employee_code, u.department
      FROM leave_requests l JOIN users u ON u.id = l.user_id
      WHERE l.status = ? ORDER BY l.created_at DESC
    `).all(status);
  } else {
    rows = db.prepare(`
      SELECT l.*, u.full_name, u.employee_code, u.department
      FROM leave_requests l JOIN users u ON u.id = l.user_id
      ORDER BY l.created_at DESC
    `).all();
  }
  res.json({ leave: rows });
});

// Admin: approve/reject
router.put("/:id", requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status, admin_comment } = req.body || {};
  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be Approved or Rejected." });
  }
  const existing = db.prepare("SELECT * FROM leave_requests WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Leave request not found." });

  // seen_by_employee resets to 0 (unread) so the employee gets notified of this decision
  db.prepare("UPDATE leave_requests SET status = ?, admin_comment = ?, seen_by_employee = 0 WHERE id = ?")
    .run(status, admin_comment || "", id);

  // If approved, mark each day in range in attendance (Half-day for a half-day session, else Leave)
  if (status === "Approved") {
    const start = new Date(existing.start_date);
    const end = new Date(existing.end_date);
    const attStatus = existing.session && existing.session !== "Full Day" ? "Half-day" : "Leave";
    const insert = db.prepare(`
      INSERT INTO attendance (user_id, date, status) VALUES (?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET status = excluded.status
    `);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      insert.run(existing.user_id, d.toISOString().slice(0, 10), attStatus);
    }
  }

  const row = db.prepare("SELECT * FROM leave_requests WHERE id = ?").get(id);
  res.json({ leave: row });
});

module.exports = router;
