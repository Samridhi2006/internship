"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FallingPattern } from "@/components/ui/falling-pattern";
import { KeyRound, User, ChevronRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [destination, setDestination] = useState<"/placement" | "/interview">("/placement");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setIsLoading(true);

    // Simulate authentication lag for slick UI response
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);

    if (destination === "/interview") {
      // Directs to mock interview dashboard
      router.push(
        `/interview?candidateId=${encodeURIComponent(username.trim())}&totalQs=10&track=${encodeURIComponent("Software Engineer")}`
      );
    } else {
      // Directs to placement readiness dashboard
      router.push(destination);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans antialiased relative overflow-hidden flex items-center justify-center px-4">
      {/* ── Falling Pattern Background ────────────────────────── */}
      <FallingPattern
        color="#6366f1"
        backgroundColor="#000000"
        duration={120}
        blurIntensity="0px"
        density={1.5}
        className="absolute inset-0 z-0 pointer-events-none opacity-50"
      />

      {/* Radial overlay to dim corners */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

      {/* ── Centered Glassmorphic Login Card Wrapper ────────────────────────── */}
      <div className="relative z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl shadow-indigo-500/5">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-400/20 bg-indigo-400/5 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Career Portal
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Sign In
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Access the Interview Simulator or Placement Engine
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. candidate_user"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Launch Destination Selector */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Select Engine Dashboard
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDestination("/placement")}
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  destination === "/placement"
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                    : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                📊 Placement Hub
              </button>
              <button
                type="button"
                onClick={() => setDestination("/interview")}
                className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                  destination === "/interview"
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                    : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                🎤 Mock Interview
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging in...
              </span>
            ) : (
              <>
                Let's Go <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
