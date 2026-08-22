const express = require("express");
const db = require("../db/init");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function withNet(row) {
  if (!row) return row;
  const net = (row.basic_salary || 0) + (row.allowances || 0) - (row.deductions || 0);
  return { ...row, net_salary: net };
}

router.get("/me", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM payroll WHERE user_id = ?").get(req.user.id);
  res.json({ payroll: withNet(row) });
});

router.get("/", requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, u.full_name, u.employee_code, u.department
    FROM payroll p JOIN users u ON u.id = p.user_id
    ORDER BY u.full_name ASC
  `).all();
  res.json({ payroll: rows.map(withNet) });
});

router.put("/:userId", requireAuth, requireAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const { basic_salary, allowances, deductions } = req.body || {};

  for (const [label, val] of [["basic_salary", basic_salary], ["allowances", allowances], ["deductions", deductions]]) {
    if (val === undefined) continue;
    if (typeof val !== "number" || Number.isNaN(val) || val < 0) {
      return res.status(400).json({ error: `${label.replace("_", " ")} must be a non-negative number.` });
    }
  }

  const existing = db.prepare("SELECT * FROM payroll WHERE user_id = ?").get(userId);
  if (!existing) return res.status(404).json({ error: "Payroll record not found." });

  db.prepare(`
    UPDATE payroll SET
      basic_salary = COALESCE(?, basic_salary),
      allowances = COALESCE(?, allowances),
      deductions = COALESCE(?, deductions),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(basic_salary, allowances, deductions, userId);

  const row = db.prepare("SELECT * FROM payroll WHERE user_id = ?").get(userId);
  res.json({ payroll: withNet(row) });
});

module.exports = router;
