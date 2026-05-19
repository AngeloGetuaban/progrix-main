/**
 * Migration 007 - Normalize saved HTML assets.
 */
const pool = require("../database/db");

function insertBeforeCloseTag(html, tag, content) {
  const closeTag = new RegExp(`</${tag}>`, "i");
  if (closeTag.test(html)) return html.replace(closeTag, `${content}</${tag}>`);
  return tag === "head" ? `${content}${html}` : `${html}${content}`;
}

function normalizeHtml(content, projectFilePaths) {
  let html = String(content || "");
  html = html.replace(/<link\b[^>]*href=["']https:\/\/cdn\.tailwindcss\.com\/?["'][^>]*>/gi, "");

  const hasTailwindScript = /<script\b[^>]*src=["']https:\/\/cdn\.tailwindcss\.com\/?["'][^>]*>/i.test(html);
  if (!hasTailwindScript) {
    html = insertBeforeCloseTag(html, "head", '<script src="https://cdn.tailwindcss.com"></script>');
  }

  html = html.replace(
    /<style\b([^>]*?)src=["']([^"']+\.css)["']([^>]*?)>\s*<\/style>/gi,
    (tag, before, src) => {
      const normalized = src.replace(/^\.?\//, "");
      return projectFilePaths.has(normalized)
        ? `<link rel="stylesheet" href="${normalized}">`
        : "";
    }
  );

  return html;
}

(async () => {
  try {
    const [files] = await pool.execute("SELECT id, project_id, file_path, content FROM project_files");
    const pathsByProject = new Map();
    for (const file of files) {
      const paths = pathsByProject.get(file.project_id) || new Set();
      paths.add(file.file_path);
      pathsByProject.set(file.project_id, paths);
    }

    let updated = 0;
    for (const file of files) {
      if (!file.file_path.toLowerCase().endsWith(".html")) continue;
      const next = normalizeHtml(file.content, pathsByProject.get(file.project_id) || new Set());
      if (next === file.content) continue;
      await pool.execute("UPDATE project_files SET content=? WHERE id=?", [next, file.id]);
      updated++;
    }

    console.log(`Migration 007: normalized ${updated} HTML file(s)`);
  } catch (err) {
    console.error("Migration 007 failed:", err.message);
  } finally {
    process.exit();
  }
})();
