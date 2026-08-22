const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "No token provided. Please sign in again." });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dayflow_super_secret_change_me");
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access only." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
