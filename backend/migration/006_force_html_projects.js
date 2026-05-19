/**
 * Migration 006 - Convert projects to plain HTML sites.
 */
const pool = require("../database/db");

const steps = [
  "ALTER TABLE projects MODIFY stack ENUM('html','vite-react','nextjs') NOT NULL DEFAULT 'html'",
  "UPDATE projects SET stack='html' WHERE stack <> 'html'",
  "ALTER TABLE projects MODIFY stack ENUM('html') NOT NULL DEFAULT 'html'",
];

(async () => {
  try {
    for (const sql of steps) {
      await pool.execute(sql);
    }
    console.log("Migration 006: projects converted to HTML stack");
  } catch (err) {
    console.error("Migration 006 failed:", err.message);
  } finally {
    process.exit();
  }
})();
