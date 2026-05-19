/**
 * Migration 002 - Create projects table
 */
const pool = require("../database/db");

const sql = `
  CREATE TABLE IF NOT EXISTS projects (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    name        VARCHAR(255) NOT NULL,
    stack       ENUM('vite-react','nextjs') NOT NULL DEFAULT 'nextjs',
    description TEXT,
    status      ENUM('draft','generating','ready','error') DEFAULT 'draft',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  try {
    await pool.execute(sql);
    console.log("✅ Migration 002: projects table created");
  } catch (err) {
    console.error("❌ Migration 002 failed:", err.message);
  } finally {
    process.exit();
  }
})();
