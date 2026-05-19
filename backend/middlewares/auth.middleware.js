const jwt  = require("jsonwebtoken");
const pool = require("../database/db");

exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [decoded.id]);
    if (!rows.length) return res.status(401).json({ error: "User not found" });
    req.user = rows[0];
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Access forbidden" });
  }
  next();
};
