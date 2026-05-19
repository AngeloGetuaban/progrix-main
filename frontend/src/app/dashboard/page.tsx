"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Sparkles, LogOut, Globe, LayoutTemplate,
  Clock, Trash2, ArrowRight, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { getUser, clearAuth } from "@/lib/auth";

interface Project {
  id: number;
  name: string;
  stack: "html";
  description: string;
  status: "draft" | "generating" | "ready" | "error";
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  ready:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  generating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  draft:      "bg-white/10 text-white/50 border-white/10",
  error:      "bg-red-500/20 text-red-400 border-red-500/30",
};

const STACK_ICON: Record<string, React.ReactNode> = {
  html: <Globe className="w-3.5 h-3.5" />,
};

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
    // Poll every 5 seconds to update statuses
    const interval = setInterval(fetchProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data.data);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top nav */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Progrix</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-white/40">{user?.name}</span>
            <button onClick={logout} className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Your Projects
            </h1>
            <p className="text-white/40 mt-1 text-sm">Build HTML websites with AI — describe, generate, iterate.</p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/new")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold gap-2 h-10"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No projects yet</h2>
            <p className="text-white/40 mb-6 text-sm">Describe a website and let AI build it for you</p>
            <Button
              onClick={() => router.push("/dashboard/new")}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Create your first project
            </Button>
          </div>
        )}

        {/* Project grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 h-40 animate-pulse-slow" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="glass rounded-2xl p-5 cursor-pointer hover:border-purple-500/30 hover:bg-white/5 transition-all duration-200 group relative"
              >
                {/* Delete btn */}
                <button
                  onClick={(e) => deleteProject(p.id, e)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <LayoutTemplate className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate pr-6">{p.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{p.description || "No description"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs gap-1 ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1 bg-white/5 text-white/40 border-white/10">
                      {STACK_ICON[p.stack]}
                      HTML
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/30">
                    <Clock className="w-3 h-3" />
                    {timeAgo(p.updated_at)}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-white/30">Open builder</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
