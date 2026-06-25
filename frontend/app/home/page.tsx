"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Sparkles, 
  AlertTriangle, 
  X, 
  Terminal, 
  ArrowRight, 
  User, 
  Cpu, 
  Activity, 
  LogOut,
  ChevronRight,
  Database,
  Wifi
} from "lucide-react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "mentor" | "admin";
  token: string;
}

export default function UnifiedHubPortal() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickerTime, setTickerTime] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("authUser");
    if (!raw) {
      router.push("/");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setAuthUser(parsed);
    } catch {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTickerTime(now.toUTCString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);



  const handleModuleClick = (path: string, requiredRoles: string[], moduleName: string) => {
    if (!authUser) return;

    const currentRole = authUser.role;

    if (requiredRoles.includes(currentRole)) {
      router.push(path);
    } else {
      const formattedRole = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
      setModalMessage(
        `[403 FORBIDDEN] Access Denied. Your current profile '${formattedRole}' does not possess the higher-order cryptographic keys required to operate this interface.`
      );
      setIsModalOpen(true);

      // Trigger backend security log generation via rbac Gate challenge
      fetch("/api/admin/security-logs", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authUser.token || localStorage.getItem("token") || ""}`,
          "Content-Type": "application/json"
        }
      }).catch(() => {});
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/");
  };

  const modules = [
    {
      id: "assessments",
      name: "Skill Assessments",
      path: "/placement",
      roles: ["student", "mentor", "admin"],
      icon: "📊",
      tech: "SVG Profile Progression Blueprint Engine",
      desc: "Assess composite profile scores, map historical development curves, and review dynamic learning blueprints."
    },
    {
      id: "interview",
      name: "Task 1: AI Interview",
      path: "/interview",
      roles: ["student", "mentor", "admin"],
      icon: "🎤",
      tech: "Real-time AI Grading Grader Engine",
      desc: "Engage in adaptive technical interview conversations with automated grading metrics calculated at runtime."
    },
    {
      id: "telemetry",
      name: "Task 5: Live System Telemetry",
      path: "/security",
      roles: ["mentor", "admin"],
      icon: "⚙️",
      tech: "Active Sessions Telemetry Audit Monitor",
      desc: "Monitor active sessions, stream user logs in real-time, inspect suspicious events, and revoke credentials."
    },
    {
      id: "admin",
      name: "Task 6: Admin Security Console",
      path: "/admin",
      roles: ["admin"],
      icon: "🛡️",
      tech: "Role-Based Access Control Audit Center",
      desc: "Gated dashboard to manage users, update system security settings, search logs, and modify active roles."
    }
  ];

  if (!authUser) return null;

  const glassmorphismStyle = {
    backdropFilter: "blur(20px)",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  };

  return (
    <div className="min-h-screen bg-[#020205] text-slate-100 flex relative overflow-hidden select-none">
      
      {/* ─── DYNAMIC BACKGROUND GRID AND GLOWS ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />
        <div className="absolute top-10 right-1/4 w-[600px] h-[600px] bg-cyan-950/10 rounded-full blur-[130px] opacity-40" />
        <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-indigo-950/10 rounded-full blur-[130px] opacity-40" />
      </div>

      {/* ─── CUSTOM NAVIGATION SIDEBAR ─── */}
      <aside 
        className="w-72 border-r border-slate-900/60 p-6 flex flex-col justify-between relative z-10 hidden lg:flex shadow-2xl"
        style={glassmorphismStyle}
      >
        <div className="space-y-8">
          {/* Logo Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center font-black text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.35)]">
              ⬡
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-white uppercase">CORE MATRIX</h2>
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">HUD CENTRAL v6</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest px-2 mb-3">WORKSPACE NODES</p>
            {modules.map((m) => {
              const isAuthorized = m.roles.includes(authUser.role);
              const isTask6 = m.id === "admin";
              return (
                <motion.div
                  key={m.id}
                  onClick={() => handleModuleClick(m.path, m.roles, m.name)}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/5 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{m.icon}</span>
                    <span className={`text-xs font-semibold ${
                      isTask6 
                        ? "text-cyan-400 font-bold group-hover:text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]" 
                        : "text-slate-300 group-hover:text-cyan-400"
                    } transition-colors`}>
                      {m.name.replace("Task 5: ", "").replace("Task 6: ", "").replace("Task 1: ", "")}
                    </span>
                  </div>
                  <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                    isAuthorized 
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    {isAuthorized ? "AUTH" : "LOCK"}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* User Info & Logout footer */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div 
            className="flex items-center gap-3 p-2.5 rounded-xl"
            style={glassmorphismStyle}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-white/5">
              <User className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{authUser.name}</h4>
              <p className="text-[9px] text-slate-500 font-mono truncate">{authUser.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              {authUser.role} profile
            </span>
            <button 
              onClick={handleLogout} 
              className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/15 cursor-pointer transition-all active:scale-95"
              title="Terminate Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONSOLE HUD WORKSPACE ─── */}
      <main className="flex-1 flex flex-col justify-between overflow-y-auto relative z-10 p-6 sm:p-8">
        <div>
          {/* Top telemetry ticker bar */}
          <div 
            className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl text-[10px] font-mono text-slate-400 mb-8"
            style={glassmorphismStyle}
          >
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Wifi className="w-3.5 h-3.5 animate-pulse" /> NODE ONLINE
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline flex items-center gap-1">
                <Database className="w-3.5 h-3.5" /> SECURE TUNNEL IP: 127.0.0.1
              </span>
            </div>
            <div>
              <span className="text-slate-500">CLOCK:</span> {tickerTime || "SYNCHRONIZING..."}
            </div>
          </div>

          {/* Welcome Screen Area */}
          <div className="mb-10">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
              CONTROL <span className="bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">MATRIX PORTAL</span>
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-mono">
              Welcome Agent <span className="text-cyan-400 font-bold">{authUser.name}</span>. Access clearance initialized for profile role <span className="text-indigo-400 uppercase font-black">[{authUser.role}]</span>.
            </p>
          </div>

          {/* Live System Terminal Log Simulation widget */}
          <div 
            className="p-4 rounded-xl font-mono text-[11px] text-slate-400 mb-10 shadow-inner"
            style={glassmorphismStyle}
          >
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Holographic System Logs Ticker</span>
            </div>
            <div className="space-y-1.5 leading-relaxed">
              <p className="text-cyan-400/70"><span className="text-slate-600">[syslog]</span> Matrix session authentication sequence completed successfully.</p>
              <p className="text-indigo-400/70"><span className="text-slate-600">[syslog]</span> Clearance level verified: <span className="uppercase text-slate-200">[{authUser.role}]</span>.</p>
              <p className="text-emerald-400/70"><span className="text-slate-600">[syslog]</span> Cryptographic tunnels opened cleanly. Gating modules active.</p>
            </div>
          </div>

          {/* Console Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((m) => {
              const isAuthorized = m.roles.includes(authUser.role);
              const isTask6 = m.id === "admin";
              return (
                <motion.div
                  key={m.id}
                  onClick={() => handleModuleClick(m.path, m.roles, m.name)}
                  whileHover={{ y: -2 }}
                  className="relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 group shadow-md"
                  style={{
                    ...glassmorphismStyle,
                    borderColor: isAuthorized 
                      ? "rgba(255,255,255,0.1)" 
                      : "rgba(239,68,68,0.15)",
                  }}
                >
                  {/* Glowing hover bar */}
                  <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r transition-all duration-300 ${
                    isAuthorized 
                      ? "from-transparent via-cyan-400/30 to-transparent group-hover:via-cyan-400/80" 
                      : "from-transparent via-red-500/20 to-transparent group-hover:via-red-500/60"
                  }`} />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl select-none">{m.icon}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                        isAuthorized
                          ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        {isAuthorized ? "Clearance Level Ok" : "Access Restricted"}
                      </span>
                    </div>

                    <div>
                      <h3 className={`text-base font-bold tracking-wide ${isTask6 ? "text-cyan-350 drop-shadow-[0_0_6px_rgba(6,182,212,0.25)]" : "text-white"}`}>
                        {m.name}
                      </h3>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">{m.tech}</p>
                      <p className="text-xs text-slate-400 mt-3.5 leading-relaxed">{m.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-xs font-bold font-mono">
                    <span className={isAuthorized ? "text-cyan-400" : "text-red-400"}>
                      {isAuthorized ? "Open Portal Node" : "Cryptographic Gate Locked"}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-200 group-hover:translate-x-1 ${
                      isAuthorized ? "text-cyan-400" : "text-red-400"
                    }`} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="mt-12 pt-6 border-t border-white/5 text-center text-[10px] font-mono text-slate-600 flex justify-between items-center">
          <div>SECURE SESSION HUD DISPLAY SYSTEM</div>
          <div>ROLE CONFIGURATION PROTOCOL TASK 6</div>
        </div>
      </main>

      {/* ─── CRYPTOGRAPHIC WARNING MODAL (GATED HUD STYLE) ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: "rgba(2,2,6,0.9)", backdropFilter: "blur(15px)" }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl p-8 relative shadow-[0_0_50px_rgba(239,68,68,0.25)]"
              style={{
                backdropFilter: "blur(20px)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Corner warning markings */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/40 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500/40 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500/40 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500/40 rounded-br-xl" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">SECURITY CLEARANCE ALERT</h3>
                    <p className="text-[10px] text-red-500 font-mono tracking-widest">CODE: 403_FORBIDDEN_GATING_VIOLATION</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-5 font-mono text-xs text-red-400 leading-relaxed shadow-inner">
                {modalMessage}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[9px] font-mono text-slate-500 text-center sm:text-left">
                  Attempt logged into platform audit telemetry logs database system.
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 text-xs font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
