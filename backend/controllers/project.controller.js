const pool = require("../database/db");

// GET /api/projects
exports.getProjects = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM projects WHERE user_id=? ORDER BY updated_at DESC",
    [req.user.id]
  );
  res.json({ data: rows });
};

// POST /api/projects
exports.createProject = async (req, res) => {
  const { name, stack, description } = req.body;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      "INSERT INTO projects (user_id, name, stack, description) VALUES (?,?,?,?)",
      [req.user.id, name, stack, description]
    );

    const projectId = result.insertId;
    const scaffold = getScaffoldFiles(stack, name);

    for (const file of scaffold) {
      await conn.execute(
        "INSERT INTO project_files (project_id, file_path, content) VALUES (?,?,?)",
        [projectId, file.file_path, file.content]
      );
    }

    await conn.commit();
    res.status(201).json({ data: { id: projectId, name, stack, description, status: "draft" } });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// GET /api/projects/:id
exports.getProject = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM projects WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Project not found" });
  res.json({ data: rows[0] });
};

// PUT /api/projects/:id
exports.updateProject = async (req, res) => {
  const { name } = req.body;
  await pool.execute(
    "UPDATE projects SET name=? WHERE id=? AND user_id=?",
    [name, req.params.id, req.user.id]
  );
  res.json({ message: "Project updated" });
};

// DELETE /api/projects/:id
exports.deleteProject = async (req, res) => {
  await pool.execute("DELETE FROM projects WHERE id=? AND user_id=?", [req.params.id, req.user.id]);
  res.json({ message: "Project deleted" });
};

// GET /api/projects/:id/files
exports.getFiles = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT id, file_path, content, updated_at FROM project_files WHERE project_id=? ORDER BY file_path",
    [req.params.id]
  );
  res.json({ data: rows });
};

// GET /api/projects/:id/files/content?path=src/app/page.tsx
exports.getFileContent = async (req, res) => {
  const { path: filePath } = req.query;
  const [rows] = await pool.execute(
    "SELECT * FROM project_files WHERE project_id=? AND file_path=?",
    [req.params.id, filePath]
  );
  if (!rows.length) return res.status(404).json({ error: "File not found" });
  res.json({ data: rows[0] });
};

// GET /api/projects/:id/chat
exports.getChatHistory = async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT * FROM chat_messages WHERE project_id=? ORDER BY created_at ASC",
    [req.params.id]
  );
  res.json({ data: rows });
};

// GET /api/projects/:id/export  → ZIP download
exports.exportProject = async (req, res) => {
  const archiver = require("archiver");
  const [files] = await pool.execute(
    "SELECT file_path, content FROM project_files WHERE project_id=?",
    [req.params.id]
  );
  const [project] = await pool.execute("SELECT name FROM projects WHERE id=?", [req.params.id]);
  const projectName = project[0]?.name?.replace(/[^a-z0-9]/gi, "_") || "project";

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${projectName}.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  for (const file of files) {
    archive.append(file.content || "", { name: file.file_path });
  }
  await archive.finalize();
};

function getScaffoldFiles(stack, name = "Progrix Project") {
  return stack === "vite-react" ? getViteScaffold(name) : getNextScaffold(name);
}

function getViteScaffold(name) {
  return [
    {
      file_path: "package.json",
      content: JSON.stringify({
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: {
          "@vitejs/plugin-react": "latest",
          vite: "latest",
          typescript: "latest",
          react: "latest",
          "react-dom": "latest",
          "lucide-react": "latest"
        },
        devDependencies: {}
      }, null, 2),
    },
    {
      file_path: "index.html",
      content: `<div id="root"></div><script type="module" src="/src/main.tsx"></script>`,
    },
    {
      file_path: "src/main.tsx",
      content: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    },
    {
      file_path: "src/App.tsx",
      content: `export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">New project</p>
        <h1>${escapeTemplateText(name)}</h1>
        <p>Describe what to build and the AI will replace this scaffold with your website.</p>
      </section>
    </main>
  );
}
`,
    },
    {
      file_path: "src/index.css",
      content: `* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
.app-shell { min-height: 100vh; display: grid; place-items: center; padding: 48px 20px; }
.hero { max-width: 760px; }
.eyebrow { text-transform: uppercase; letter-spacing: .12em; color: #2563eb; font-size: 12px; font-weight: 700; }
h1 { font-size: clamp(40px, 8vw, 84px); line-height: .95; margin: 0 0 20px; }
p { font-size: 18px; line-height: 1.7; color: #475569; }
`,
    },
  ];
}

function getNextScaffold(name) {
  return [
    {
      file_path: "package.json",
      content: JSON.stringify({
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: {
          next: "latest",
          react: "latest",
          "react-dom": "latest",
          "lucide-react": "latest"
        },
        devDependencies: { typescript: "latest" }
      }, null, 2),
    },
    {
      file_path: "src/app/layout.tsx",
      content: `import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    },
    {
      file_path: "src/app/page.tsx",
      content: `export default function Page() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">New project</p>
        <h1>${escapeTemplateText(name)}</h1>
        <p>Describe what to build and the AI will replace this scaffold with your website.</p>
      </section>
    </main>
  );
}
`,
    },
    {
      file_path: "src/app/globals.css",
      content: `* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f8fafc;
  color: #0f172a;
}
.app-shell { min-height: 100vh; display: grid; place-items: center; padding: 48px 20px; }
.hero { max-width: 760px; }
.eyebrow { text-transform: uppercase; letter-spacing: .12em; color: #2563eb; font-size: 12px; font-weight: 700; }
h1 { font-size: clamp(40px, 8vw, 84px); line-height: .95; margin: 0 0 20px; }
p { font-size: 18px; line-height: 1.7; color: #475569; }
`,
    },
  ];
}

function escapeTemplateText(value) {
  return String(value || "Progrix Project").replace(/[\\`$]/g, "\\$&");
}
