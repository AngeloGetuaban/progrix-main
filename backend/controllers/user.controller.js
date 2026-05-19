const pool = require("../database/db");

// GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC"
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  const { name, avatar } = req.body;
  try {
    await pool.execute(
      "UPDATE users SET name = ?, avatar = ? WHERE id = ?",
      [name, avatar, req.params.id]
    );
    res.json({ message: "User updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    await pool.execute("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
