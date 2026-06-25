"use client";

// /frontend/app/admin/page.tsx
// Premium Glassmorphic Admin Console — Role-Based Access Control Dashboard
// Stack: Next.js App Router · TypeScript · Tailwind CSS · Framer Motion

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Role = "student" | "mentor" | "admin";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
}

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  isActive: boolean;
  lastLogin?: string;
}

interface SecurityLog {
  ownerEmail: string;
  ownerName: string;
  log: {
    EVENT_TYPE: string;
    timestamp: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    targetUserEmail?: string;
    previousRole?: string;
    newRole?: string;
    endpoint?: string;
    method?: string;
    ip?: string;
    performedByEmail?: string;
  };
}

interface PlatformStats {
  totalUsers: number;
  byRole: { student: number; mentor: number; admin: number };
  recentUsers: UserRow[];
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Permission Helper (client-side mirror of backend roles.js) ────────────────

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  student: ["view:interviews", "take:interview", "view:reports"],
  mentor: [
    "view:interviews",
    "view:reports",
    "evaluate:student",
    "post:feedback",
  ],
  admin: [
    "view:interviews",
    "take:interview",
    "view:reports",
    "evaluate:student",
    "post:feedback",
    "manage:users",
    "view:system_audit",
    "modify:settings",
  ],
};

function hasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// Animated floating particle
const Particle = ({
  x,
  y,
  size,
  delay,
  duration,
}: {
  x: string;
  y: string;
  size: number;
  delay: number;
  duration: number;
}) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      background:
        "radial-gradient(circle, rgba(0,212,255,0.7) 0%, rgba(0,100,200,0.2) 70%, transparent 100%)",
    }}
    animate={{
      y: [0, -30, 0],
      opacity: [0.3, 0.9, 0.3],
      scale: [1, 1.4, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Severity badge
const SeverityBadge = ({
  severity,
}: {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) => {
  const map = {
    LOW: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    CRITICAL: "bg-red-500/20 text-red-300 border-red-500/40",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${map[severity]}`}
    >
      {severity}
    </span>
  );
};

// Role badge
const RoleBadge = ({ role }: { role: Role }) => {
  const map = {
    student: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    mentor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    admin: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[role]}`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

// Stat card
const StatCard = ({
  label,
  value,
  icon,
  accent,
  delay,
}: {
  label: string;
  value: number;
  icon: string;
  accent: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    whileHover={{ scale: 1.03, y: -2 }}
    className="relative rounded-2xl border border-white/10 p-6 overflow-hidden group"
    style={{
      background:
        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
    }}
  >
    {/* Corner glow */}
    <div
      className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-30 blur-xl group-hover:opacity-60 transition-opacity duration-500 ${accent}`}
    />
    <div className="relative z-10">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-white mb-1">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-slate-400 font-medium tracking-wide uppercase">
        {label}
      </div>
    </div>
  </motion.div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();

  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data state
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userMeta, setUserMeta] = useState<PaginationMeta | null>(null);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [logMeta, setLogMeta] = useState<PaginationMeta | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "logs" | "settings"
  >("overview");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [logEventFilter, setLogEventFilter] = useState("");
  const [logSeverityFilter, setLogSeverityFilter] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [roleUpdateTarget, setRoleUpdateTarget] = useState<UserRow | null>(
    null
  );
  const [newRoleValue, setNewRoleValue] = useState<Role>("student");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth check on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setAccessDenied(true);
      setAuthChecked(true);
      return;
    }
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      
      if (decoded.role !== "admin") {
        setAccessDenied(true);
        setAuthChecked(true);
        return;
      }
      
      setAuthUser({
        id: decoded.sub,
        name: decoded.name || "Administrator",
        email: decoded.email || "admin@example.com",
        role: decoded.role as Role,
        token: token
      });
      setAuthChecked(true);
    } catch {
      setAccessDenied(true);
      setAuthChecked(true);
    }
  }, []);

  // Redirect non-admins after a short delay so they see the access-denied UI
  useEffect(() => {
    if (accessDenied) {
      const t = setTimeout(() => router.push("/"), 3500);
      return () => clearTimeout(t);
    }
  }, [accessDenied, router]);

  // ── API helpers ──────────────────────────────────────────────────────────────

  const apiFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      if (!authUser) return null;
      const res = await fetch(`/api${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authUser.token}`,
          ...(options?.headers ?? {}),
        },
      });
      if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
      return res.json();
    },
    [authUser]
  );

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Data fetchers ────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    if (!authUser) return;
    setLoadingStats(true);
    try {
      const data = await apiFetch("/admin/stats");
      if (data?.success) setStats(data.data);
    } catch (err) {
      console.error("fetchStats error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [apiFetch, authUser]);

  const fetchUsers = useCallback(async () => {
    if (!authUser) return;
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: String(userPage),
        limit: "10",
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const data = await apiFetch(`/admin/users?${params}`);
      if (data?.success) {
        setUsers(data.data.users);
        setUserMeta(data.data.pagination);
      }
    } catch (err) {
      console.error("fetchUsers error:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [apiFetch, authUser, userPage, roleFilter, searchQuery]);

  const fetchSecurityLogs = useCallback(async () => {
    if (!authUser) return;
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams({
        page: String(logPage),
        limit: "20",
        ...(logEventFilter ? { eventType: logEventFilter } : {}),
        ...(logSeverityFilter ? { severity: logSeverityFilter } : {}),
      });
      const data = await apiFetch(`/admin/security-logs?${params}`);
      if (data?.success) {
        setSecurityLogs(data.data.logs);
        setLogMeta(data.data.pagination);
      }
    } catch (err) {
      console.error("fetchSecurityLogs error:", err);
    } finally {
      setLoadingLogs(false);
    }
  }, [apiFetch, authUser, logPage, logEventFilter, logSeverityFilter]);

  // Initial data loads
  useEffect(() => {
    if (!authUser) return;
    fetchStats();
  }, [authUser, fetchStats]);

  useEffect(() => {
    if (!authUser || activeTab !== "users") return;
    fetchUsers();
  }, [authUser, activeTab, fetchUsers, userPage, roleFilter, searchQuery]);

  useEffect(() => {
    if (!authUser || activeTab !== "logs") return;
    fetchSecurityLogs();
  }, [authUser, activeTab, fetchSecurityLogs, logPage, logEventFilter, logSeverityFilter]);

  // Auto-refresh security logs
  useEffect(() => {
    if (autoRefreshLogs && activeTab === "logs") {
      autoRefreshRef.current = setInterval(fetchSecurityLogs, 8000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefreshLogs, activeTab, fetchSecurityLogs]);

  // ── Role update handler ──────────────────────────────────────────────────────

  const handleRoleUpdate = async () => {
    if (!roleUpdateTarget || !authUser) return;
    setUpdatingRole(true);
    try {
      const data = await apiFetch(`/admin/users/${roleUpdateTarget._id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ newRole: newRoleValue }),
      });
      if (data?.success) {
        showToast(
          `✓ ${roleUpdateTarget.name}'s role updated to ${newRoleValue}`,
          "success"
        );
        setRoleUpdateTarget(null);
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      showToast("✕ Failed to update role. Please try again.", "error");
      console.error("handleRoleUpdate error:", err);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!authUser) return;
    if (!confirm(`Are you sure you want to permanently delete user ${email}?`)) return;
    try {
      const data = await apiFetch(`/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (data?.success) {
        showToast(`✓ User ${email} deleted successfully.`, "success");
        fetchUsers();
        fetchStats();
      }
    } catch (err) {
      showToast("✕ Failed to delete user.", "error");
      console.error("handleDeleteUser error:", err);
    }
  };

  // ── Particles config ─────────────────────────────────────────────────────────

  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 4,
    duration: Math.random() * 4 + 4,
  }));

  // ── Access-denied screen ─────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030718]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #030718 0%, #060d2e 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('/bg-security.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 text-center max-w-md px-8 py-12 rounded-3xl border border-red-500/30"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,40,40,0.08) 0%, rgba(255,255,255,0.03) 100%)",
            backdropFilter: "blur(24px)",
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-6xl mb-6"
          >
            🔒
          </motion.div>
          <h1 className="text-2xl font-bold text-red-400 mb-3">
            Access Denied
          </h1>
          <p className="text-slate-400 mb-6 leading-relaxed">
            You don&apos;t have administrator privileges to access this console.
            Redirecting you to the home page…
          </p>
          <motion.div
            className="h-1 bg-red-500/30 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-red-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3.5, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── MAIN ADMIN CONSOLE ───────────────────────────────────────────────────────

  const tabs = [
    { key: "overview", label: "Overview", icon: "⬡" },
    { key: "users", label: "User Management", icon: "◈" },
    { key: "logs", label: "Security Logs", icon: "◉" },
    { key: "settings", label: "System Settings", icon: "⚙" },
  ] as const;

  const eventTypeOptions = [
    "",
    "UNAUTHORIZED_ACCESS_ATTEMPT",
    "ROLE_MODIFIED",
    "ROLE_ACCESS_DENIED",
    "USER_DELETED",
    "INTERVIEW_EVALUATION",
    "INTERVIEW_COMPLETED",
    "INTERVIEW_STARTED",
  ];

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans text-slate-100"
      style={{ background: "linear-gradient(160deg, #030718 0%, #060d2e 40%, #0a0a35 100%)" }}
    >
      {/* ── Background image ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/bg-security.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          opacity: 0.18,
        }}
      />

      {/* ── Animated gradient overlays ── */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        animate={{
          background: [
            "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,100,255,0.12) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 70% 60%, rgba(0,200,255,0.10) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 40% 80%, rgba(80,0,255,0.10) 0%, transparent 70%)",
            "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(0,100,255,0.12) 0%, transparent 70%)",
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Scan-line overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,1) 2px, rgba(0,212,255,1) 3px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* ── Particles ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -60, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-xl text-sm font-semibold shadow-2xl border"
            style={{
              background:
                toast.type === "success"
                  ? "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,78,59,0.35))"
                  : "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(127,29,29,0.35))",
              borderColor:
                toast.type === "success"
                  ? "rgba(52,211,153,0.4)"
                  : "rgba(248,113,113,0.4)",
              color: toast.type === "success" ? "#34d399" : "#f87171",
              backdropFilter: "blur(20px)",
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Role Update Modal ── */}
      <AnimatePresence>
        {roleUpdateTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,24,0.8)", backdropFilter: "blur(8px)" }}
            onClick={() => setRoleUpdateTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/15 p-8"
              style={{
                background:
                  "linear-gradient(135deg, rgba(10,20,80,0.95) 0%, rgba(5,10,40,0.98) 100%)",
                backdropFilter: "blur(32px)",
                boxShadow: "0 0 60px rgba(0,100,255,0.2)",
              }}
            >
              <h3 className="text-xl font-bold text-white mb-2">
                Modify User Role
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Updating role for{" "}
                <span className="text-cyan-300 font-semibold">
                  {roleUpdateTarget.name}
                </span>{" "}
                ({roleUpdateTarget.email})
              </p>

              <div className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Current Role
              </div>
              <div className="mb-5">
                <RoleBadge role={roleUpdateTarget.role} />
              </div>

              <div className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Assign New Role
              </div>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {(["student", "mentor", "admin"] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setNewRoleValue(r)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                      newRoleValue === r
                        ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setRoleUpdateTarget(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/25 transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleUpdate}
                  disabled={
                    updatingRole || newRoleValue === roleUpdateTarget.role
                  }
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(135deg, #0070f3 0%, #00c6ff 100%)",
                    color: "#fff",
                  }}
                >
                  {updatingRole ? "Updating…" : "Confirm Update"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main layout ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Top header ── */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                Admin Console
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Glassmorphic RBAC Control Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Logged in as: <span className="text-cyan-400 font-medium">{authUser?.email}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                fetchStats();
                if (activeTab === "users") fetchUsers();
                if (activeTab === "logs") fetchSecurityLogs();
                showToast("✓ System metrics refreshed", "success");
              }}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all"
            >
              Refresh Data
            </button>
          </div>
        </motion.div>

        {/* ── Navigation Tab Bar ── */}
        <div className="flex border-b border-white/10 gap-2 mb-8 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-semibold transition-all select-none whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-450 hover:text-slate-350 hover:border-white/10"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content Container ── */}
        <div className="space-y-8">
          
          {/* ══════════════════════════════════════════
              TAB: OVERVIEW
          ══════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Users"
                  value={stats?.totalUsers ?? 0}
                  icon="👥"
                  accent="bg-cyan-500"
                  delay={0.1}
                />
                <StatCard
                  label="Students"
                  value={stats?.byRole.student ?? 0}
                  icon="🎓"
                  accent="bg-cyan-400"
                  delay={0.2}
                />
                <StatCard
                  label="Mentors"
                  value={stats?.byRole.mentor ?? 0}
                  icon="👨‍🏫"
                  accent="bg-purple-500"
                  delay={0.3}
                />
                <StatCard
                  label="Admins"
                  value={stats?.byRole.admin ?? 0}
                  icon="🛡️"
                  accent="bg-blue-500"
                  delay={0.4}
                />
              </div>

              {/* Lower split pane */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Users List */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white mb-2">
                    Recent User Registrations
                  </h3>
                  <div className="divide-y divide-white/5">
                    {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                      stats.recentUsers.map((user) => (
                        <div key={user._id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                            <p className="text-xs text-slate-550">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-mono">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                            <RoleBadge role={user.role} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-sm text-slate-500 text-center">No recent registrations.</p>
                    )}
                  </div>
                </div>

                {/* Active System Telemetry Check */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white mb-2">
                    Active System Telemetry Check
                  </h3>
                  <div className="space-y-3">
                    {[
                      { check: "Database Server Connection", status: "Active / Connected", health: "GOOD" },
                      { check: "JWT Token Handshake Engine", status: "HMAC SHA-256 Protected", health: "GOOD" },
                      { check: "Declarative RBAC Configuration", status: "Active (8 Permissions mapped)", health: "GOOD" },
                      { check: "Telemetry Audit Trails Scanners", status: "Real-time Monitoring Active", health: "GOOD" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{item.check}</p>
                          <p className="text-xs text-slate-500">{item.status}</p>
                        </div>
                        <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                          {item.health}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: USER MANAGEMENT
          ══════════════════════════════════════════ */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Filters / Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Search user name or email address…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setUserPage(1);
                  }}
                  className="flex-1 bg-slate-955/60 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-500/60 transition-all font-mono"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as Role | "");
                    setUserPage(1);
                  }}
                  className="bg-slate-955/60 border border-white/10 rounded-xl px-4 py-2.5 text-slate-350 text-sm focus:outline-none focus:border-cyan-500/60 transition-all font-mono"
                >
                  <option value="">Filter Roles (All)</option>
                  <option value="student">Student</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Users table */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
                {loadingUsers ? (
                  <div className="py-20 text-center text-slate-500">Loading user list…</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/5 bg-white/5">
                          <th className="px-6 py-4 font-semibold">User Details</th>
                          <th className="px-6 py-4 font-semibold">Assigned Role</th>
                          <th className="px-6 py-4 font-semibold">Registered</th>
                          <th className="px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users.length > 0 ? (
                          users.map((user) => (
                            <tr key={user._id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-200">{user.name}</p>
                                <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                              </td>
                              <td className="px-6 py-4">
                                <RoleBadge role={user.role} />
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                {new Date(user.createdAt).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setNewRoleValue(user.role);
                                    setRoleUpdateTarget(user);
                                  }}
                                  disabled={user._id === authUser?.id}
                                  className="px-3 py-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                  Modify Role
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user._id, user.email)}
                                  disabled={user._id === authUser?.id}
                                  className="px-3 py-1.5 rounded-lg border border-red-500/30 hover:border-red-500/60 text-red-300 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                              No matching users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* User Pagination */}
              {userMeta && userMeta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-mono">
                    Showing {(userPage - 1) * 10 + 1} - {Math.min(userPage * 10, userMeta.totalCount)} of {userMeta.totalCount} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={!userMeta.hasPrevPage}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-450 hover:text-slate-200 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all select-none"
                    >
                      ← Previous
                    </button>
                    <span className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-cyan-300 text-xs font-mono select-none">
                      Page {userPage} / {userMeta.totalPages}
                    </span>
                    <button
                      onClick={() => setUserPage((p) => Math.min(userMeta.totalPages, p + 1))}
                      disabled={!userMeta.hasNextPage}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-450 hover:text-slate-200 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all select-none"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: SECURITY LOGS
          ══════════════════════════════════════════ */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              {/* Event / Severity filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  <select
                    value={logEventFilter}
                    onChange={(e) => {
                      setLogEventFilter(e.target.value);
                      setLogPage(1);
                    }}
                    className="bg-slate-955/60 border border-white/10 rounded-xl px-4 py-2.5 text-slate-350 text-sm focus:outline-none focus:border-cyan-500/60 transition-all font-mono"
                  >
                    <option value="">Filter Event Types (All)</option>
                    {eventTypeOptions.slice(1).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={logSeverityFilter}
                    onChange={(e) => {
                      setLogSeverityFilter(e.target.value);
                      setLogPage(1);
                    }}
                    className="bg-slate-955/60 border border-white/10 rounded-xl px-4 py-2.5 text-slate-350 text-sm focus:outline-none focus:border-cyan-500/60 transition-all font-mono"
                  >
                    <option value="">Filter Severity (All)</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRefreshLogs}
                      onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 rounded bg-slate-955 border-white/10 cursor-pointer focus:ring-0"
                    />
                    Auto Refresh (8s)
                  </label>
                </div>
              </div>

              {/* Logs display */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
                {loadingLogs && securityLogs.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 font-medium">Streaming security logs…</div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    {securityLogs.length > 0 ? (
                      securityLogs.map((item, idx) => (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-white/5 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 text-xs font-bold font-mono">
                                {item.log.EVENT_TYPE}
                              </span>
                              <SeverityBadge severity={item.log.severity || "LOW"} />
                              <span className="text-xs text-slate-500 font-mono">
                                {new Date(item.log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-200">
                              User: {item.ownerName} <span className="text-slate-500 text-xs font-mono">({item.ownerEmail})</span>
                            </p>
                            {/* Log properties details */}
                            <div className="text-xs text-slate-500 font-mono space-y-0.5 mt-1 bg-black/25 p-2 rounded border border-white/5">
                              {item.log.ip && <p>IP: {item.log.ip}</p>}
                              {item.log.endpoint && <p>Route: {item.log.method} {item.log.endpoint}</p>}
                              {item.log.previousRole && (
                                <p>Role Changed: {item.log.previousRole} → {item.log.newRole}</p>
                              )}
                              {item.log.targetUserEmail && <p>Target user: {item.log.targetUserEmail}</p>}
                              {item.log.performedByEmail && <p>Performed by: {item.log.performedByEmail}</p>}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-12 text-center text-slate-500 text-sm">No security logs recorded.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Logs Pagination */}
              {logMeta && logMeta.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-mono">
                    Showing {(logPage - 1) * 20 + 1} - {Math.min(logPage * 20, logMeta.totalCount)} of {logMeta.totalCount} audit logs
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      disabled={!logMeta.hasPrevPage}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-450 hover:text-slate-200 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all select-none"
                    >
                      ← Previous
                    </button>
                    <span className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-cyan-300 text-xs font-mono select-none">
                      Page {logPage} / {logMeta.totalPages}
                    </span>
                    <button
                      onClick={() => setLogPage((p) => Math.min(logMeta.totalPages, p + 1))}
                      disabled={!logMeta.hasNextPage}
                      className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-450 hover:text-slate-200 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all select-none"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: SYSTEM SETTINGS
          ══════════════════════════════════════════ */}
          {activeTab === "settings" && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">System Settings Console</h3>
                <p className="text-xs text-slate-500">Configure core security and role-based validation constraints.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {[
                  { title: "Strict Password Complexity validation", desc: "Forces minimum 8 chars, mixed case, and specials.", active: true },
                  { title: "Multi-Factor Authentication (MFA) enforcement", desc: "Require authenticator checks for mentor & admin roles.", active: false },
                  { title: "Auto Session-Timeout Gating", desc: "Automatically signs out idle sessions after 24 hours.", active: true },
                  { title: "SIEM Audit log forwarding stream", desc: "Ship security logs directly to central logshipper logs.", active: true }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                      item.active ? "bg-cyan-500" : "bg-slate-700"
                    }`}>
                      <div className={`w-4 h-4 bg-slate-950 rounded-full transition-transform duration-200 ${
                        item.active ? "translate-x-4" : ""
                      }`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action operations */}
              <div className="pt-6 border-t border-white/5 flex gap-3 flex-wrap">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(securityLogs, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `security_logs_audit_${Date.now()}.json`;
                    a.click();
                    showToast("✓ Security logs export initiated", "success");
                  }}
                  className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm font-semibold transition-all hover:bg-white/5"
                >
                  Download Security Audit Logs (JSON)
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
