/**
 * Migration 008 - Store AI planning briefs per project.
 */
const pool = require("../database/db");

const sql = `
  CREATE TABLE IF NOT EXISTS project_ai_plans (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id  INT UNSIGNED NOT NULL,
    source      ENUM('initial','edit','manual') NOT NULL DEFAULT 'initial',
    page_type   VARCHAR(50) NOT NULL DEFAULT 'landing',
    prompt      LONGTEXT NOT NULL,
    plan_json   LONGTEXT NOT NULL,
    summary     TEXT NULL,
    model_used  VARCHAR(100) NULL,
    provider    ENUM('ollama','vllm') NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_ai_plans_project_created (project_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

(async () => {
  try {
    await pool.execute(sql);
    console.log("Migration 008: project_ai_plans table created");
  } catch (err) {
    console.error("Migration 008 failed:", err.message);
  } finally {
    process.exit();
  }
})();
