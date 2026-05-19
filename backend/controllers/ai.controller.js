const pool = require("../database/db");
const axios = require("axios");

const AI_URL = process.env.PYTHON_AI_URL || "http://localhost:8080";

// ─── POST /api/projects/:id/generate ─────────────────────────────────────────
exports.generateWebsite = async (req, res) => {
  const { id } = req.params;
  const { prompt, page_type = "landing" } = req.body;

  try {
    // Get project to know the stack
    const [rows] = await pool.execute("SELECT * FROM projects WHERE id=? AND user_id=?", [id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "Project not found" });
    const project = rows[0];

    // Mark project as generating
    await pool.execute("UPDATE projects SET status='generating' WHERE id=?", [id]);

    // Save user message to chat
    await pool.execute(
      "INSERT INTO chat_messages (project_id, role, content) VALUES (?,?,?)",
      [id, "user", prompt]
    );

    const [currentFiles] = await pool.execute(
      "SELECT file_path, content FROM project_files WHERE project_id=?",
      [id]
    );

    const aiPath = currentFiles.length > 0 ? "edit" : "generate";
    const aiPayload = currentFiles.length > 0
      ? {
          project_id: parseInt(id),
          edit_prompt: prompt,
          stack: project.stack,
          chat_history: [],
          current_files: currentFiles,
          stream: true,
        }
      : { prompt, stack: project.stack, page_type, stream: true };

    // Stream mode: proxy SSE
    if (req.query.stream === "true") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");

      const aiRes = await axios.post(
        `${AI_URL}/${aiPath}?stream=true`,
        aiPayload,
        { responseType: "stream", timeout: 0, maxBodyLength: Infinity, maxContentLength: Infinity }
      );

      let fullContent = "";
      let modelUsed = null;
      let provider = null;

      let savePromise = Promise.resolve();

      aiRes.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let payload;
          try { payload = JSON.parse(line.slice(6)); } catch { continue; }
          if (payload.type === "model") {
            modelUsed = payload.model;
            provider = payload.provider;
          } else if (payload.type === "token") {
            fullContent += payload.content;
          } else if (payload.type === "done") {
            // Use accumulated fullContent (most reliable) or payload.full_content
            const raw = fullContent || payload.full_content || "";
            console.log("[AI] done event received, raw length:", raw.length);
            savePromise = _saveGeneratedFiles(id, raw, modelUsed, provider)
              .catch((err) => _markProjectError(id, err.message || "Failed to save generated files", modelUsed, provider));
          } else if (payload.type === "error" || payload.error) {
            const message = payload.message || payload.error || "AI generation failed";
            savePromise = _markProjectError(id, message, modelUsed, provider);
          }
          res.write(line + "\n\n");
        }
      });

      aiRes.data.on("end", async () => {
        try { await savePromise; } catch (err) { console.error(err); }
        res.end();
      });
      aiRes.data.on("error", async (err) => {
        try { await _markProjectError(id, err.message || "AI stream failed", modelUsed, provider); } catch (saveErr) { console.error(saveErr); }
        res.end();
      });
      return;
    }

    // Non-stream mode
    const aiRes = await axios.post(`${AI_URL}/${aiPath}`, currentFiles.length > 0
      ? { ...aiPayload, stream: false }
      : { prompt, stack: project.stack, page_type, stream: false }
    );

    await _saveGeneratedFiles(id, aiRes.data.content, aiRes.data.display_name, aiRes.data.provider);
    res.json({ success: true, data: aiRes.data.data });

  } catch (err) {
    await pool.execute("UPDATE projects SET status='error' WHERE id=?", [id]);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/projects/:id/edit ─────────────────────────────────────────────
exports.editWebsite = async (req, res) => {
  const { id } = req.params;
  const { edit_prompt, stream: doStream } = req.body;

  try {
    const [rows] = await pool.execute("SELECT * FROM projects WHERE id=? AND user_id=?", [id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "Project not found" });
    const project = rows[0];

    await pool.execute("UPDATE projects SET status='generating' WHERE id=?", [id]);

    // Fetch chat history (last 20)
    const [history] = await pool.execute(
      "SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at DESC LIMIT 20",
      [id]
    );
    const chatHistory = history.reverse();

    // Fetch current files
    const [files] = await pool.execute(
      "SELECT file_path, content FROM project_files WHERE project_id=?",
      [id]
    );

    // Save user edit message
    await pool.execute(
      "INSERT INTO chat_messages (project_id, role, content) VALUES (?,?,?)",
      [id, "user", edit_prompt]
    );

    const payload = {
      project_id: parseInt(id),
      edit_prompt,
      stack: project.stack,
      chat_history: chatHistory,
      current_files: files,
      stream: !!doStream,
    };

    if (doStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");

      const aiRes = await axios.post(`${AI_URL}/edit`, payload, { responseType: "stream", timeout: 0, maxBodyLength: Infinity, maxContentLength: Infinity });
      let fullContent = "";
      let modelUsed = null;
      let provider = null;

      let savePromise = Promise.resolve();

      aiRes.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let data;
          try { data = JSON.parse(line.slice(6)); } catch { continue; }
          if (data.type === "model") { modelUsed = data.model; provider = data.provider; }
          if (data.type === "token") { fullContent += data.content; }
          if (data.type === "done") {
            const raw = fullContent || data.full_content || "";
            console.log("[AI] edit done, raw length:", raw.length);
            savePromise = _saveEditFiles(id, raw, modelUsed, provider)
              .catch((err) => _markProjectError(id, err.message || "Failed to save edited files", modelUsed, provider));
          }
          if (data.type === "error" || data.error) {
            const msg = data.message || data.error || "AI edit failed";
            savePromise = _markProjectError(id, msg, modelUsed, provider);
          }
          res.write(line + "\n\n");
        }
      });
      aiRes.data.on("end", async () => {
        try { await savePromise; } catch (err) { console.error(err); }
        res.end();
      });
      aiRes.data.on("error", async (err) => {
        try { await _markProjectError(id, err.message || "AI stream failed", modelUsed, provider); } catch (saveErr) { console.error(saveErr); }
        res.end();
      });
      return;
    }

    const aiRes = await axios.post(`${AI_URL}/edit`, payload);
    await _saveEditFiles(id, aiRes.data.content, aiRes.data.display_name, aiRes.data.provider);
    res.json({ success: true, data: aiRes.data.data });

  } catch (err) {
    await pool.execute("UPDATE projects SET status='error' WHERE id=?", [id]);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/ai/models ───────────────────────────────────────────────────────
exports.listModels = async (req, res) => {
  try {
    const aiRes = await axios.get(`${AI_URL}/models`);
    res.json(aiRes.data);
  } catch (err) {
    // Fallback: read from DB directly
    const [rows] = await pool.execute("SELECT * FROM ai_models ORDER BY priority ASC");
    res.json({ models: rows });
  }
};

// ─── POST /api/ai/models/:id/health-check ────────────────────────────────────
exports.healthCheck = async (req, res) => {
  try {
    const aiRes = await axios.post(`${AI_URL}/models/${req.params.id}/health-check`);
    res.json(aiRes.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function _parseAIResponse(rawContent) {
  if (!rawContent || typeof rawContent !== "string") return null;

  // 1. Try direct JSON parse
  try { return JSON.parse(rawContent); } catch {}

  // 2. Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }

  // 3. Extract first {...} block (greedy)
  const braceMatch = rawContent.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch {}
  }

  console.error("[AI] Failed to parse response. First 500 chars:", rawContent.slice(0, 500));
  return null;
}

async function _saveGeneratedFiles(projectId, rawContent, modelUsed, provider) {
  const parsed = _parseAIResponse(rawContent);

  if (!parsed) {
    console.error("[AI] No parseable JSON found for project", projectId);
    await pool.execute("UPDATE projects SET status='error' WHERE id=?", [projectId]);
    await pool.execute(
      "INSERT INTO chat_messages (project_id, role, content, model_used, provider) VALUES (?,?,?,?,?)",
      [projectId, "assistant", "Error: Could not parse AI response. Try regenerating.", modelUsed, provider]
    );
    return;
  }

  const files = parsed.files || [];
  console.log(`[AI] Saving ${files.length} files for project ${projectId}`);

  for (const file of files) {
    // Support both file.path and file.file_path
    const filePath = file.path || file.file_path || file.filename;
    const content  = file.content || file.code || "";
    if (!filePath) { console.warn("[AI] Skipping file with no path:", file); continue; }
    await pool.execute(
      `INSERT INTO project_files (project_id, file_path, content)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE content=VALUES(content), updated_at=NOW()`,
      [projectId, filePath, content]
    );
  }

  const summary = parsed.summary || parsed.description || `${files.length} files generated`;
  await pool.execute(
    "INSERT INTO chat_messages (project_id, role, content, model_used, provider) VALUES (?,?,?,?,?)",
    [projectId, "assistant", summary, modelUsed, provider]
  );
  await pool.execute("UPDATE projects SET status='ready' WHERE id=?", [projectId]);
  console.log(`[AI] Project ${projectId} saved successfully — ${files.length} files, status=ready`);
}

async function _saveEditFiles(projectId, rawContent, modelUsed, provider) {
  return _saveGeneratedFiles(projectId, rawContent, modelUsed, provider);
}

async function _markProjectError(projectId, message, modelUsed, provider) {
  await pool.execute("UPDATE projects SET status='error' WHERE id=?", [projectId]);
  await pool.execute(
    "INSERT INTO chat_messages (project_id, role, content, model_used, provider) VALUES (?,?,?,?,?)",
    [projectId, "assistant", `Error: ${message}`, modelUsed, provider]
  );
}
