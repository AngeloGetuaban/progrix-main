const pool = require("../database/db");
const axios = require("axios");

const AI_URL = process.env.PYTHON_AI_URL || "http://localhost:8080";
const PLAIN_SITE_STACK = "html";
const SOURCE_FILE_PATTERN = /\.(html|css|js|json|svg|txt)$/i;
const BLOCKED_FILE_PATTERN = /(^|\/)(package-lock\.json|package\.json|next\.config|vite\.config|tsconfig|node_modules|README)/i;

// ─── POST /api/projects/:id/generate ─────────────────────────────────────────
exports.generateWebsite = async (req, res) => {
  const { id } = req.params;
  const { prompt, page_type = "landing" } = req.body;

  try {
    const [rows] = await pool.execute("SELECT * FROM projects WHERE id=? AND user_id=?", [id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "Project not found" });

    // Mark project as generating
    await pool.execute("UPDATE projects SET status='generating' WHERE id=?", [id]);

    // Save user message to chat
    await pool.execute(
      "INSERT INTO chat_messages (project_id, role, content) VALUES (?,?,?)",
      [id, "user", prompt]
    );

    const currentFiles = await _getProjectSourceFiles(id);
    const chatHistory = currentFiles.length > 0 ? await _getRecentChatHistory(id) : [];
    const designBrief = currentFiles.length > 0
      ? await _getLatestProjectPlan(id)
      : await _createAndSaveProjectPlan(id, prompt, page_type, "initial");

    const aiPath = currentFiles.length > 0 ? "edit" : "generate";
    const aiPayload = currentFiles.length > 0
      ? {
          project_id: parseInt(id),
          edit_prompt: prompt,
          stack: PLAIN_SITE_STACK,
          design_brief: designBrief,
          chat_history: chatHistory,
          current_files: currentFiles,
          stream: true,
        }
      : { prompt, stack: PLAIN_SITE_STACK, page_type, design_brief: designBrief, stream: true };

    // Stream mode: proxy SSE
    if (req.query.stream === "true") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-Accel-Buffering", "no");
      if (designBrief) {
        res.write(`data: ${JSON.stringify({ type: "plan", plan: designBrief })}\n\n`);
      }

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
      : { prompt, stack: PLAIN_SITE_STACK, page_type, design_brief: designBrief, stream: false }
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

    await pool.execute("UPDATE projects SET status='generating' WHERE id=?", [id]);

    // Fetch chat history (last 20)
    const [history] = await pool.execute(
      "SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at DESC LIMIT 20",
      [id]
    );
    const chatHistory = history.reverse();

    // Fetch current files
    const files = await _getProjectSourceFiles(id);

    // Save user edit message
    await pool.execute(
      "INSERT INTO chat_messages (project_id, role, content) VALUES (?,?,?)",
      [id, "user", edit_prompt]
    );

    const payload = {
      project_id: parseInt(id),
      edit_prompt,
      stack: PLAIN_SITE_STACK,
      design_brief: await _getLatestProjectPlan(id),
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

async function _createAndSaveProjectPlan(projectId, prompt, pageType, source = "initial") {
  try {
    const aiRes = await axios.post(
      `${AI_URL}/plan`,
      { prompt, page_type: pageType },
      { timeout: 120000, maxBodyLength: Infinity, maxContentLength: Infinity }
    );
    const plan = aiRes.data.data || _fallbackProjectPlan(prompt, pageType);
    await _saveProjectPlan(
      projectId,
      source,
      pageType,
      prompt,
      plan,
      aiRes.data.display_name,
      aiRes.data.provider
    );
    return plan;
  } catch (err) {
    const plan = _fallbackProjectPlan(prompt, pageType);
    await _saveProjectPlan(projectId, source, pageType, prompt, plan, null, null);
    return plan;
  }
}

async function _saveProjectPlan(projectId, source, pageType, prompt, plan, modelUsed, provider) {
  await pool.execute(
    `INSERT INTO project_ai_plans
      (project_id, source, page_type, prompt, plan_json, summary, model_used, provider)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      projectId,
      source,
      pageType || "landing",
      prompt || "",
      JSON.stringify(plan),
      _summarizeProjectPlan(plan),
      modelUsed,
      provider,
    ]
  );
}

async function _getLatestProjectPlan(projectId) {
  const [rows] = await pool.execute(
    "SELECT plan_json FROM project_ai_plans WHERE project_id=? ORDER BY created_at DESC, id DESC LIMIT 1",
    [projectId]
  );
  if (!rows.length) return null;
  try {
    return JSON.parse(rows[0].plan_json);
  } catch {
    return null;
  }
}

function _summarizeProjectPlan(plan) {
  if (!plan || typeof plan !== "object") return null;
  const type = plan.business_type || plan.archetype || "website";
  const goal = plan.primary_goal || "conversion";
  const sectionCount = Array.isArray(plan.sections) ? plan.sections.length : 0;
  return `${type} plan focused on ${goal}${sectionCount ? ` with ${sectionCount} sections` : ""}`;
}

function _fallbackProjectPlan(prompt, pageType) {
  return {
    business_type: "general",
    audience: "prospective customers",
    primary_goal: "encourage visitors to take action",
    tone: "modern, clear, trustworthy, polished",
    archetype: pageType || "general",
    visual_direction: "premium responsive landing page with strong hierarchy, generous spacing, polished cards, and a clear conversion path",
    palette: {
      primary: "#2563eb",
      secondary: "#0f172a",
      accent: "#38bdf8",
      background: "#f8fafc",
      text: "#0f172a",
    },
    typography: {
      heading: "bold geometric sans-serif",
      body: "clean readable sans-serif",
    },
    sections: [
      { id: "hero", goal: "state the value proposition", content_notes: prompt, visual_notes: "large headline, CTA, trust cue" },
      { id: "features", goal: "show key benefits", content_notes: "3-4 benefit cards", visual_notes: "responsive grid" },
      { id: "social-proof", goal: "build trust", content_notes: "testimonials or stats", visual_notes: "contrast section" },
      { id: "process", goal: "explain how it works", content_notes: "simple steps", visual_notes: "numbered layout" },
      { id: "contact", goal: "convert", content_notes: "clear call to action", visual_notes: "prominent CTA panel" },
    ],
    cta: { primary: "Get Started", secondary: "Learn More" },
    trust_elements: ["specific benefits", "professional presentation", "clear contact path"],
    interactive_elements: ["CTA hover states", "smooth anchor links"],
    content_strategy: `Use the user request as the core direction: ${prompt}`,
    quality_bar: ["responsive", "visually rich", "complete sections", "specific copy", "no framework"],
  };
}

async function _getProjectSourceFiles(projectId) {
  const [rows] = await pool.execute(
    `SELECT file_path, content
     FROM project_files
     WHERE project_id=?
       AND (
         file_path IN ('index.html', 'styles.css', 'script.js')
         OR file_path LIKE '%.html'
         OR file_path LIKE '%.css'
         OR file_path LIKE '%.js'
         OR file_path LIKE '%.json'
         OR file_path LIKE '%.svg'
         OR file_path LIKE '%.txt'
       )
     ORDER BY
       CASE
         WHEN file_path = 'index.html' THEN 0
         WHEN file_path LIKE '%.html' THEN 1
         WHEN file_path LIKE '%.css' THEN 2
         WHEN file_path LIKE '%.js' THEN 3
         ELSE 4
       END,
       file_path
     LIMIT 20`,
    [projectId]
  );

  return rows.filter((file) => _isAllowedProjectFile(file.file_path));
}

async function _getRecentChatHistory(projectId) {
  const [history] = await pool.execute(
    "SELECT role, content FROM chat_messages WHERE project_id=? ORDER BY created_at DESC LIMIT 10",
    [projectId]
  );
  return history.reverse();
}

function _isAllowedProjectFile(filePath) {
  if (!filePath || typeof filePath !== "string") return false;
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("..")) return false;
  if (BLOCKED_FILE_PATTERN.test(normalized)) return false;
  return SOURCE_FILE_PATTERN.test(normalized);
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

  const files = (parsed.files || [])
    .map((file) => ({
      filePath: file.path || file.file_path || file.filename,
      content: file.content || file.code || "",
    }))
    .filter((file) => _isAllowedProjectFile(file.filePath));

  if (!files.length) {
    await _markProjectError(
      projectId,
      "AI response did not include any valid plain HTML/CSS/JS files.",
      modelUsed,
      provider
    );
    return;
  }

  console.log(`[AI] Saving ${files.length} files for project ${projectId}`);
  const filePaths = new Set(files.map((file) => file.filePath));

  for (const file of files) {
    await pool.execute(
      `INSERT INTO project_files (project_id, file_path, content)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE content=VALUES(content), updated_at=NOW()`,
      [projectId, file.filePath, _normalizeGeneratedContent(file.filePath, file.content, filePaths)]
    );
  }

  const summary = parsed.summary || parsed.description || `${files.length} files generated`;
  await pool.execute(
    "INSERT INTO chat_messages (project_id, role, content, model_used, provider) VALUES (?,?,?,?,?)",
    [projectId, "assistant", summary, modelUsed, provider]
  );
  await pool.execute("UPDATE projects SET status='ready', stack=? WHERE id=?", [PLAIN_SITE_STACK, projectId]);
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

function _normalizeGeneratedContent(filePath, content, filePaths) {
  if (!filePath.toLowerCase().endsWith(".html")) return content;

  let html = String(content || "");
  html = html.replace(/<link\b[^>]*href=["']https:\/\/cdn\.tailwindcss\.com\/?["'][^>]*>/gi, "");

  const hasTailwindScript = /<script\b[^>]*src=["']https:\/\/cdn\.tailwindcss\.com\/?["'][^>]*>/i.test(html);
  if (!hasTailwindScript) {
    html = _insertBeforeCloseTag(html, "head", '<script src="https://cdn.tailwindcss.com"></script>');
  }

  html = html.replace(
    /<style\b([^>]*?)src=["']([^"']+\.css)["']([^>]*?)>\s*<\/style>/gi,
    (tag, before, src, after) => {
      const normalized = src.replace(/^\.?\//, "");
      return filePaths.has(normalized)
        ? `<link rel="stylesheet" href="${normalized}">`
        : "";
    }
  );

  return html;
}

function _insertBeforeCloseTag(html, tag, content) {
  const closeTag = new RegExp(`</${tag}>`, "i");
  if (closeTag.test(html)) return html.replace(closeTag, `${content}</${tag}>`);
  return tag === "head" ? `${content}${html}` : `${html}${content}`;
}
