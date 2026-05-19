/**
 * Migration 005 - Create ai_models table + seed installed models
 *
 * Installed on Ubuntu server (CPU-only, 7.7GB RAM):
 *   Priority 1  → deepseek-coder:6.7b  (best code, ~3.8GB)
 *   Priority 2  → phi3.5               (fast, great code, ~2.2GB)
 *   Priority 3  → qwen2.5:3b           (good code + general, ~2GB)
 *   Priority 4  → llama3.2:3b          (general fallback, ~2GB)
 *   Priority 5  → llama3.2:1b          (lightest, fastest fallback, ~1.3GB)
 */
const pool = require("../database/db");

const createTable = `
  CREATE TABLE IF NOT EXISTS ai_models (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    display_name  VARCHAR(150) NOT NULL,
    provider      ENUM('ollama','vllm') NOT NULL,
    is_active     TINYINT(1) DEFAULT 1,
    priority      INT DEFAULT 10,
    context_size  INT DEFAULT 8192,
    last_checked  TIMESTAMP NULL,
    is_healthy    TINYINT(1) DEFAULT 1,
    notes         TEXT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const seedModels = [
  /* ── Ollama (installed, CPU-only server) ────────────────────── */
  // [name, display_name, provider, priority, is_active, is_healthy, context_size, notes]
  ["deepseek-coder:6.7b", "DeepSeek Coder 6.7B",  "ollama", 1, 1, 1,  16384, "Best code quality on this server"],
  ["phi3.5",              "Phi 3.5",               "ollama", 2, 1, 1, 131072, "Fast, strong coding, long context"],
  ["qwen2.5:3b",          "Qwen 2.5 3B",           "ollama", 3, 1, 1,  32768, "Balanced code + general use"],
  ["llama3.2:3b",         "Llama 3.2 3B",          "ollama", 4, 1, 1, 131072, "General fallback"],
  ["llama3.2:1b",         "Llama 3.2 1B",          "ollama", 5, 1, 1, 131072, "Lightest, fastest last-resort fallback"],
];

(async () => {
  try {
    await pool.execute(createTable);
    console.log("✅ ai_models table created");

    for (const [name, display_name, provider, priority, is_active, is_healthy, context_size, notes] of seedModels) {
      await pool.execute(
        `INSERT IGNORE INTO ai_models
          (name, display_name, provider, priority, is_active, is_healthy, context_size, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, display_name, provider, priority, is_active, is_healthy, context_size, notes]
      );
    }
    console.log(`✅ Seeded ${seedModels.length} AI models`);
    console.log("   Note: vLLM models are seeded as inactive (is_active=0) by default.");
    console.log("   Enable them in the admin panel after starting your vLLM server.");
  } catch (err) {
    console.error("❌ Migration 005 failed:", err.message);
  } finally {
    process.exit();
  }
})();
