"""
Progrix AI Gateway — FastAPI
Dynamic model router → Ollama | vLLM
"""

import os
import json
import asyncio
import re
import urllib.error
import urllib.request
from typing import AsyncGenerator

import aiomysql
import litellm
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ─── Silence liteLLM non-essential logs ──────────────────────────────────────
litellm.set_verbose = os.getenv("LITELLM_VERBOSE", "false").lower() == "true"

app = FastAPI(title="Progrix AI Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKEND_URL", "http://localhost:5000"),
                   os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB pool (shared) ────────────────────────────────────────────────────────
_pool: aiomysql.Pool | None = None

async def get_pool() -> aiomysql.Pool:
    global _pool
    if _pool is None:
        _pool = await aiomysql.create_pool(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 3306)),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            db=os.getenv("DB_NAME", "progrix"),
            autocommit=True,
        )
    return _pool

@app.on_event("shutdown")
async def shutdown():
    if _pool:
        _pool.close()
        await _pool.wait_closed()

# ─── Model router ────────────────────────────────────────────────────────────

PROVIDER_BASE = {
    "ollama": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
    "vllm":   os.getenv("VLLM_BASE_URL",   "http://localhost:8000"),
}

GENERATION_TIMEOUT = int(os.getenv("GENERATION_TIMEOUT", "240"))
QWEN_GENERATION_TIMEOUT = int(os.getenv("QWEN_GENERATION_TIMEOUT", "600"))
MAX_OUTPUT_TOKENS = int(os.getenv("MAX_OUTPUT_TOKENS", "5500"))
GENERATION_TEMPERATURE = float(os.getenv("GENERATION_TEMPERATURE", "0.15"))

async def fetch_active_models() -> list[dict]:
    """Healthy models first (by priority), then unhealthy ones as last-resort fallback."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """SELECT * FROM ai_models
                   WHERE is_active = 1
                   ORDER BY priority ASC, is_healthy DESC"""
            )
            models = await cur.fetchall()

    return await filter_available_models(models)

async def mark_model_health(model_id: int, healthy: bool):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE ai_models SET is_healthy=%s, last_checked=NOW() WHERE id=%s",
                (1 if healthy else 0, model_id)
            )

async def filter_available_models(models: list[dict]) -> list[dict]:
    """Skip active Ollama rows whose model is not installed locally."""
    ollama_models = [m for m in models if m["provider"] == "ollama"]
    if not ollama_models:
        return models

    installed = await fetch_installed_ollama_models()
    if installed is None:
        return models

    filtered: list[dict] = []
    for model in models:
        if model["provider"] != "ollama":
            filtered.append(model)
            continue
        if is_ollama_model_installed(model["name"], installed):
            filtered.append(model)
        else:
            await mark_model_health(model["id"], False)

    return filtered

async def fetch_installed_ollama_models() -> set[str] | None:
    def _fetch() -> set[str] | None:
        url = f"{PROVIDER_BASE['ollama'].rstrip('/')}/api/tags"
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return None

        names: set[str] = set()
        for item in data.get("models", []):
            name = item.get("name") or item.get("model")
            if name:
                names.add(name)
        return names

    return await asyncio.to_thread(_fetch)

def is_ollama_model_installed(name: str, installed: set[str]) -> bool:
    return (
        name in installed
        or f"{name}:latest" in installed
        or name.split(":")[0] in {item.split(":")[0] for item in installed}
    )

def build_litellm_model_str(model: dict) -> tuple[str, str, str]:
    """Returns (litellm_model_str, api_base, api_key)"""
    provider = model["provider"]
    name = model["name"]
    base = PROVIDER_BASE[provider]
    if provider == "ollama":
        return f"ollama/{name}", base, ""
    else:  # vllm → OpenAI-compatible
        return f"openai/{name}", f"{base}/v1", "EMPTY"

def generation_timeout_for(model: dict) -> int:
    name = (model.get("name") or "").lower()
    if name.startswith("qwen2.5-coder"):
        return QWEN_GENERATION_TIMEOUT
    return GENERATION_TIMEOUT

async def generate_with_fallback(messages: list[dict]) -> dict:
    """Try models in priority order, fallback on failure."""
    models = await fetch_active_models()
    if not models:
        raise HTTPException(503, "No AI models configured. Check your ai_models table.")

    connection_fails = 0
    last_error = ""
    for model in models:
        model_str, api_base, api_key = build_litellm_model_str(model)
        try:
            response = await asyncio.to_thread(
                litellm.completion,
                model=model_str,
                messages=messages,
                api_base=api_base,
                api_key=api_key or None,
                timeout=generation_timeout_for(model),
                max_tokens=MAX_OUTPUT_TOKENS,
                temperature=GENERATION_TEMPERATURE,
            )
            await mark_model_health(model["id"], True)
            return {
                "content": response.choices[0].message.content,
                "model_id": model["id"],
                "model_name": model["name"],
                "display_name": model["display_name"],
                "provider": model["provider"],
            }
        except Exception as e:
            last_error = str(e)
            if _is_model_unavailable_error(last_error):
                connection_fails += 1
                await mark_model_health(model["id"], False)
                continue
            raise HTTPException(503, f"{model['display_name']} failed during generation: {last_error[:180]}")

    if connection_fails == len(models):
        raise HTTPException(503, "Ollama is not running. Start Ollama (run ollama serve) and try again.")
    raise HTTPException(503, f"All models failed. Last error: {last_error}")

_UNAVAILABLE_KEYWORDS = (
    "connection refused",
    "connect error",
    "connection error",
    "unreachable",
    "not found",
    "model not found",
    "no such model",
    "404",
)

def _is_model_unavailable_error(err: str) -> bool:
    low = err.lower()
    return any(k in low for k in _UNAVAILABLE_KEYWORDS)

async def stream_with_fallback(messages: list[dict]) -> AsyncGenerator[str, None]:
    """Stream tokens, falling back to next model if first fails."""
    models = await fetch_active_models()
    if not models:
        yield f"data: {json.dumps({'type':'error','message':'No AI models configured. Check your ai_models table.'})}\n\n"
        return

    connection_fails = 0
    last_error = ""

    for model in models:
        model_str, api_base, api_key = build_litellm_model_str(model)
        try:
            response = await asyncio.to_thread(
                litellm.completion,
                model=model_str,
                messages=messages,
                api_base=api_base,
                api_key=api_key or None,
                stream=True,
                timeout=generation_timeout_for(model),
                max_tokens=MAX_OUTPUT_TOKENS,
                temperature=GENERATION_TEMPERATURE,
            )
            # Send model info first
            yield f"data: {json.dumps({'type':'model','model':model['display_name'],'provider':model['provider']})}\n\n"
            full_text = ""
            sentinel = object()
            while True:
                chunk = await asyncio.to_thread(next, response, sentinel)
                if chunk is sentinel:
                    break
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_text += delta
                    yield f"data: {json.dumps({'type':'token','content':delta})}\n\n"
            yield f"data: {json.dumps({'type':'done','full_content':full_text})}\n\n"
            await mark_model_health(model["id"], True)
            return
        except Exception as e:
            last_error = str(e)
            if _is_model_unavailable_error(last_error):
                connection_fails += 1
                await mark_model_health(model["id"], False)
                continue
            msg = f"{model['display_name']} failed during generation: {last_error[:180]}"
            yield f"data: {json.dumps({'type':'error','message':msg})}\n\n"
            return

    # Build a human-readable error so the frontend can surface it
    if connection_fails == len(models):
        msg = "Ollama is not running. Start Ollama (run ollama serve) and try again."
    elif connection_fails > 0:
        msg = "Ollama appears to be down — some models were unreachable. Start Ollama and retry."
    else:
        snippet = last_error[:120] if last_error else "unknown error"
        msg = f"All models failed to respond. Last error: {snippet}"

    yield f"data: {json.dumps({'type':'error','message':msg})}\n\n"

# ─── Prompt builders ─────────────────────────────────────────────────────────

SYSTEM_BASE = """You are an expert web developer AI. Your ONLY output must be a valid JSON object.
Never output explanations, markdown fences, or any text outside the JSON.

Generate standalone HTML pages with optional CSS and JS files.
- Use plain HTML, CSS, and vanilla JavaScript only — no frameworks, no build tools, no package managers.
- Always include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Keep output compact but complete. One polished page is better than many partial files.
- Prefer one complete index.html. Add styles.css and script.js only when they materially improve the result.
- Do not generate README, config, package, lock, TypeScript, JSX, React, Next, Vite, or placeholder files.
- Return index.html first so the preview loads immediately.

JSON format:
{
  "files": [
    {"path": "index.html", "content": "...full HTML file..."},
    {"path": "styles.css", "content": "..."},
    {"path": "script.js",  "content": "..."}
  ],
  "summary": "Brief description of what was built or changed"
}"""

PAGE_HINTS = {
    "landing":     "landing page with hero, features, CTA, and footer sections",
    "blog":        "blog page with article list, featured post, and categories sidebar",
    "promotional": "promotional page with countdown timer, offers, testimonials, and CTA",
}

PLAN_SYSTEM = """You are a senior website strategist and visual design director.
Your ONLY output must be a valid JSON object. Do not use markdown fences.

Turn the user's prompt into a premium website design brief for an AI website builder.
Prefer current, polished website-builder output: strong hero, clear positioning, refined sections, realistic copy, responsive layout, and coherent visual language.

JSON format:
{
  "business_type": "short category",
  "audience": "primary audience",
  "primary_goal": "main conversion goal",
  "tone": "3-6 adjectives",
  "archetype": "clinic|restaurant|saas|portfolio|agency|ecommerce|real_estate|event|education|local_service|general",
  "visual_direction": "specific design direction",
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "typography": {
    "heading": "font style description",
    "body": "font style description"
  },
  "sections": [
    {"id": "hero", "goal": "...", "content_notes": "...", "visual_notes": "..."}
  ],
  "cta": {
    "primary": "button text",
    "secondary": "optional button text"
  },
  "trust_elements": ["..."],
  "interactive_elements": ["..."],
  "content_strategy": "copy guidance",
  "quality_bar": ["..."]
}"""

def build_plan_messages(prompt: str, page_type: str) -> list[dict]:
    return [
        {"role": "system", "content": PLAN_SYSTEM},
        {"role": "user", "content":
            f"Page type: {page_type}\n"
            f"User request: {prompt}\n"
            "Create a practical design brief that will lead to a visually rich, modern, conversion-focused website. "
            "Use specific sections, realistic content direction, and a coherent color palette."}
    ]

def brief_context(design_brief: dict | None) -> str:
    if not design_brief:
        return "No saved design brief yet."
    return json.dumps(design_brief, ensure_ascii=False, indent=2)

def build_generate_messages(prompt: str, stack: str, page_type: str, design_brief: dict | None = None) -> list[dict]:
    brief = brief_context(design_brief)
    return [
        {"role": "system", "content": SYSTEM_BASE},
        {"role": "user", "content":
            f"Build a {PAGE_HINTS.get(page_type, page_type)}.\n"
            f"User request: {prompt}\n"
            f"Saved design brief to follow:\n{brief}\n\n"
            "Generate a premium, modern website-builder-quality result. It must feel intentionally designed, not like a basic HTML sample.\n"
            "Requirements:\n"
            "- Use a distinctive hero with headline, subcopy, primary CTA, secondary CTA or trust cue.\n"
            "- Include at least 5 polished sections for landing pages unless the brief says otherwise.\n"
            "- Use responsive grids, strong spacing, cards, badges, subtle shadows, and a coherent palette from the brief.\n"
            "- Write realistic, specific marketing copy based on the business type.\n"
            "- Use inline SVG icons or CSS shapes where useful; do not depend on icon libraries.\n"
            "- Always load Tailwind with <script src=\"https://cdn.tailwindcss.com\"></script>, never as a stylesheet link.\n"
            "- Generate index.html as the main file. Add styles.css and script.js only if needed.\n"
            "Return index.html first."}
    ]

def build_edit_messages(history: list[dict], current_files: list[dict], edit_prompt: str, stack: str, design_brief: dict | None = None) -> list[dict]:
    if not current_files:
        return build_generate_messages(edit_prompt, stack, "landing", design_brief)

    file_context = build_file_context(current_files)
    brief = brief_context(design_brief)
    system = (
        f"{SYSTEM_BASE}\n\n"
        f"Saved design brief:\n{brief}\n\n"
        f"Current project files:\n{file_context}\n\n"
        "For edits, output only the files that need to change. "
        "Return the complete updated content for every modified file. "
        "Preserve existing sections and behavior unless the user specifically asks to change them. "
        "Keep the visual direction, palette, section rhythm, and conversion strategy aligned with the saved design brief. "
        "If the edit request changes strategy, evolve the design while preserving quality. "
        "Never convert the project to a framework."
    )
    messages = [{"role": "system", "content": system}]
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": edit_prompt})
    return messages

def target_source_files(stack: str) -> list[str]:
    return ["index.html", "styles.css", "script.js"]

def build_file_context(current_files: list[dict], max_total_chars: int = 28000, max_file_chars: int = 9000) -> str:
    parts: list[str] = []
    used = 0
    priority = {"index.html": 0, "styles.css": 1, "script.js": 2}
    sorted_files = sorted(
        current_files,
        key=lambda f: (
            priority.get(f.get("file_path") or f.get("path") or "", 10),
            f.get("file_path") or f.get("path") or "",
        )
    )
    for file in sorted_files[:12]:
        path = file.get("file_path") or file.get("path") or "unknown"
        content = file.get("content") or ""
        if len(content) > max_file_chars:
            content = content[:max_file_chars] + "\n/* ...truncated... */"
        block = f"\n--- FILE: {path} ---\n{content}\n--- END FILE ---"
        if used + len(block) > max_total_chars:
            parts.append("\n--- Remaining files omitted due to context limit. ---")
            break
        parts.append(block)
        used += len(block)
    return "\n".join(parts) if parts else "No files yet."

def extract_json_object(raw: str) -> dict | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError:
            pass

    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None

# ─── Request schemas ─────────────────────────────────────────────────────────

def fallback_design_brief(prompt: str, page_type: str) -> dict:
    return {
        "business_type": "general",
        "audience": "prospective customers",
        "primary_goal": "encourage visitors to take action",
        "tone": "modern, clear, trustworthy, polished",
        "archetype": "general",
        "visual_direction": "premium responsive landing page with strong hierarchy, generous spacing, and polished cards",
        "palette": {
            "primary": "#2563eb",
            "secondary": "#0f172a",
            "accent": "#38bdf8",
            "background": "#f8fafc",
            "text": "#0f172a",
        },
        "typography": {
            "heading": "bold geometric sans-serif",
            "body": "clean readable sans-serif",
        },
        "sections": [
            {"id": "hero", "goal": "state the value proposition", "content_notes": prompt, "visual_notes": "strong CTA and trust cue"},
            {"id": "features", "goal": "show key benefits", "content_notes": "3-4 benefit cards", "visual_notes": "responsive card grid"},
            {"id": "social-proof", "goal": "build trust", "content_notes": "testimonials or stats", "visual_notes": "contrast band"},
            {"id": "process", "goal": "explain how it works", "content_notes": "simple steps", "visual_notes": "numbered layout"},
            {"id": "contact", "goal": "convert", "content_notes": "clear call to action", "visual_notes": "prominent CTA panel"},
        ],
        "cta": {"primary": "Get Started", "secondary": "Learn More"},
        "trust_elements": ["customer-friendly copy", "clear benefits", "professional presentation"],
        "interactive_elements": ["smooth anchor navigation", "CTA hover states"],
        "content_strategy": f"Use the user's request as the core content direction for a {page_type} page.",
        "quality_bar": ["responsive", "visually rich", "complete sections", "specific copy", "no framework"],
    }

class GenerateRequest(BaseModel):
    prompt: str
    stack: str = "html"
    page_type: str = "landing"     # 'landing' | 'blog' | 'promotional'
    design_brief: dict | None = None
    stream: bool = False

class EditRequest(BaseModel):
    project_id: int
    edit_prompt: str
    stack: str = "html"
    chat_history: list[dict] = []  # [{role, content}]
    current_files: list[dict] = [] # [{file_path, content}]
    design_brief: dict | None = None
    stream: bool = False

class PlanRequest(BaseModel):
    prompt: str
    page_type: str = "landing"

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "progrix-ai-gateway"}

@app.get("/models")
async def list_models():
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM ai_models ORDER BY priority ASC")
            models = await cur.fetchall()
    return {"models": models}

@app.post("/models/{model_id}/health-check")
async def force_health_check(model_id: int):
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM ai_models WHERE id=%s", (model_id,))
            model = await cur.fetchone()
    if not model:
        raise HTTPException(404, "Model not found")

    if model["provider"] == "ollama":
        installed = await fetch_installed_ollama_models()
        if installed is not None and not is_ollama_model_installed(model["name"], installed):
            await mark_model_health(model_id, False)
            return {"id": model_id, "healthy": False, "error": "Model is not installed in Ollama"}

    model_str, api_base, api_key = build_litellm_model_str(model)
    try:
        await asyncio.to_thread(
            litellm.completion,
            model=model_str,
            messages=[{"role": "user", "content": "Return OK"}],
            api_base=api_base,
            api_key=api_key or None,
            max_tokens=8,
            timeout=45,
        )
        await mark_model_health(model_id, True)
        return {"id": model_id, "healthy": True}
    except Exception as e:
        await mark_model_health(model_id, False)
        return {"id": model_id, "healthy": False, "error": str(e)}

@app.post("/plan")
async def plan(req: PlanRequest):
    result = await generate_with_fallback(build_plan_messages(req.prompt, req.page_type))
    parsed = extract_json_object(result["content"])
    if not parsed:
        parsed = fallback_design_brief(req.prompt, req.page_type)
    return {**result, "data": parsed}

@app.post("/generate")
async def generate(req: GenerateRequest):
    messages = build_generate_messages(req.prompt, req.stack, req.page_type, req.design_brief)
    if req.stream:
        return StreamingResponse(
            stream_with_fallback(messages),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    result = await generate_with_fallback(messages)
    # Parse the JSON from AI response
    parsed = extract_json_object(result["content"]) or {"files": [], "summary": "Parse error"}
    return {**result, "data": parsed}

@app.post("/edit")
async def edit(req: EditRequest):
    messages = build_edit_messages(
        req.chat_history, req.current_files, req.edit_prompt, req.stack, req.design_brief
    )
    if req.stream:
        return StreamingResponse(
            stream_with_fallback(messages),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    result = await generate_with_fallback(messages)
    parsed = extract_json_object(result["content"]) or {"files": [], "summary": "Parse error"}
    return {**result, "data": parsed}
