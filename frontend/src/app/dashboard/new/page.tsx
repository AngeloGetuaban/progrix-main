"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Zap, Globe, ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

type Stack = "vite-react" | "nextjs";
type PageType = "landing" | "blog" | "promotional";

const STACKS = [
  {
    id: "vite-react" as Stack,
    icon: <Zap className="w-8 h-8" />,
    name: "Vite + React",
    sub: "+ shadcn/ui + Tailwind",
    desc: "Lightning-fast SPA. Perfect for landing pages and promotionals.",
    color: "from-orange-500/20 to-yellow-500/20",
    border: "border-orange-500/40",
    iconColor: "text-orange-400",
  },
  {
    id: "nextjs" as Stack,
    icon: <Globe className="w-8 h-8" />,
    name: "Next.js",
    sub: "+ shadcn/ui + Tailwind",
    desc: "Full-featured SSR. Ideal for blogs and content-heavy sites.",
    color: "from-blue-500/20 to-purple-500/20",
    border: "border-blue-500/40",
    iconColor: "text-blue-400",
  },
];

const PAGE_TYPES: { id: PageType; label: string; emoji: string }[] = [
  { id: "landing",     label: "Landing Page",   emoji: "🚀" },
  { id: "blog",        label: "Blog",           emoji: "📝" },
  { id: "promotional", label: "Promotional",    emoji: "🎯" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [stack, setStack] = useState<Stack | null>(null);
  const [pageType, setPageType] = useState<PageType>("landing");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!stack || !name.trim() || !description.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post("/projects", { name, stack, description });
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
          <button onClick={() => step === 2 ? setStep(1) : router.push("/dashboard")}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white">New Project</span>
          </div>
          {/* Step indicator */}
          <div className="ml-auto flex items-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className={`w-6 h-1.5 rounded-full transition-all ${s <= step ? "bg-purple-500" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        {/* STEP 1: Stack picker */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-2">Choose your stack</h1>
            <p className="text-white/40 mb-10">Pick the framework for your generated website.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
              {STACKS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStack(s.id)}
                  className={`
                    relative text-left p-6 rounded-2xl border transition-all duration-200
                    bg-gradient-to-br ${s.color}
                    ${stack === s.id
                      ? `${s.border} ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/10`
                      : "border-white/10 hover:border-white/20"}
                  `}
                >
                  {stack === s.id && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                  <div className={`mb-4 ${s.iconColor}`}>{s.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-0.5">{s.name}</h3>
                  <p className="text-xs text-white/40 mb-3">{s.sub}</p>
                  <p className="text-sm text-white/60">{s.desc}</p>
                </button>
              ))}
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!stack}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold gap-2 h-11 px-8 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* STEP 2: Prompt */}
        {step === 2 && (
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
                  placeholder="Build a modern SaaS landing page for a project management tool. Include a hero section with a bold headline, feature cards, pricing table with 3 tiers, testimonials, and a CTA footer. Use purple and blue gradients with dark theme."
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
        )}
      </main>
    </div>
  );
}
