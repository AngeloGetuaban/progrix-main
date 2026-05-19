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
  const { name, description } = req.body;
  const projectName = String(name || "").trim();
  const projectDescription = String(description || "").trim();

  if (!projectName) {
    return res.status(400).json({ error: "Project name is required" });
  }

  const [result] = await pool.execute(
    "INSERT INTO projects (user_id, name, stack, description) VALUES (?,?,?,?)",
    [req.user.id, projectName, "html", projectDescription]
  );

  res.status(201).json({
    data: {
      id: result.insertId,
      name: projectName,
      stack: "html",
      description: projectDescription,
      status: "draft",
    },
  });
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
    `SELECT pf.id, pf.file_path, pf.content, pf.updated_at
     FROM project_files pf
     JOIN projects p ON p.id = pf.project_id
     WHERE pf.project_id=? AND p.user_id=?
     ORDER BY pf.file_path`,
    [req.params.id, req.user.id]
  );
  res.json({ data: rows });
};

// GET /api/projects/:id/files/content?path=src/app/page.tsx
exports.getFileContent = async (req, res) => {
  const { path: filePath } = req.query;
  const [rows] = await pool.execute(
    `SELECT pf.*
     FROM project_files pf
     JOIN projects p ON p.id = pf.project_id
     WHERE pf.project_id=? AND p.user_id=? AND pf.file_path=?`,
    [req.params.id, req.user.id, filePath]
  );
  if (!rows.length) return res.status(404).json({ error: "File not found" });
  res.json({ data: rows[0] });
};

// GET /api/projects/:id/chat
exports.getChatHistory = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT cm.*
     FROM chat_messages cm
     JOIN projects p ON p.id = cm.project_id
     WHERE cm.project_id=? AND p.user_id=?
     ORDER BY cm.created_at ASC`,
    [req.params.id, req.user.id]
  );
  res.json({ data: rows });
};

// GET /api/projects/:id/export  → ZIP download
exports.exportProject = async (req, res) => {
  const archiver = require("archiver");
  const [project] = await pool.execute(
    "SELECT name FROM projects WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );
  if (!project.length) return res.status(404).json({ error: "Project not found" });

  const [files] = await pool.execute(
    "SELECT file_path, content FROM project_files WHERE project_id=?",
    [req.params.id]
  );
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
