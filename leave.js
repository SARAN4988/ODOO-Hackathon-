const express = require("express");
const db = require("../db/init");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get("/me", requireAuth, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC"
  ).all(req.user.id);
  res.json({ leave: rows });
});

router.post("/", requireAuth, (req, res) => {
  const { leave_type, start_date, end_date, remarks } = req.body || {};

  if (!leave_type || !["Paid", "Sick", "Unpaid"].includes(leave_type)) {
    return res.status(400).json({ error: "Select a valid leave type." });
  }
  if (!start_date || !end_date || !DATE_RE.test(start_date) || !DATE_RE.test(end_date)) {
    return res.status(400).json({ error: "Provide a valid start and end date (YYYY-MM-DD)." });
  }
  if (new Date(end_date) < new Date(start_date)) {
    return res.status(400).json({ error: "End date cannot be before the start date." });
  }
  if (remarks && remarks.length > 300) {
    return res.status(400).json({ error: "Remarks must be under 300 characters." });
  }

  const info = db.prepare(`
    INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, remarks)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, leave_type, start_date, end_date, remarks || "");

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

  db.prepare("UPDATE leave_requests SET status = ?, admin_comment = ? WHERE id = ?")
    .run(status, admin_comment || "", id);

  // If approved, mark each day in range as 'Leave' in attendance
  if (status === "Approved") {
    const start = new Date(existing.start_date);
    const end = new Date(existing.end_date);
    const insert = db.prepare(`
      INSERT INTO attendance (user_id, date, status) VALUES (?, ?, 'Leave')
      ON CONFLICT(user_id, date) DO UPDATE SET status = 'Leave'
    `);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      insert.run(existing.user_id, d.toISOString().slice(0, 10));
    }
  }

  const row = db.prepare("SELECT * FROM leave_requests WHERE id = ?").get(id);
  res.json({ leave: row });
});

module.exports = router;
