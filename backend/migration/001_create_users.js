/**
 * Migration 001 - Create users table
 * Run: node backend/migration/001_create_users.js
 */

const pool = require("../database/db");

const sql = `
  CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255)        NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255)        NOT NULL,
    role          ENUM('admin','user') DEFAULT 'user',
    avatar        VARCHAR(500)        NULL,
    created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  try {
    await pool.execute(sql);
    console.log("✅ Migration 001: users table created");
  } catch (err) {
    console.error("❌ Migration 001 failed:", err.message);
  } finally {
    process.exit();
  }
})();
