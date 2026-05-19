"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

type PageType = "landing" | "blog" | "promotional";

const PAGE_TYPES: { id: PageType; label: string; emoji: string }[] = [
  { id: "landing",     label: "Landing Page",   emoji: "🚀" },
  { id: "blog",        label: "Blog",           emoji: "📝" },
  { id: "promotional", label: "Promotional",    emoji: "🎯" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [pageType, setPageType] = useState<PageType>("landing");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/projects", { name, description });
      toast.success("Project created!");
      sessionStorage.setItem("initialPrompt", description);
      sessionStorage.setItem("initialPageType", pageType);
      router.push(`/dashboard/projects/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white">New Project</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">Describe your website</h1>
          <p className="text-white/40 mb-10">Tell the AI what you want to build.</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Project name</Label>
              <Input
                placeholder="My Awesome Site"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Page type</Label>
              <div className="flex gap-3">
                {PAGE_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setPageType(pt.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      pageType === pt.id
                        ? "border-purple-500/50 bg-purple-500/20 text-purple-300"
                        : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
                    }`}
                  >
                    <span>{pt.emoji}</span> {pt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 text-sm">Describe your website</Label>
              <Textarea
                placeholder="Build a modern dental clinic landing page with a hero section, services, testimonials, and contact. Use a clean white and blue color scheme."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-purple-500/50 resize-none"
              />
              <p className="text-xs text-white/30">Be specific — mention colors, sections, style, content.</p>
            </div>

            <Button
              onClick={handleCreate}
              disabled={loading || !name.trim() || !description.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold gap-2 h-11 px-8 disabled:opacity-40"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Sparkles className="w-4 h-4" /> Generate Website</>}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
