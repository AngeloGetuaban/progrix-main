/**
 * Migration 004 - Create chat_messages table
 */
const pool = require("../database/db");

const sql = `
  CREATE TABLE IF NOT EXISTS chat_messages (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id  INT UNSIGNED NOT NULL,
    role        ENUM('user','assistant') NOT NULL,
    content     LONGTEXT NOT NULL,
    model_used  VARCHAR(100) NULL,
    provider    ENUM('ollama','vllm') NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  try {
    await pool.execute(sql);
    console.log("✅ Migration 004: chat_messages table created");
  } catch (err) {
    console.error("❌ Migration 004 failed:", err.message);
  } finally {
    process.exit();
  }
})();
