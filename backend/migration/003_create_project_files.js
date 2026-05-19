/**
 * Migration 003 - Create project_files table (virtual filesystem)
 */
const pool = require("../database/db");

const sql = `
  CREATE TABLE IF NOT EXISTS project_files (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id  INT UNSIGNED NOT NULL,
    file_path   VARCHAR(500) NOT NULL,
    content     LONGTEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_project_file (project_id, file_path),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  try {
    await pool.execute(sql);
    console.log("✅ Migration 003: project_files table created");
  } catch (err) {
    console.error("❌ Migration 003 failed:", err.message);
  } finally {
    process.exit();
  }
})();
