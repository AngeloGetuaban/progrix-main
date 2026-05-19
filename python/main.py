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
MAX_OUTPUT_TOKENS = int(os.getenv("MAX_OUTPUT_TOKENS", "6000"))
GENERATION_TEMPERATURE = float(os.getenv("GENERATION_TEMPERATURE", "0.2"))

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
Optimize for fast first generation: create a compact, complete version that can be refined later.
Keep output small and high-impact. Prefer one main UI component plus one stylesheet over many tiny files.
Do not generate README files, tests, lockfiles, placeholder docs, or unnecessary config files unless explicitly requested.

JSON format:
{
  "files": [
    {"path": "relative/path/file.tsx", "content": "...full file content..."}
  ],
  "summary": "Brief description of what was built or changed",
  "dependencies": ["package-name", ...]
}"""

STACK_HINTS = {
    "vite-react": """Stack: Vite + React 18 + TypeScript + shadcn/ui + Tailwind CSS v3.
- Entry: src/main.tsx → src/App.tsx
- shadcn imports: from "@/components/ui/*"
- Use React hooks, functional components only
- Tailwind class-based styling throughout""",

    "nextjs": """Stack: Next.js 15 App Router + TypeScript + shadcn/ui + Tailwind CSS v4.
- Pages live in src/app/*/page.tsx
- Use 'use client' only for interactive components
- shadcn imports: from "@/components/ui/*"
- Server components by default""",
}

PAGE_HINTS = {
    "landing":     "landing page with hero, features, CTA, footer sections",
    "blog":        "blog with post list, individual post view, categories sidebar",
    "promotional": "promotional page with countdown timer, offers, testimonials, CTA",
}

def build_generate_messages(prompt: str, stack: str, page_type: str) -> list[dict]:
    file_plan = (
        "For Vite React, generate only these files unless absolutely necessary: "
        "package.json, index.html, src/main.tsx, src/App.tsx, src/index.css. "
        "For Next.js, generate only these files unless absolutely necessary: "
        "package.json, src/app/layout.tsx, src/app/page.tsx, src/app/globals.css."
    )
    return [
        {"role": "system", "content": f"{SYSTEM_BASE}\n\n{STACK_HINTS.get(stack, '')}"},
        {"role": "user", "content":
            f"Build a {PAGE_HINTS.get(page_type, page_type)} website.\n"
            f"User request: {prompt}\n"
            f"{file_plan}\n"
            "Generate a complete, polished first version with concise code. "
            "Cover the user's requested sections, but keep repeated content data-driven inside the main component. "
            "Return the largest visual file first so the live preview can appear early."}
    ]

def build_edit_messages(history: list[dict], current_files: list[dict], edit_prompt: str, stack: str) -> list[dict]:
    if not current_files:
        return build_generate_messages(edit_prompt, stack, "landing")

    target_files = target_source_files(stack)
    focused_files = [f for f in current_files if (f.get("file_path") or f.get("path")) in target_files]
    file_context = build_file_context(focused_files or current_files)
    target_list = ", ".join(target_files)
    system = (
        f"{SYSTEM_BASE}\n\n{STACK_HINTS.get(stack, '')}\n\n"
        f"Current project files:\n{file_context}\n\n"
        "For edits, output only files that need to change or be created. "
        "Return the complete content for every changed file. "
        f"Target files for this request: {target_list}. "
        "If the current files are startup scaffold placeholders, replace only those target files. "
        "Do not rewrite package.json, layout, main entry, or config files. Use inline data arrays and CSS instead of adding dependencies. "
        "If the user is adding requirements step by step, preserve all existing behavior and layer the new request on top. "
        "The JSON format is the same but 'files' only contains modified/new files."
    )
    messages = [{"role": "system", "content": system}]
    # Include last 10 chat turns for context
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": edit_prompt})
    return messages

def target_source_files(stack: str) -> list[str]:
    if stack == "vite-react":
        return ["src/App.tsx", "src/index.css"]
    return ["src/app/page.tsx", "src/app/globals.css"]

def build_file_context(current_files: list[dict], max_total_chars: int = 50000, max_file_chars: int = 12000) -> str:
    parts: list[str] = []
    used = 0
    for file in current_files[:30]:
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

class GenerateRequest(BaseModel):
    prompt: str
    stack: str = "nextjs"          # 'vite-react' | 'nextjs'
    page_type: str = "landing"     # 'landing' | 'blog' | 'promotional'
    stream: bool = False

class EditRequest(BaseModel):
    project_id: int
    edit_prompt: str
    stack: str = "nextjs"
    chat_history: list[dict] = []  # [{role, content}]
    current_files: list[dict] = [] # [{file_path, content}]
    stream: bool = False

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

@app.post("/generate")
async def generate(req: GenerateRequest):
    messages = build_generate_messages(req.prompt, req.stack, req.page_type)
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
        req.chat_history, req.current_files, req.edit_prompt, req.stack
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
