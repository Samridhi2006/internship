"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Location {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

interface ActiveSession {
  id: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  os: string;
  browser: string;
  ipAddress: string;
  location: Location;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

interface SecurityLog {
  _id: string;
  timestamp: string;
  eventType:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "ACCOUNT_LOCKOUT"
    | "SUSPICIOUS_LOGIN"
    | "PASSWORD_RESET_REQUEST"
    | "PASSWORD_RESET_SUCCESS"
    | "EMAIL_VERIFIED"
    | "SESSION_REVOKED"
    | "REGISTRATION";
  ipAddress: string;
  deviceDetails: {
    deviceType: string;
    os: string;
    browser: string;
  };
  location?: Location;
  status: "SUCCESS" | "FAILED" | "BLOCKED" | "WARNING";
  metadata?: Record<string, unknown>;
}

interface SecuritySummary {
  accountStatus: "SECURE" | "LOCKED" | "SUSPICIOUS" | "AT_RISK";
  isLockedOut: boolean;
  lockoutUntil: string | null;
  loginAttempts: number;
  activeSessionCount: number;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  isVerified: boolean;
  recentThreatCount: number;
  recentFailedLoginCount: number;
}

// ─── Animated Canvas Background ─────────────────────────────────────────────

function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", resize);

    // Nodes
    type Node = {
      x: number; y: number; vx: number; vy: number;
      r: number; pulse: number; pulseSpeed: number;
    };

    const NODE_COUNT = 55;
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.008,
    }));

    // Hex grid cells
    type HexCell = { cx: number; cy: number; opacity: number; phase: number };
    const HEX_RADIUS = 70;
    const hexCells: HexCell[] = [];
    const hW = HEX_RADIUS * Math.sqrt(3);
    const hH = HEX_RADIUS * 2;
    const cols = Math.ceil(W / hW) + 2;
    const rowsH = Math.ceil(H / (hH * 0.75)) + 2;
    for (let row = -1; row < rowsH; row++) {
      for (let col = -1; col < cols; col++) {
        const cx = col * hW + (row % 2 === 0 ? 0 : hW / 2);
        const cy = row * hH * 0.75;
        hexCells.push({ cx, cy, opacity: Math.random() * 0.08 + 0.02, phase: Math.random() * Math.PI * 2 });
      }
    }

    // Data streams
    type DataStream = { x: number; y: number; speed: number; length: number; opacity: number };
    const streams: DataStream[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: Math.random() * 1.2 + 0.4,
      length: Math.random() * 80 + 40,
      opacity: Math.random() * 0.3 + 0.05,
    }));

    // Rings
    type Ring = { x: number; y: number; radius: number; maxRadius: number; opacity: number; speed: number };
    const rings: Ring[] = Array.from({ length: 4 }, (_, i) => ({
      x: W / 2,
      y: H / 2,
      radius: 80 + i * 60,
      maxRadius: 400,
      opacity: 0.12,
      speed: 0.3 + i * 0.1,
    }));

    let t = 0;

    function drawHexagon(cx: number, cy: number, r: number) {
      ctx!.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      }
      ctx!.closePath();
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);

      // Deep navy gradient background
      const bg = ctx!.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
      bg.addColorStop(0, "#050d2e");
      bg.addColorStop(0.4, "#031a4a");
      bg.addColorStop(0.75, "#020c2e");
      bg.addColorStop(1, "#010818");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, W, H);

      // Hex grid
      hexCells.forEach((cell) => {
        const o = cell.opacity * (0.6 + 0.4 * Math.sin(t * 0.005 + cell.phase));
        ctx!.strokeStyle = `rgba(0,150,255,${o})`;
        ctx!.lineWidth = 0.4;
        drawHexagon(cell.cx, cell.cy, HEX_RADIUS * 0.96);
        ctx!.stroke();
      });

      // Glow rings emanating from center
      rings.forEach((ring) => {
        ring.radius += ring.speed * 0.3;
        if (ring.radius > ring.maxRadius) ring.radius = 80;
        const fadeO = (1 - ring.radius / ring.maxRadius) * ring.opacity;
        ctx!.beginPath();
        ctx!.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(0,180,255,${fadeO})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      });

      // Connection edges
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.3;
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.strokeStyle = `rgba(0,120,220,${alpha})`;
            ctx!.lineWidth = 0.6;
            ctx!.stroke();
          }
        }
      }

      // Data streams (vertical falling lines)
      streams.forEach((s) => {
        s.y += s.speed;
        if (s.y > H + s.length) s.y = -s.length;
        const grad = ctx!.createLinearGradient(s.x, s.y - s.length, s.x, s.y);
        grad.addColorStop(0, `rgba(0,100,255,0)`);
        grad.addColorStop(1, `rgba(0,200,255,${s.opacity})`);
        ctx!.beginPath();
        ctx!.moveTo(s.x, s.y - s.length);
        ctx!.lineTo(s.x, s.y);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1;
        ctx!.stroke();
      });

      // Nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += n.pulseSpeed;

        const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
        glow.addColorStop(0, `rgba(0,200,255,0.5)`);
        glow.addColorStop(1, `rgba(0,100,255,0)`);
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r + 0.5 * Math.sin(n.pulse), 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(100,220,255,0.85)`;
        ctx!.fill();
      });

      // Central lock glow
      const cx2 = W / 2;
      const cy2 = H / 2;
      const lockGlow = ctx!.createRadialGradient(cx2, cy2, 0, cx2, cy2, 260);
      lockGlow.addColorStop(0, `rgba(0,120,255,0.07)`);
      lockGlow.addColorStop(1, `rgba(0,0,0,0)`);
      ctx!.fillStyle = lockGlow;
      ctx!.fillRect(0, 0, W, H);

      t++;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getDeviceIcon(deviceType: string) {
  if (deviceType === "mobile") {
    return (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (deviceType === "tablet") {
    return (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    "United States": "🇺🇸", "India": "🇮🇳", "United Kingdom": "🇬🇧",
    "Germany": "🇩🇪", "France": "🇫🇷", "Japan": "🇯🇵", "Canada": "🇨🇦",
    "Australia": "🇦🇺", "Brazil": "🇧🇷", "China": "🇨🇳", "Russia": "🇷🇺",
  };
  return flags[country] || "🌐";
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getLogStyle(log: SecurityLog) {
  switch (log.eventType) {
    case "LOGIN_SUCCESS":
    case "EMAIL_VERIFIED":
    case "PASSWORD_RESET_SUCCESS":
    case "REGISTRATION":
      return {
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/5",
        borderColor: "border-emerald-500/20",
        dot: "bg-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      };
    case "PASSWORD_RESET_REQUEST":
    case "SESSION_REVOKED":
      return {
        textColor: "text-yellow-400",
        bgColor: "bg-yellow-500/5",
        borderColor: "border-yellow-500/20",
        dot: "bg-yellow-400",
        badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      };
    case "ACCOUNT_LOCKOUT":
    case "SUSPICIOUS_LOGIN":
      return {
        textColor: "text-red-400",
        bgColor: "bg-red-600/10 animate-pulse",
        borderColor: "border-red-500/40",
        dot: "bg-red-500",
        badge: "bg-red-600/20 text-red-400 border-red-500/40",
      };
    case "LOGIN_FAILED":
      return {
        textColor: "text-orange-400",
        bgColor: "bg-orange-500/5",
        borderColor: "border-orange-500/20",
        dot: "bg-orange-400",
        badge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      };
    default:
      return {
        textColor: "text-slate-400",
        bgColor: "bg-slate-500/5",
        borderColor: "border-slate-500/20",
        dot: "bg-slate-400",
        badge: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      };
  }
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Login Success",
  LOGIN_FAILED: "Login Failed",
  ACCOUNT_LOCKOUT: "Account Lockout",
  SUSPICIOUS_LOGIN: "Suspicious Login",
  PASSWORD_RESET_REQUEST: "Reset Requested",
  PASSWORD_RESET_SUCCESS: "Reset Complete",
  EMAIL_VERIFIED: "Email Verified",
  SESSION_REVOKED: "Session Revoked",
  REGISTRATION: "Registration",
};

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS);

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SecuritySummary["accountStatus"] }) {
  const config = {
    SECURE: { label: "Account Status: Secure", color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-400/30", dot: "bg-emerald-400", pulse: false },
    AT_RISK: { label: "Account Status: At Risk", color: "text-yellow-300", bg: "bg-yellow-500/10 border-yellow-400/30", dot: "bg-yellow-400", pulse: true },
    SUSPICIOUS: { label: "Suspicious Activity Detected", color: "text-orange-300", bg: "bg-orange-500/10 border-orange-400/30", dot: "bg-orange-400", pulse: true },
    LOCKED: { label: "Account Locked", color: "text-red-300", bg: "bg-red-500/10 border-red-500/40", dot: "bg-red-400", pulse: true },
  }[status];

  return (
    <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border ${config.bg} backdrop-blur-sm`}>
      <span className={`relative flex h-2.5 w-2.5`}>
        {config.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-70`} />}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.dot}`} />
      </span>
      <span className={`text-sm font-semibold tracking-wide ${config.color}`}>{config.label}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative bg-white/3 border border-white/8 rounded-2xl px-5 py-4 backdrop-blur-md">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: ActiveSession;
  onRevoke: (id: string) => Promise<void>;
}

function SessionCard({ session, onRevoke }: SessionCardProps) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await onRevoke(session.id);
    } catch (err) {
      console.error(err);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className={`relative group bg-white/3 border rounded-2xl p-5 backdrop-blur-md transition-all duration-300 hover:bg-white/5 ${session.isCurrent ? "border-cyan-400/30 shadow-[0_0_20px_rgba(0,200,255,0.06)]" : "border-white/8 hover:border-white/15"}`}>
      {session.isCurrent && (
        <div className="absolute top-4 right-4">
          <span className="text-[10px] font-bold tracking-widest text-cyan-400 bg-cyan-400/10 border border-cyan-400/25 px-2.5 py-1 rounded-full uppercase">
            Current
          </span>
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${session.isCurrent ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/25" : "bg-blue-500/10 text-blue-400 border border-blue-400/15"}`}>
          {getDeviceIcon(session.deviceType)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 items-center mb-1.5">
            <h3 className="text-sm font-semibold text-white">{session.os}</h3>
            <span className="text-slate-500">·</span>
            <span className="text-sm text-slate-400">{session.browser}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="font-mono">{session.ipAddress}</span>
            <span>{getCountryFlag(session.location.country)} {session.location.city}, {session.location.country}</span>
            <span>Active {formatRelativeTime(session.lastActive)}</span>
          </div>
        </div>
      </div>
      {!session.isCurrent && (
        <div className="mt-4 pt-4 border-t border-white/6">
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {revoking ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                </svg>
                Revoking…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Revoke Device Access
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: SecurityLog }) {
  const style = getLogStyle(log);
  return (
    <tr className={`border-b border-white/5 transition-colors hover:bg-white/2 ${log.eventType === "ACCOUNT_LOCKOUT" || log.eventType === "SUSPICIOUS_LOGIN" ? "bg-red-600/5" : ""}`}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${style.dot}`} />
          <span className={`text-xs font-semibold ${style.textColor} whitespace-nowrap`}>
            {EVENT_TYPE_LABELS[log.eventType] || log.eventType}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border uppercase ${style.badge}`}>
          {log.status}
        </span>
      </td>
      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{log.ipAddress}</td>
      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
        {log.deviceDetails.os} · {log.deviceDetails.browser}
      </td>
      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
        {new Date(log.timestamp).toLocaleString()}
      </td>
    </tr>
  );
}

// ─── Password Security Panel ─────────────────────────────────────────────────

function PasswordPanel() {
  const [settings, setSettings] = useState({
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecial: true,
    sessionTimeout: 1440,
    maxSessions: 1,
    alertOnNewDevice: true,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-md">
      <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2.5">
        <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 2a5 5 0 00-5 5v3H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-2V7a5 5 0 00-5-5z" />
        </svg>
        Security Parameters
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Minimum Password Length: <span className="text-cyan-400">{settings.minLength}</span></label>
          <input type="range" min={8} max={32} value={settings.minLength}
            onChange={(e) => setSettings((p) => ({ ...p, minLength: +e.target.value }))}
            className="w-full accent-cyan-400 cursor-pointer" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Session Timeout: <span className="text-cyan-400">{settings.sessionTimeout >= 1440 ? `${settings.sessionTimeout / 1440}d` : `${settings.sessionTimeout}m`}</span></label>
          <input type="range" min={60} max={10080} step={60} value={settings.sessionTimeout}
            onChange={(e) => setSettings((p) => ({ ...p, sessionTimeout: +e.target.value }))}
            className="w-full accent-cyan-400 cursor-pointer" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Max Active Sessions: <span className="text-cyan-400">{settings.maxSessions}</span></label>
          <input type="range" min={1} max={5} value={settings.maxSessions}
            onChange={(e) => setSettings((p) => ({ ...p, maxSessions: +e.target.value }))}
            className="w-full accent-cyan-400 cursor-pointer" />
        </div>
        <div className="flex flex-col gap-3 pt-1">
          {[
            { key: "requireUppercase", label: "Require Uppercase Letters" },
            { key: "requireNumbers", label: "Require Numbers" },
            { key: "requireSpecial", label: "Require Special Characters" },
            { key: "alertOnNewDevice", label: "Alert on New Device Login" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => setSettings((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${settings[key as keyof typeof settings] ? "bg-cyan-500" : "bg-white/10"}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${settings[key as keyof typeof settings] ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 hover:bg-cyan-500/25 transition-all duration-200"
        >
          {saved ? "✓ Saved" : "Save Parameters"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Security settings updated.</span>}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SecurityDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<SecuritySummary>({
    accountStatus: "SECURE",
    isLockedOut: false,
    lockoutUntil: null,
    loginAttempts: 0,
    activeSessionCount: 2,
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    lastLoginIp: "103.21.58.14",
    isVerified: true,
    recentThreatCount: 1,
    recentFailedLoginCount: 2,
  });

  const [sessions, setSessions] = useState<ActiveSession[]>([
    {
      id: "sess_001",
      deviceType: "desktop",
      os: "Windows 11",
      browser: "Chrome 124",
      ipAddress: "103.21.58.14",
      location: { country: "India", region: "Jharkhand", city: "Ranchi" },
      lastActive: new Date(Date.now() - 120000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      isCurrent: true,
    },
    {
      id: "sess_002",
      deviceType: "mobile",
      os: "Android 14",
      browser: "Chrome 123",
      ipAddress: "49.37.201.100",
      location: { country: "India", region: "Maharashtra", city: "Mumbai" },
      lastActive: new Date(Date.now() - 7200000).toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      isCurrent: false,
    },
  ]);
  const [logs, setLogs] = useState<SecurityLog[]>([
    {
      _id: "l1", timestamp: new Date(Date.now() - 120000).toISOString(),
      eventType: "LOGIN_SUCCESS", ipAddress: "103.21.58.14",
      deviceDetails: { deviceType: "desktop", os: "Windows 11", browser: "Chrome 124" },
      location: { country: "India", region: "Jharkhand", city: "Ranchi" },
      status: "SUCCESS",
    },
    {
      _id: "l2", timestamp: new Date(Date.now() - 3600000).toISOString(),
      eventType: "SUSPICIOUS_LOGIN", ipAddress: "185.220.101.55",
      deviceDetails: { deviceType: "unknown", os: "Linux", browser: "Unknown" },
      location: { country: "Russia", region: "Moscow", city: "Moscow" },
      status: "BLOCKED",
    },
    {
      _id: "l3", timestamp: new Date(Date.now() - 7200000).toISOString(),
      eventType: "LOGIN_FAILED", ipAddress: "185.220.101.55",
      deviceDetails: { deviceType: "desktop", os: "Linux", browser: "Firefox 115" },
      status: "FAILED",
    },
    {
      _id: "l4", timestamp: new Date(Date.now() - 14400000).toISOString(),
      eventType: "ACCOUNT_LOCKOUT", ipAddress: "185.220.101.55",
      deviceDetails: { deviceType: "desktop", os: "Linux", browser: "Unknown" },
      status: "BLOCKED",
    },
    {
      _id: "l5", timestamp: new Date(Date.now() - 86400000).toISOString(),
      eventType: "PASSWORD_RESET_REQUEST", ipAddress: "103.21.58.14",
      deviceDetails: { deviceType: "desktop", os: "Windows 11", browser: "Chrome 124" },
      status: "WARNING",
    },
    {
      _id: "l6", timestamp: new Date(Date.now() - 172800000).toISOString(),
      eventType: "EMAIL_VERIFIED", ipAddress: "103.21.58.14",
      deviceDetails: { deviceType: "desktop", os: "Windows 11", browser: "Chrome 124" },
      status: "SUCCESS",
    },
    {
      _id: "l7", timestamp: new Date(Date.now() - 259200000).toISOString(),
      eventType: "REGISTRATION", ipAddress: "103.21.58.14",
      deviceDetails: { deviceType: "desktop", os: "Windows 11", browser: "Chrome 124" },
      status: "SUCCESS",
    },
  ]);
  const [logFilter, setLogFilter] = useState<string>("");
  const [logPage, setLogPage] = useState(1);
  const [totalLogPages, setTotalLogPages] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(7);
  const [loading, setLoading] = useState(true);

  const LOGS_PER_PAGE = 8;
  const API_URL = "http://localhost:4000/api/security";

  const fetchSecurityData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTotalLogsCount(7);
      setTotalLogPages(1);
      setLoading(false);
      return;
    }

    try {
      // Fetch summary
      const sumRes = await fetch(`${API_URL}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sumRes.status === 401) {
        localStorage.removeItem("token");
        setLoading(false);
        return;
      }
      const sumData = await sumRes.json();
      if (sumData.success) {
        setSummary({
          accountStatus: sumData.data.accountStatus,
          isLockedOut: sumData.data.isLockedOut,
          lockoutUntil: sumData.data.lockoutUntil,
          loginAttempts: sumData.data.loginAttempts,
          activeSessionCount: sumData.data.activeSessionCount,
          lastLoginAt: sumData.data.lastLoginAt,
          lastLoginIp: sumData.data.lastLoginIp,
          isVerified: sumData.data.isVerified,
          recentThreatCount: sumData.data.accountStatus === "SUSPICIOUS" ? 1 : 0,
          recentFailedLoginCount: sumData.data.loginAttempts,
        });
      }

      // Fetch sessions
      const sessRes = await fetch(`${API_URL}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessData = await sessRes.json();
      if (sessData.success) {
        setSessions(sessData.data.sessions);
      }

      // Fetch logs
      const logsRes = await fetch(`${API_URL}/logs?page=${logPage}&limit=${LOGS_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLogs(logsData.data.logs);
        setTotalLogPages(logsData.data.pagination.totalPages || 1);
        setTotalLogsCount(logsData.data.pagination.totalCount || 0);
      }
    } catch (err) {
      console.error("Error loading security console data, falling back to mock:", err);
    } finally {
      setLoading(false);
    }
  }, [logPage]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const handleRevokeSession = async (sessionId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSummary((prev) => ({
        ...prev,
        activeSessionCount: Math.max(0, prev.activeSessionCount - 1),
      }));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setSummary((prev) => ({
          ...prev,
          activeSessionCount: Math.max(0, prev.activeSessionCount - 1),
        }));
        fetchSecurityData();
      }
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setSummary((prev) => ({
        ...prev,
        activeSessionCount: 1,
      }));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/sessions/other`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setSummary((prev) => ({
          ...prev,
          activeSessionCount: 1,
        }));
        fetchSecurityData();
      }
    } catch (err) {
      console.error("Failed to revoke other sessions:", err);
    }
  };

  const filteredLogs = logFilter ? logs.filter((l) => l.eventType === logFilter) : logs;

  if (loading) {
    return (
      <div className="relative min-h-screen font-sans flex items-center justify-center bg-[#020617]">
        <CyberBackground />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-cyan-400 tracking-wider uppercase animate-pulse">Initializing Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen font-sans">
      <CyberBackground />

      {/* Content layer */}
      <div className="relative z-10 min-h-screen">
        {/* Nav bar */}
        <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(0,200,255,0.4)]">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a5 5 0 00-5 5v3H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-2V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v3H9V7a3 3 0 013-3zm0 9a2 2 0 110 4 2 2 0 010-4z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white tracking-wide">Security Console</span>
              <span className="hidden sm:block text-xs text-slate-600">/ AI Placement Readiness Engine</span>
            </div>
            <StatusBadge status={summary.accountStatus} />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Page heading */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Authentication & Security Management
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Real-time session telemetry, anomaly detection, and access control enforcement.
              </p>
            </div>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeAllOtherSessions}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl hover:bg-red-500/20 transition-all duration-200"
              >
                Revoke All Other Sessions
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Active Sessions" value={sessions.length} sub="devices connected" />
            <StatCard label="Failed Logins" value={summary.recentFailedLoginCount} sub="recent attempts" />
            <StatCard label="Threat Alerts" value={summary.recentThreatCount} sub="flagged events" />
            <StatCard
              label="Last Login"
              value={summary.lastLoginAt ? formatRelativeTime(summary.lastLoginAt) : "Never"}
              sub={summary.lastLoginIp || ""}
            />
          </div>

          {/* Active Sessions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" opacity={0.2} /><circle cx="12" cy="12" r="4" />
                </svg>
                Active Sessions
              </h2>
              <span className="text-xs text-slate-500 font-mono">{sessions.length} device{sessions.length !== 1 ? "s" : ""}</span>
            </div>
            {sessions.length === 0 ? (
              <div className="bg-white/2 border border-white/6 rounded-2xl p-8 text-center text-sm text-slate-600">
                No active sessions found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {sessions.map((s) => (
                  <SessionCard key={s.id} session={s} onRevoke={handleRevokeSession} />
                ))}
              </div>
            )}
          </section>

          {/* Security Logs */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 12h6M9 16h6M9 8h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
                </svg>
                Security Audit Log
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={logFilter}
                  onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
                  className="bg-white/5 border border-white/10 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-400/40 cursor-pointer"
                >
                  <option value="">All Events</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white/2 border border-white/6 rounded-2xl overflow-hidden backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Event</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">IP Address</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Device</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">No events match this filter.</td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, idx) => <LogRow key={log._id || log.timestamp || idx} log={log} />)
                    )}
                  </tbody>
                </table>
              </div>

              {totalLogPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                  <span className="text-xs text-slate-600">
                    Page {logPage} of {totalLogPages} · {totalLogsCount} events
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={logPage === 1}
                      className="px-3 py-1.5 text-xs text-slate-400 bg-white/5 border border-white/8 rounded-lg hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                      disabled={logPage === totalLogPages}
                      className="px-3 py-1.5 text-xs text-slate-400 bg-white/5 border border-white/8 rounded-lg hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Password Parameter Panel */}
          <PasswordPanel />

          {/* Footer */}
          <footer className="text-center py-4 border-t border-white/5">
            <p className="text-xs text-slate-700">
              AI Placement Readiness Engine · Task 5 — Enterprise Authentication & Security Management
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
