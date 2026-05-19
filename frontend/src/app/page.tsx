import Link from "next/link";
import { Sparkles, Zap, Globe, Bot, Code2, Eye, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/5 bg-black/10 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Progrix</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors px-4 py-2">Sign in</Link>
            <Link href="/register" className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-xl transition-all">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center pt-24 pb-20 px-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-medium mb-8">
          <Bot className="w-3.5 h-3.5" /> Powered by LiteLLM + Ollama + vLLM
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Build websites with<br />
          <span className="gradient-text">AI in seconds</span>
        </h1>
        <p className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Describe your website, pick a stack, and watch AI generate production-ready code. Edit with natural language — no coding required.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold px-8 py-3.5 rounded-2xl transition-all text-sm shadow-lg shadow-purple-500/20 glow-purple">
            Start building free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="text-white/40 hover:text-white text-sm transition-colors">
            Sign in →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: <Bot className="w-6 h-6" />, title: "AI-Powered Generation", desc: "Describe your site in plain English. Our AI picks the best available model and generates complete, beautiful code.", color: "from-purple-500/20 to-purple-600/10", iconColor: "text-purple-400" },
            { icon: <Code2 className="w-6 h-6" />, title: "Choose Your Stack", desc: "Pick between Vite+React or Next.js — both with shadcn/ui and Tailwind. Download production-ready ZIP instantly.", color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-400" },
            { icon: <Eye className="w-6 h-6" />, title: "Live Preview & Edit", desc: "See your website live as it generates. Chat to refine any section — the AI remembers your full conversation.", color: "from-emerald-500/20 to-emerald-600/10", iconColor: "text-emerald-400" },
          ].map((f, i) => (
            <div key={i} className={`glass rounded-2xl p-6 bg-gradient-to-br ${f.color}`}>
              <div className={`mb-4 ${f.iconColor}`}>{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stack cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { Icon: Zap, title: "Vite + React", color: "text-orange-400", border: "border-orange-500/20", bg: "from-orange-500/10 to-yellow-500/5", tags: ["shadcn/ui", "Tailwind", "TypeScript", "SPA"] },
            { Icon: Globe, title: "Next.js", color: "text-blue-400", border: "border-blue-500/20", bg: "from-blue-500/10 to-purple-500/5", tags: ["shadcn/ui", "Tailwind", "TypeScript", "SSR"] },
          ].map(({ Icon, title, color, border, bg, tags }, i) => (
            <div key={i} className={`glass rounded-2xl p-6 border ${border} bg-gradient-to-br ${bg}`}>
              <div className="flex items-center gap-3 mb-4">
                <Icon className={`w-6 h-6 ${color}`} />
                <span className="font-semibold text-white">{title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <span key={t} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
