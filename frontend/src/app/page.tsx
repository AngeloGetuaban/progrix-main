import Link from "next/link";
import { ArrowRight, Bot, Code2, Database, Eye, Globe, Sparkles } from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: <Bot className="w-6 h-6" />,
      title: "AI generation",
      desc: "Describe the page in plain English and the best available model builds the website.",
      iconColor: "text-purple-400",
    },
    {
      icon: <Code2 className="w-6 h-6" />,
      title: "Plain web output",
      desc: "Projects are saved as framework-free HTML, CSS, and JavaScript. No build step required.",
      iconColor: "text-blue-400",
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Live preview",
      desc: "Preview files as they stream in, then refine the same saved project with chat edits.",
      iconColor: "text-emerald-400",
    },
  ];

  const output = [
    { Icon: Globe, title: "HTML pages", tags: ["index.html", "Preview-ready", "Export ZIP", "Responsive"] },
    { Icon: Database, title: "DB-backed files", tags: ["styles.css", "script.js", "Per user", "No framework"] },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="border-b border-white/5 bg-black/10 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Progrix</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors px-4 py-2">Sign in</Link>
            <Link href="/register" className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg transition-all">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-[1fr_420px] gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-7">
            <Bot className="w-3.5 h-3.5" /> Powered by LiteLLM, Ollama, and vLLM
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Build HTML websites with <span className="gradient-text">AI</span>
          </h1>
          <p className="text-white/45 text-lg md:text-xl max-w-2xl mb-9">
            Describe your website and generate plain HTML, CSS, and JavaScript saved directly to your project.
            Edit with natural language and export a simple ZIP whenever you need it.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/register"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold px-7 py-3 rounded-lg transition-all text-sm shadow-lg shadow-purple-500/20">
              Start building <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="text-white/45 hover:text-white text-sm transition-colors">
              Sign in
            </Link>
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.03] rounded-lg overflow-hidden shadow-2xl">
          <div className="h-10 border-b border-white/10 bg-black/30 flex items-center gap-2 px-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            <span className="ml-3 text-xs text-white/30 font-mono">index.html</span>
          </div>
          <div className="p-5 font-mono text-xs leading-6 text-white/55">
            <p><span className="text-purple-300">&lt;section</span> class=<span className="text-emerald-300">&quot;hero&quot;</span><span className="text-purple-300">&gt;</span></p>
            <p className="pl-4"><span className="text-purple-300">&lt;h1&gt;</span>Your generated website<span className="text-purple-300">&lt;/h1&gt;</span></p>
            <p className="pl-4"><span className="text-purple-300">&lt;p&gt;</span>Saved in the database per user project.<span className="text-purple-300">&lt;/p&gt;</span></p>
            <p><span className="text-purple-300">&lt;/section&gt;</span></p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="border border-white/10 rounded-lg p-6 bg-white/[0.03]">
              <div className={`mb-4 ${f.iconColor}`}>{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {output.map(({ Icon, title, tags }) => (
            <div key={title} className="border border-white/10 rounded-lg p-6 bg-white/[0.03]">
              <div className="flex items-center gap-3 mb-4">
                <Icon className="w-6 h-6 text-blue-400" />
                <span className="font-semibold text-white">{title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/50 text-xs">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
