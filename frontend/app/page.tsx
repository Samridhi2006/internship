"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Sparkles, KeyRound, Mail, ChevronRight } from "lucide-react";

export default function EntryLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const authUser = localStorage.getItem("authUser");
    if (token && authUser) {
      router.push("/home");
    }
  }, [router]);

  // Floating scifi particles background logic
  useEffect(() => {
    const canvas = document.getElementById("particle-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; alpha: number }> = [];
    const count = 40;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      });

      ctx.strokeStyle = "rgba(6, 182, 212, 0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Clear historical tokens and auth state right before dispatching the request to prevent collisions
    localStorage.removeItem("token");
    localStorage.removeItem("authUser");
    localStorage.removeItem("isLoggedIn");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

    try {
      let res;
      try {
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: selectedRole, selectedRole }),
        });
      } catch (proxyErr) {
        console.warn("Relative proxy fetch failed, attempting absolute server URL fallback...", proxyErr);
        res = await fetch("http://localhost:4000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: selectedRole, selectedRole }),
        });
      }
      const data = await res.json();

      if (data.success) {
        // Validate the return payload:
        // A student cannot escalate to mentor/admin.
        // A mentor cannot escalate to admin.
        const dbRole = data.user.role;
        if (selectedRole === "admin" && dbRole !== "admin") {
          setError("[AUTH ERROR] Unauthorized profile escalation: Your security clearance is insufficient for 'Administrator' role execution.");
          setLoading(false);
          return;
        }
        if (selectedRole === "mentor" && dbRole === "student") {
          setError("[AUTH ERROR] Unauthorized profile escalation: Your security clearance is insufficient for 'Mentor' role execution.");
          setLoading(false);
          return;
        }

        // Save complete session tokens entirely in client local storage
        const sessionPayload = {
          id: data.user.id || data.user._id,
          name: data.user.name,
          email: data.user.email,
          role: selectedRole, // Save explicitly selected role profile for gating simulation
          token: data.token
        };
        localStorage.setItem("authUser", JSON.stringify(sessionPayload));
        localStorage.setItem("token", data.token);
        localStorage.setItem("isLoggedIn", "true");

        // Write cookie for Next.js middleware (expiry: 1 day)
        document.cookie = `token=${data.token}; path=/; max-age=86400;`;
        
        // Immediate precise contextual routing to the unified system portal page
        router.push("/home");
      } else {
        setError(data.message || "Invalid credentials execution profiles.");
      }
    } catch (err) {
      setError("Failed to communicate with authentication cluster nodes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden select-none"
      style={{
        background: "linear-gradient(160deg, #030718ee 0%, #060d2e 40%, #0a0a35dd 100%)",
      }}
    >
      {/* ─── PERSISTENT BACKGROUND IMAGE OVERLAY ─── */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/image_c13234.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.18,
        }}
      />

      {/* Floating Canvas Particles */}
      <canvas id="particle-canvas" className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Scifi scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.025] z-1"
        style={{
          backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)",
          backgroundSize: "100% 4px"
        }}
      />

      <div 
        className="w-full max-w-md p-8 rounded-2xl relative z-10 shadow-[0_0_50px_rgba(6,182,212,0.12)]"
        style={{
          backdropFilter: "blur(20px)",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Glow corner decorations */}
        <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-cyan-500/35 rounded-tl-2xl" />
        <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-cyan-500/35 rounded-tr-2xl" />
        <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-cyan-500/35 rounded-bl-2xl" />
        <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-cyan-500/35 rounded-br-2xl" />

        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-gradient-to-br from-cyan-400/10 to-indigo-600/10 border border-cyan-500/20 rounded-2xl items-center justify-center mb-4 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <Shield className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-white">Career Prep Portal</h1>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">ROLE-BASED ACCESS CONTROL GATEWAY v6.0</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl mb-6 font-mono leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" /> Email Address
            </label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="agent@matrix.edu" 
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all font-mono placeholder:text-slate-700 text-slate-100" 
              style={{
                backdropFilter: "blur(20px)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Password
            </label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all font-mono placeholder:text-slate-700 text-slate-100" 
              style={{
                backdropFilter: "blur(20px)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Execution Clearance Profile
            </label>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)} 
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all font-mono text-slate-200 cursor-pointer"
              style={{
                backdropFilter: "blur(20px)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <option value="student" style={{ background: "#0c0e25" }}>Student Clearance (Level 1)</option>
              <option value="mentor" style={{ background: "#0c0e25" }}>Mentor Clearance (Level 2)</option>
              <option value="admin" style={{ background: "#0c0e25" }}>Administrator Clearance (Level 3)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 disabled:opacity-50 text-slate-950 font-black uppercase text-xs tracking-widest rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 font-mono">
                <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                VERIFYING CLEARANCE...
              </span>
            ) : (
              <>
                AUTHENTICATE SESSION <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
