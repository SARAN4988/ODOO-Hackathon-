const express = require("express");
const db = require("../db/init");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function publicUser(u) {
  const { password_hash, ...rest } = u;
  return rest;
}

// Admin: list all employees
router.get("/", requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare("SELECT * FROM users ORDER BY full_name ASC").all();
  res.json({ employees: users.map(publicUser) });
});

// Get one profile (self, or any if admin)
router.get("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (req.user.role !== "admin" && req.user.id !== id) {
    return res.status(403).json({ error: "You can only view your own profile." });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "Employee not found." });
  res.json({ employee: publicUser(user) });
});

// Update profile: employees can edit limited fields, admin can edit all
router.put("/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const isSelf = req.user.id === id;
  const isAdmin = req.user.role === "admin";
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: "You can only edit your own profile." });
  }

  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "Employee not found." });

  const body = req.body || {};
  const addressFields = ["address_door_no", "address_street", "address_district", "address_state", "address_pincode"];
  const allowedForEmployee = ["phone", "profile_picture", ...addressFields];
  const allowedForAdmin = [
    "full_name", "job_title", "department", "phone", "profile_picture", "role", ...addressFields
  ];
  const allowed = isAdmin ? allowedForAdmin : allowedForEmployee;

  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (updates.phone !== undefined && updates.phone !== "" && !/^[0-9+\-\s()]{6,20}$/.test(updates.phone)) {
    return res.status(400).json({ error: "Enter a valid phone number." });
  }
  if (updates.address_pincode !== undefined && updates.address_pincode !== "" && !/^\d{6}$/.test(updates.address_pincode)) {
    return res.status(400).json({ error: "Enter a valid 6-digit PIN code." });
  }
  for (const f of ["address_door_no", "address_street", "address_district", "address_state"]) {
    if (updates[f] !== undefined && updates[f].length > 100) {
      return res.status(400).json({ error: `${f.replace("address_", "").replace("_", " ")} must be under 100 characters.` });
    }
  }
  if (updates.role !== undefined && !["admin", "employee"].includes(updates.role)) {
    return res.status(400).json({ error: "Role must be Employee or HR." });
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields provided to update." });
  }

  // Keep the legacy `address` free-text column in sync so any older code reading it still works.
  const merged = { ...target, ...updates };
  updates.address = [merged.address_door_no, merged.address_street, merged.address_district, merged.address_state, merged.address_pincode]
    .filter(Boolean).join(", ");

  const setClause = Object.keys(updates).map((k) => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE users SET ${setClause} WHERE id = @id`).run({ ...updates, id });

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.json({ employee: publicUser(updated) });
});

module.exports = router;
