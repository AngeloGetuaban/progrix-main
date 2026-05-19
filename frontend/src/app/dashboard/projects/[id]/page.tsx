"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Send, Loader2, Bot, User, Download, Eye, Code2,
  FolderOpen, ChevronRight, Sparkles, Zap, Globe,
  RotateCcw, Copy, Check, ArrowLeft, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────
interface ChatMessage { id: number; role: "user" | "assistant"; content: string; model_used?: string; created_at: string; }
interface ProjectFile  { id: number; file_path: string; }
interface Project      { id: number; name: string; stack: string; status: string; description: string; }

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeStr(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function langFromPath(path: string): string {
  const ext = path.split(".").pop() || "";
  const map: Record<string, string> = { tsx: "tsx", ts: "typescript", jsx: "jsx", js: "javascript", css: "css", json: "json", html: "html", md: "markdown" };
  return map[ext] || "text";
}

// ─── Prompt breakdown ───────────────────────────────────────────────────────
const LONG_PROMPT_THRESHOLD = 200;

function breakdownPrompt(prompt: string): string[] {
  const trimmed = prompt.trim();
  // Split by newlines first (user explicitly separated items)
  const byNewlines = trimmed.split(/\n+/).map(l => l.trim()).filter(l => l.length > 15);
  if (byNewlines.length >= 2) return byNewlines;
  // Split by sentences
  const bySentences = trimmed.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 15);
  if (bySentences.length >= 3) return bySentences;
  // Split by common conjunctions / list words
  const byConj = trimmed
    .split(/\s*,?\s+(?:and also|and then|plus|as well as|along with|with a|including)\s+/i)
    .map(s => s.trim()).filter(s => s.length > 15);
  if (byConj.length >= 2) return byConj;
  return [trimmed];
}

// ─── Streaming file extractor ────────────────────────────────────────────────
// Parses complete file objects out of a partially-streamed JSON string.
// Only returns files whose content string is fully closed — partial files are skipped.
function extractStreamingFiles(raw: string): { file_path: string; content: string }[] {
  const files: { file_path: string; content: string }[] = [];
  const pathRe = /"(?:path|file_path)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(raw)) !== null) {
    const filePath = m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const afterPath = raw.slice(pathRe.lastIndex);
    const contentKeyMatch = afterPath.match(/"content"\s*:\s*"/);
    if (!contentKeyMatch) continue;
    const contentStart = pathRe.lastIndex + contentKeyMatch.index! + contentKeyMatch[0].length;
    let content = "";
    let i = contentStart;
    let complete = false;
    while (i < raw.length) {
      const ch = raw[i];
      if (ch === "\\") {
        const next = raw[i + 1];
        if      (next === '"')  { content += '"';  i += 2; }
        else if (next === "n")  { content += "\n"; i += 2; }
        else if (next === "t")  { content += "\t"; i += 2; }
        else if (next === "r")  { content += "\r"; i += 2; }
        else if (next === "\\") { content += "\\"; i += 2; }
        else                    { content += next; i += 2; }
      } else if (ch === '"') {
        complete = true;
        break;
      } else {
        content += ch;
        i++;
      }
    }
    if (complete) files.push({ file_path: filePath, content });
  }
  return files;
}

// ─── Syntax highlighter (simple token-based) ──────────────────────────────
function CodeView({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative h-full">
      <button onClick={copy} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="code-block h-full p-4 pt-3 text-[13px] leading-6 overflow-auto text-green-300/90 whitespace-pre-wrap break-words">
        {code}
      </pre>
    </div>
  );
}

// ─── Preview iframe ──────────────────────────────────────────────────────
function PreviewFrame({ files }: { files: { file_path: string; content: string }[] }) {
  const getIndexFile = () => {
    return files.find(f => f.file_path.endsWith("index.html")) ||
           files.find(f => f.file_path.endsWith("page.tsx")) ||
           files.find(f => f.file_path.endsWith("index.tsx") || f.file_path.endsWith("index.jsx")) ||
           files.find(f => f.file_path.endsWith("App.tsx") || f.file_path.endsWith("App.jsx")) ||
           files[0];
  };

  const indexFile = getIndexFile();
  const cssFiles  = files.filter(f => f.file_path.endsWith(".css"));

  if (!files.length) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070710]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Eye className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-white/30 text-sm">Preview will appear here</p>
          <p className="text-white/15 text-xs mt-1">Generate a website to see the preview</p>
        </div>
      </div>
    );
  }

  const cssContent = cssFiles.map(f => f.content).join("\n");
  const mainContent = indexFile?.content || "";
  const isHtml = indexFile?.file_path.endsWith(".html") ||
                 mainContent.trim().toLowerCase().startsWith("<!doctype html>") ||
                 mainContent.trim().toLowerCase().startsWith("<html");

  let srcDoc = "";
  if (isHtml) {
    srcDoc = mainContent;
    if (cssContent) {
      if (srcDoc.includes("</head>")) {
        srcDoc = srcDoc.replace("</head>", `<style>${cssContent}</style></head>`);
      } else {
        srcDoc = `<style>${cssContent}</style>` + srcDoc;
      }
    }
    if (!srcDoc.includes("tailwindcss")) {
      srcDoc = srcDoc.replace("</head>", `<script src="https://cdn.tailwindcss.com"></script></head>`);
    }
  } else {
    srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<script src="https://cdn.tailwindcss.com"></script>
<style>${cssContent}</style>
</head>
<body class="bg-gray-900 text-white p-6">
<div class="max-w-4xl mx-auto">
  <div class="glass rounded-xl p-6 text-center mb-4" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)">
    <p class="text-purple-400 text-sm font-medium mb-2">📦 Code Preview Mode</p>
    <p class="text-white/60 text-xs">React/Next.js components render in the code view. Download the project to run locally.</p>
  </div>
  <pre style="background:#0d0d1a;border:1px solid #1e1e3a;border-radius:8px;padding:16px;font-size:12px;color:#86efac;overflow:auto;max-height:70vh;white-space:pre-wrap;">${mainContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</div>
</body></html>`;
  }

  return (
    <iframe
      srcDoc={srcDoc}
      title="Website Preview"
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

// ─── Main builder page ──────────────────────────────────────────────────
export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  // ── Streaming preview state ──────────────────────────────────────────────
  const [streamingFiles, setStreamingFiles] = useState<{ file_path: string; content: string }[]>([]);
  const [promptParts, setPromptParts] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasFired = useRef(false);

  // Pre-compute breakdown of what's currently typed (for the textarea hint)
  const inputBreakdown = useMemo(() => {
    if (input.length <= LONG_PROMPT_THRESHOLD) return [];
    return breakdownPrompt(input);
  }, [input]);

  // Load project + history + files
  useEffect(() => {
    loadProject();
    loadHistory();
    loadFiles();
  }, [id]);

  // Auto-generate on first load if prompt passed via sessionStorage
  useEffect(() => {
    const prompt = sessionStorage.getItem("initialPrompt");
    const pageType = sessionStorage.getItem("initialPageType") || "landing";
    if (prompt && !hasFired.current) {
      hasFired.current = true;
      sessionStorage.removeItem("initialPrompt");
      sessionStorage.removeItem("initialPageType");
      setTimeout(() => generateInitial(prompt, pageType), 800);
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamText]);

  const loadProject = async () => {
    try { const { data } = await api.get(`/projects/${id}`); setProject(data.data); } catch {}
  };
  const loadHistory = async () => {
    try { const { data } = await api.get(`/projects/${id}/chat`); setMessages(data.data); } catch {}
  };
  const loadFiles = async () => {
    try {
      const { data } = await api.get(`/projects/${id}/files`);
      setFiles(data.data);
      const contents: Record<string, string> = {};
      data.data.forEach((f: any) => { contents[f.file_path] = f.content || ""; });
      setFileContents(prev => ({ ...prev, ...contents }));
      if (data.data.length > 0 && !selectedFile) setSelectedFile(data.data[0].file_path);
    } catch {}
  };

  const loadFileContent = async (path: string) => {
    if (fileContents[path]) { setSelectedFile(path); return; }
    try {
      const { data } = await api.get(`/projects/${id}/files/content?path=${encodeURIComponent(path)}`);
      setFileContents(prev => ({ ...prev, [path]: data.data.content }));
      setSelectedFile(path);
    } catch {}
  };

  const generateInitial = async (prompt: string, pageType: string) => {
    const parts = breakdownPrompt(prompt);
    setPromptParts(parts);
    setStreamingFiles([]);
    setGenerating(true);
    setStreamText("");
    addUserMessage(prompt);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/generate?stream=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ prompt, page_type: pageType }),
      });
      await handleStream(response);
    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    } finally {
      setGenerating(false);
      setStreamText("");
      await loadHistory();
      await loadFiles();
      setStreamingFiles([]);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const parts = breakdownPrompt(text);
    setPromptParts(parts);
    setStreamingFiles([]);
    setInput("");
    setLoading(true);
    setStreamText("");
    addUserMessage(text);
    try {
      const hasExistingFiles = files.length > 0;
      const allFiles = await Promise.all(files.map(async (f) => {
        const content = fileContents[f.file_path] || "";
        return { file_path: f.file_path, content };
      }));
      const endpoint = hasExistingFiles ? "edit" : "generate";
      const body = hasExistingFiles
        ? { edit_prompt: text, stream: true, current_files: allFiles }
        : { prompt: text, page_type: "landing" };
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/${endpoint}?stream=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(body),
      });
      await handleStream(response);
    } catch (err: any) {
      toast.error("Edit failed: " + err.message);
    } finally {
      setLoading(false);
      setStreamText("");
      await loadHistory();
      await loadFiles();
      setStreamingFiles([]);
      if (selectedFile) { setFileContents(prev => { const n = {...prev}; delete n[selectedFile]; return n; }); loadFileContent(selectedFile); }
    }
  };

  const handleStream = async (response: Response) => {
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const data = await response.json();
        message = data.error || data.message || message;
      } catch {}
      throw new Error(message);
    }
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer.trim()) processStreamChunk(buffer);
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const boundary = buffer.lastIndexOf("\n");
      if (boundary === -1) continue;
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);
      processStreamChunk(chunk);
    }

    function processStreamChunk(chunk: string) {
      const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.type === "error" || payload.error) {
            const msg = payload.message || payload.error || "Generation failed";
            toast.error(msg, { duration: 8000 });
            throw new Error(msg);
          }
          if (payload.type === "model") setModelUsed(payload.model);
          if (payload.type === "token") {
            fullText += payload.content;
            setStreamText(fullText);
            // Extract complete files from partially-streamed JSON and push to live preview
            const extracted = extractStreamingFiles(fullText);
            if (extracted.length > 0) setStreamingFiles(extracted);
          }
        } catch (err) {
          if (err instanceof SyntaxError) continue;
          throw err;
        }
      }
    }
  };

  const addUserMessage = (content: string) => {
    const msg: ChatMessage = { id: Date.now(), role: "user", content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${project?.name || "project"}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Project downloaded!");
    } catch { toast.error("Export failed"); }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isActive = generating || loading;
  // Which breakdown step is currently active — driven by real streamed file count, not a timer.
  // Each completed file "advances" one step. No step is marked done before a file actually lands.
  const activePart = Math.min(promptParts.length - 1, streamingFiles.length);
  const stackLabel = "HTML";
  const StackIcon = Globe;

  const allFilesForPreview = files.map(f => ({ file_path: f.file_path, content: fileContents[f.file_path] || "" }));
  // During active generation use streamed files so preview updates in real time
  const previewFiles = isActive && streamingFiles.length > 0 ? streamingFiles : allFilesForPreview;

  return (
    <div className="h-screen bg-[#0a0a0f] flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-white/5 bg-black/30 backdrop-blur-xl z-50">
        <div className="h-14 px-4 flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-white text-sm">{project?.name || "Loading..."}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <Badge variant="outline" className="text-xs gap-1 bg-white/5 text-white/40 border-white/10 py-0">
              <StackIcon className="w-3 h-3" />{stackLabel}
            </Badge>
            {project?.status === "ready" && (
              <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 py-0">ready</Badge>
            )}
            {isActive && (
              <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30 py-0 gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />generating
              </Badge>
            )}
          </div>
          {modelUsed && (
            <div className="flex items-center gap-1 ml-2 text-xs text-white/20">
              <Cpu className="w-3 h-3" />{modelUsed}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" size="sm"
              className="border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 gap-1.5 h-8 text-xs">
              <Download className="w-3.5 h-3.5" /> Export ZIP
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main layout: Chat | Preview+Code ───────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Chat Panel ─────────────────────────────────── */}
        <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-white/5">
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {messages.length === 0 && !isActive && (
                <div className="text-center pt-10 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-3">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-white/40 text-sm font-medium">AI Website Builder</p>
                  <p className="text-white/20 text-xs mt-1">Your conversation will appear here</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""} animate-fade-in`}>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-purple-500 to-blue-500"
                      : "bg-white/10"
                  }`}>
                    {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-white/60" />}
                  </div>
                  <div className={`flex-1 max-w-[280px] ${msg.role === "user" ? "items-end" : ""} flex flex-col gap-1`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-purple-600/30 text-white border border-purple-500/20 rounded-tr-sm"
                        : "bg-white/5 text-white/80 border border-white/5 rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/20">{timeStr(msg.created_at)}</span>
                      {msg.model_used && <span className="text-[10px] text-white/15">{msg.model_used}</span>}
                    </div>
                  </div>
                </div>
              ))}

              {/* ── Streaming assistant response ── */}
              {isActive && (
                <div className="flex gap-2.5 animate-fade-in">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 max-w-[280px]">
                    <div className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-white/5 border border-white/5 text-sm text-white/80">

                      {/* Multi-part breakdown view */}
                      {promptParts.length > 1 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-purple-400 mb-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Working on {promptParts.length} parts...</span>
                          </div>
                          {promptParts.map((part, i) => (
                            <div key={i} className={`flex items-start gap-2 text-xs transition-all duration-300 ${
                              i <= activePart ? "opacity-100" : "opacity-30"
                            }`}>
                              <div className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                                i < activePart
                                  ? "bg-emerald-500/25 text-emerald-400"
                                  : i === activePart
                                    ? "bg-purple-500/25 text-purple-400"
                                    : "bg-white/5 text-white/30"
                              }`}>
                                {i < activePart
                                  ? <Check className="w-2.5 h-2.5" />
                                  : i === activePart
                                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    : <span className="text-[8px] font-bold">{i + 1}</span>}
                              </div>
                              <span className="leading-relaxed text-white/70">{part}</span>
                            </div>
                          ))}
                          {/* Show file count as files land */}
                          {streamingFiles.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {streamingFiles.length} file{streamingFiles.length !== 1 ? "s" : ""} generated
                            </div>
                          )}
                        </div>
                      ) : streamText ? (
                        /* Single prompt — show raw token tail */
                        <div className="space-y-2">
                          <span className="line-clamp-6 text-xs font-mono text-green-400/70 block">{streamText.slice(-300)}</span>
                          {streamingFiles.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 pt-1 border-t border-white/5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {streamingFiles.length} file{streamingFiles.length !== 1 ? "s" : ""} generated
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                          <span className="text-white/40 text-xs">
                            {generating ? "Generating website..." : "Applying changes..."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-white/5 bg-black/20">
            <div className="relative">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={isActive ? "Generating..." : "Describe changes or ask for edits..."}
                disabled={isActive}
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/30 resize-none pr-12 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isActive}
                className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center disabled:opacity-30 hover:from-purple-500 hover:to-blue-500 transition-all"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>

            {/* Long-prompt breakdown hint shown below textarea before sending */}
            {inputBreakdown.length > 1 && !isActive && (
              <div className="mt-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-[10px] text-purple-400 mb-1.5 flex items-center gap-1 font-medium">
                  <Sparkles className="w-2.5 h-2.5" />
                  Will work on {inputBreakdown.length} parts:
                </p>
                <div className="space-y-0.5">
                  {inputBreakdown.map((part, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-white/40">
                      <span className="text-purple-400/70 flex-shrink-0 font-mono">{i + 1}.</span>
                      <span className="leading-relaxed line-clamp-1">{part}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-white/20 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>

        {/* ── RIGHT: Preview + Code ─────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center border-b border-white/5 bg-black/10 px-4 gap-2">
              <TabsList className="bg-transparent gap-0 h-12 p-0">
                <TabsTrigger value="preview" className="gap-1.5 text-xs data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none h-12 px-4 text-white/40">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5 text-xs data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none h-12 px-4 text-white/40">
                  <Code2 className="w-3.5 h-3.5" /> Code
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Preview tab */}
            <TabsContent value="preview" className="flex-1 m-0 overflow-hidden relative">
              <PreviewFrame files={previewFiles} />

              {/* Live streaming badge — visible once first file lands */}
              {isActive && streamingFiles.length > 0 && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur rounded-full px-2.5 py-1 text-xs text-emerald-400 border border-emerald-500/20 pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live · {streamingFiles.length} file{streamingFiles.length !== 1 ? "s" : ""}
                </div>
              )}

              {/* Generating skeleton — shown before any files appear */}
              {isActive && streamingFiles.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070710]/90 backdrop-blur-sm gap-4">
                  <div className="flex gap-1.5 items-end">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-purple-500/60 animate-pulse"
                        style={{
                          height: `${16 + i * 8}px`,
                          animationDelay: `${i * 0.12}s`,
                          animationDuration: "1s",
                        }}
                      />
                    ))}
                    {[3, 2, 1].map((h, i) => (
                      <div
                        key={`r${i}`}
                        className="w-1.5 rounded-full bg-purple-500/60 animate-pulse"
                        style={{
                          height: `${16 + h * 8}px`,
                          animationDelay: `${(5 + i) * 0.12}s`,
                          animationDuration: "1s",
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-white/50 text-sm font-medium">
                      {generating ? "Building your website..." : "Applying changes..."}
                    </p>
                    <p className="text-white/25 text-xs mt-1">Preview will appear as files are generated</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Code tab — file tree + editor */}
            <TabsContent value="code" className="flex-1 m-0 flex overflow-hidden">
              <div className="w-56 flex-shrink-0 border-r border-white/5 bg-black/20 overflow-auto">
                <div className="p-3 border-b border-white/5">
                  <div className="flex items-center gap-1.5 text-white/40 text-xs">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Files ({files.length})</span>
                  </div>
                </div>
                {files.length === 0 ? (
                  <div className="p-4 text-center text-white/20 text-xs">No files yet</div>
                ) : (
                  <div className="p-2 space-y-0.5">
                    {files.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => loadFileContent(f.file_path)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                          selectedFile === f.file_path
                            ? "bg-purple-500/20 text-purple-300"
                            : "text-white/40 hover:text-white/70 hover:bg-white/5"
                        }`}
                      >
                        <ChevronRight className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{f.file_path.split("/").pop()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                {selectedFile ? (
                  <>
                    <div className="h-9 border-b border-white/5 flex items-center px-4 bg-black/20">
                      <span className="text-xs text-white/40 font-mono">{selectedFile}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {fileContents[selectedFile] !== undefined ? (
                        <CodeView code={fileContents[selectedFile]} lang={langFromPath(selectedFile)} />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                    Select a file to view
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
