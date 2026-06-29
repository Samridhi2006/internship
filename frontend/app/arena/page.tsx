"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// ─── Type Systems ─────────────────────────────────────────────────────────────

type Category = "Technical" | "Domain" | "Aptitude" | "HR";
type Difficulty = "Novice" | "Adept" | "Elite" | "Apex";

interface Peer {
  userId: string;
  displayName: string;
  avatarSeed: string;
  xp: number;
  rankName: string;
  position: number;
  positionDelta: number;
  currentStreak: number;
  wins: number;
  losses: number;
  winRate: number;
  badgeCount: number;
  isUser?: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  tier: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

interface TestCase {
  input: string;
  output: string;
  hidden?: boolean;
  explanation?: string;
}

interface Challenge {
  _id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  xpValue: number;
  problemStatement: string;
  inputFormat?: string;
  outputFormat?: string;
  boilerplate?: string;
  constraints?: string[];
  testCases?: TestCase[];
  mcqOptions?: string[];
  correctAnswerIndex?: number;
  behavioralPrompt?: string;
}

interface StreakHistoryDay {
  date: string;
  completed: boolean;
  xpEarned: number;
}

interface HUDState {
  xp: number;
  rankName: string;
  nextRank: string | null;
  xpToNext: number;
  progress: number;
  currentStreak: number;
  longestStreak: number;
  streakHistory: StreakHistoryDay[];
  wins: number;
  losses: number;
  winRate: number;
  globalPosition: number;
  positionDelta: number;
  badgeVault: Badge[];
  completedChallengeIds: string[];
  displayName?: string;
}

interface TerminalLine {
  type: "cmd" | "info" | "ok" | "fail" | "warn" | "error";
  text: string;
}

// ─── API Configuration ────────────────────────────────────────────────────────

const API_BASE = "/api/arena";

const getAuthUser = () => {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("authUser");
    if (raw) return JSON.parse(raw);
  }
  return null;
};

const user = getAuthUser();
const token = user?.token;
const userId = user?.id || user?._id || "000000000000000000000000"; // Fallback to our failsafe ID
const DEMO_USER_ID = userId; // resolved dynamically via getArenaUserId()

function getArenaUserId(): string {
  return userId;
}

function getArenaDisplayName(): string {
  if (typeof window === "undefined") return "Agent";
  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.name || "Agent";
    }
  } catch {}
  return "Agent";
}

const DEMO_DISPLAY_NAME = ""; // resolved at runtime via getArenaDisplayName()

// ─── Visual Constants ─────────────────────────────────────────────────────────

const TIERS: Record<string, string> = {
  "Initiate":          "#94a3b8",
  "Code Sentinel":     "#00e5ff",
  "Logic Warden":      "#22d3ee",
  "Cyber Master":      "#a855f7",
  "Arena Grandmaster": "#ff3cac",
};

const CATEGORY_COLORS: Record<Category, string> = {
  Technical: "#00e5ff",
  Domain: "#a855f7",
  Aptitude: "#ff3cac",
  HR: "#f472b6",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlowGrid() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
  );
}

function NeonFire({ size = 20 }: { size?: number }) {
  return (
    <motion.span
      className="inline-block"
      animate={{ scale: [1, 1.25, 1], rotate: [-4, 4, -4] }}
      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
      style={{ display: "inline-block", fontSize: size }}
    >
      🔥
    </motion.span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const color = TIERS[tier] ?? "#94a3b8";
  return (
    <motion.span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
      style={{ borderColor: `${color}44`, color, background: `${color}11`, boxShadow: `0 0 8px ${color}22` }}
      animate={{ boxShadow: [`0 0 4px ${color}11`, `0 0 10px ${color}33`, `0 0 4px ${color}11`] }}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      ◆ {tier}
    </motion.span>
  );
}

// ─── Header HUD Panel ─────────────────────────────────────────────────────────

function HUDPanel({ hud, loading }: { hud: HUDState | null; loading: boolean }) {
  if (loading || !hud) {
    return (
      <div className="relative backdrop-blur-md bg-slate-900/40 border border-cyan-500/40 rounded-lg p-5 shadow-[0_0_15px_rgba(6,182,212,0.15)] mb-6 flex items-center justify-center min-h-[96px]">
        <div className="absolute -top-3 left-6 bg-[#02060d] px-3 border border-cyan-400 text-cyan-400 text-xs font-bold uppercase tracking-widest rounded">
          Live System Telemetry
        </div>
        <span className="text-xs font-mono text-slate-500 animate-pulse">Connecting to telemetry satellite...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 w-full mb-6"
    >
      <div className="relative backdrop-blur-md bg-slate-900/40 border border-cyan-500/40 rounded-lg p-5 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <div className="absolute -top-3 left-6 bg-[#02060d] px-3 border border-cyan-400 text-cyan-400 text-xs font-bold uppercase tracking-widest rounded">
          Live System Telemetry
        </div>
        
        <div className="flex flex-wrap items-center justify-between mt-2 gap-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wide bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Peer Challenge Arena
            </h1>
            <p className="text-xs text-slate-400 mt-1">Automated compiler runtime grading & real-time gamified ranking history.</p>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <span className="block text-2xl font-black text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
                {hud.currentStreak} Days
              </span>
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Streak</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-purple-400 drop-shadow-[0_0_6px_rgba(192,132,252,0.5)]">
                {hud.xp.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total XP</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
                #{hud.globalPosition}
              </span>
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Global Standing</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
                {hud.winRate}%
              </span>
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">W/L Ratio</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SVG Badges ───────────────────────────────────────────────────────────────

function BadgeIcon({ icon, size = 24 }: { icon: string; size?: number }) {
  const icons: Record<string, string> = {
    sword: "⚔️",
    flame: "🔥",
    shield: "🛡️",
    blueprint: "📐",
    target: "🎯",
    star: "⭐",
    crown: "👑",
    trophy: "🏆",
    gem: "💎",
  };
  return <span style={{ fontSize: size }}>{icons[icon] || icon}</span>;
}

// ─── Terminal Sandbox IDE ─────────────────────────────────────────────────────

function WorkspaceTerminal({ lines, running }: { lines: TerminalLine[]; running: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, running]);

  return (
    <div
      ref={containerRef}
      className="h-44 bg-black/90 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-y-auto space-y-1.5 scrollbar-thin"
    >
      {lines.map((line, idx) => {
        let color = "text-slate-400";
        if (line.type === "cmd") color = "text-cyan-400 font-bold";
        if (line.type === "ok") color = "text-emerald-400 font-semibold";
        if (line.type === "fail" || line.type === "error") color = "text-red-400 font-semibold";
        if (line.type === "warn") color = "text-amber-400";
        if (line.type === "info") color = "text-slate-550";

        return (
          <div key={idx} className={`${color} leading-relaxed whitespace-pre-wrap`}>
            {line.type === "cmd" ? "" : "  "}{line.text}
          </div>
        );
      })}
      {running && (
        <div className="text-cyan-400 animate-pulse flex items-center gap-2">
          <span>⚙️ Running sandbox compiler...</span>
        </div>
      )}
    </div>
  );
}

// ─── Challenge Workspace Modal ────────────────────────────────────────────────

function ChallengeWorkspace({
  challenge,
  onClose,
  onSuccessSubmit,
}: {
  challenge: Challenge;
  onClose: () => void;
  onSuccessSubmit: (xpEarned: number, unlockedBadges: Badge[]) => void;
}) {
  const [selectedMcq, setSelectedMcq] = useState<number | null>(null);
  const [codeSource, setCodeSource] = useState(challenge.boilerplate || "");
  const [starAnswer, setStarAnswer] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setErrorMsg("");
    setTerminalLines([
      { type: "cmd", text: "$ sandbox run --env=node ./solution.js" },
      { type: "info", text: "Initializing dynamic compiler runtime..." },
    ]);

    try {
      const res = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge._id,
          userId: getArenaUserId(),
          submissionType: "code",
          payload: { source: codeSource, language: "javascript" },
          dryRun: true
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Internal compilation error.");

      if (data.terminalTrace) {
        setTerminalLines(data.terminalTrace);
      } else {
        setTerminalLines(prev => [...prev, { type: "ok", text: "Sandbox compilation successful." }]);
      }
    } catch (err: any) {
      setTerminalLines(prev => [...prev, { type: "error", text: err.message }]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");

    let payload: any = {};
    let submissionType: "code" | "mcq" | "star" = "code";

    if (challenge.category === "Aptitude") {
      submissionType = "mcq";
      payload = { selectedIndex: selectedMcq };
    } else if (challenge.category === "HR") {
      submissionType = "star";
      payload = { responseText: starAnswer };
    } else {
      submissionType = "code";
      payload = { source: codeSource, language: "javascript" };
    }

    try {
      const res = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge._id,
          userId: getArenaUserId(),
          displayName: DEMO_DISPLAY_NAME,
          submissionType,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission rejected.");

      if (data.terminalTrace) {
        setTerminalLines(data.terminalTrace);
      }

      if (!data.isCorrect) {
        throw new Error("Verification failed. Please review execution results.");
      }

      onSuccessSubmit(data.xpAwarded, data.newlyUnlockedBadges || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = starAnswer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        className="w-full max-w-4xl h-[85vh] rounded-xl border border-cyan-500/40 overflow-hidden flex flex-col backdrop-blur-md bg-slate-900/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div>
            <span className="text-[9px] font-mono text-cyan-400/60 tracking-widest uppercase">◈ Workspace Console</span>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {challenge.title}
              <span className="text-xs font-mono font-normal text-slate-500">({challenge.difficulty})</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-lg font-mono">✕</button>
        </div>

        {/* Content Body split */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-800">
          {/* Left: Problem statement */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/20">
            <div>
              <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Problem Context</h4>
              <p className="text-slate-350 text-xs leading-relaxed whitespace-pre-wrap">{challenge.problemStatement}</p>
            </div>

            {challenge.constraints && challenge.constraints.length > 0 && (
              <div>
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Constraints</h4>
                <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                  {challenge.constraints.map((c, idx) => <li key={idx}>{c}</li>)}
                </ul>
              </div>
            )}

            {challenge.behavioralPrompt && (
              <div className="bg-purple-950/15 rounded-xl p-4 border border-purple-500/10">
                <h4 className="text-xs font-bold text-purple-400 mb-1">💡 Behavioral Focus</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{challenge.behavioralPrompt}</p>
              </div>
            )}
          </div>

          {/* Right: Input field ide */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-4 bg-slate-950/30">
            {/* Aptitude MCQ Selector */}
            {challenge.category === "Aptitude" && challenge.mcqOptions && (
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <h4 className="text-xs font-mono text-slate-450">Select the correct option:</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {challenge.mcqOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedMcq(idx)}
                      className={`w-full p-3.5 rounded-xl text-left text-sm font-mono border transition-all ${
                        selectedMcq === idx
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                          : "border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <span className="font-bold mr-2 text-cyan-500">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* HR STAR response text zone */}
            {challenge.category === "HR" && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-mono text-slate-450">STAR Response:</h4>
                  <span className="text-[10px] font-mono text-slate-500">{wordCount} words (Recommend: 50+)</span>
                </div>
                <textarea
                  value={starAnswer}
                  onChange={(e) => setStarAnswer(e.target.value)}
                  placeholder="Describe the Situation, the Task you faced, the Actions you performed, and the measurable Result..."
                  className="flex-1 bg-black/40 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-350 outline-none focus:border-cyan-500/40 transition-colors resize-none"
                />
              </div>
            )}

            {/* Technical coding sandbox IDE */}
            {(challenge.category === "Technical" || challenge.category === "Domain") && (
              <div className="flex-1 flex flex-col space-y-3 min-h-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono text-slate-450">solution.js</span>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/40"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/40"></span>
                  </div>
                </div>
                <textarea
                  value={codeSource}
                  onChange={(e) => setCodeSource(e.target.value)}
                  className="flex-1 bg-black/40 border border-slate-800 rounded-xl p-4 text-sm font-mono text-cyan-300 outline-none focus:border-cyan-500/40 transition-colors resize-none scrollbar-thin"
                />
                <WorkspaceTerminal lines={terminalLines} running={isRunning} />
              </div>
            )}

            {/* Controller Action Row */}
            <div className="shrink-0 pt-2 space-y-2">
              {errorMsg && (
                <div className="text-xs text-red-400 bg-red-400/10 border border-red-500/20 rounded-lg p-2.5 font-mono">
                  ⚠ Error: {errorMsg}
                </div>
              )}
              <div className="flex gap-3">
                {(challenge.category === "Technical" || challenge.category === "Domain") && (
                  <button
                    disabled={isRunning || isSubmitting}
                    onClick={handleRunCode}
                    className="flex-1 py-2.5 rounded border border-cyan-400/30 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-400 hover:bg-cyan-400/10 transition-colors disabled:opacity-40"
                  >
                    ▷ Run Code
                  </button>
                )}
                <button
                  disabled={
                    isSubmitting || isRunning ||
                    (challenge.category === "Aptitude" && selectedMcq === null) ||
                    (challenge.category === "HR" && wordCount < 10)
                  }
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider text-black hover:scale-[1.01] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(90deg, #00e5ff, #a855f7)",
                    boxShadow: "0 0 20px rgba(0,229,255,0.2)",
                  }}
                >
                  {isSubmitting ? "🤖 Evaluating..." : "⧉ Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Challenge Card ──────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  isCompleted,
  onEnter,
}: {
  challenge: Challenge;
  isCompleted: boolean;
  onEnter: () => void;
}) {
  const [hover, setHover] = useState(false);
  const color = CATEGORY_COLORS[challenge.category] ?? "#00e5ff";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 backdrop-blur-md bg-slate-900/40 ${
        hover 
          ? "border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
          : "border-slate-800/60"
      }`}
      onClick={onEnter}
    >
      <div className="p-5 flex items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border"
              style={{ color, borderColor: `${color}44`, background: `${color}11` }}
            >
              {challenge.difficulty}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">{challenge.category} Round</span>
            {isCompleted && (
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                ✓ Solved
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-white truncate">{challenge.title}</h4>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{challenge.problemStatement}</p>
        </div>

        <div className="text-right shrink-0">
          <span className="block text-sm font-black font-mono text-amber-400" style={{ textShadow: "0 0 6px rgba(245,158,11,0.3)" }}>
            +{challenge.xpValue} XP
          </span>
          <span className="text-[9px] font-mono text-slate-500">
            {isCompleted ? "Practice Mode" : "Potential Reward"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Peer Leaderboard ─────────────────────────────────────────────────────────

function Leaderboard({ users }: { users: Peer[] }) {
  const [search, setSearch] = useState("");

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.rankName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3.5">
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter contestants..."
          className="w-full rounded-xl px-4 py-2.5 pl-9 text-xs font-mono outline-none border focus:border-cyan-400/40 transition-colors"
          style={{
            background: "rgba(6, 182, 212, 0.02)",
            borderColor: "rgba(255,255,255,0.06)",
            color: "#e2e8f0"
          }}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-550 font-mono text-xs">⌕</span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[360px] scrollbar-none pr-1">
        {filtered.map((peer) => {
          const isUser = peer.userId === getArenaUserId();
          const color = TIERS[peer.rankName] ?? "#00e5ff";

          let rowClass = "text-slate-450 bg-transparent border-transparent";
          if (isUser) {
            rowClass = "text-purple-400 bg-purple-500/10 border-purple-500/30 font-bold";
          } else if (peer.position === 1) {
            rowClass = "text-amber-400 bg-amber-500/5 border-amber-500/20";
          } else if (peer.position === 2) {
            rowClass = "text-slate-300 bg-slate-500/5 border-slate-500/10";
          } else if (peer.position === 3) {
            rowClass = "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
          }

          return (
            <motion.div
              layout
              key={peer.userId}
              className={`flex items-center justify-between p-2.5 border rounded transition hover:bg-slate-800/30 ${rowClass}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono font-bold w-4 text-center">{peer.position}</span>
                {/* Avatar circle */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black font-mono shrink-0"
                  style={{
                    background: `${color}15`,
                    border: `1.5px solid ${color}44`,
                    color,
                    boxShadow: `0 0 10px ${color}11`
                  }}
                >
                  {peer.displayName.slice(0, 2).toUpperCase()}
                </div>
                {/* User credentials */}
                <div className="min-w-0">
                  <span className="block text-xs font-bold truncate">
                    {peer.displayName} {isUser && <span className="text-[8px] font-mono opacity-50 font-normal ml-0.5">YOU</span>}
                  </span>
                  <span className="text-[8px] font-mono uppercase opacity-55 block -mt-0.5">{peer.rankName}</span>
                </div>
              </div>

              {/* Score index */}
              <div className="text-right shrink-0 ml-2">
                <div className="text-xs font-black font-mono">{peer.xp.toLocaleString()} XP</div>
                <div className="text-[9px] font-mono opacity-50">{peer.currentStreak}d Streak</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Controller Page ─────────────────────────────────────────────────────

export default function ArenaPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  const [category, setCategory] = useState<Category>("Technical");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [hud, setHud] = useState<HUDState | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [scoreFlash, setScoreFlash] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);

  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const challengesPerPage = 8;

  const fetchChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    try {
      const res = await fetch(`${API_BASE}/challenges?category=${category}&userId=${getArenaUserId()}`);
      const data = await res.json();
      if (res.ok && data.challenges) {
        setChallenges(data.challenges);
      }
    } catch (err) {
      console.error("[fetchChallenges] Connection issue:", err);
    } finally {
      setLoadingChallenges(false);
    }
  }, [category]);

  const fetchTelemetry = useCallback(async () => {
    setLoadingTelemetry(true);
    try {
      const statusRes = await fetch(`${API_BASE}/status?userId=${getArenaUserId()}&displayName=${encodeURIComponent(getArenaDisplayName())}`);
      const statusData = await statusRes.json();
      if (statusRes.ok) {
        setHud(statusData);
      }

      const leaderboardRes = await fetch(`${API_BASE}/leaderboard`);
      const leaderboardData = await leaderboardRes.json();
      if (leaderboardRes.ok && leaderboardData.leaderboard) {
        setPeers(leaderboardData.leaderboard);
      }
    } catch (err) {
      console.error("[fetchTelemetry] Connection issue:", err);
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  const handleGenerateAIChallenge = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: [category],
          difficulty: "Adept",
          countPerCategory: 1,
          daily: false,
          weekly: false
        })
      });
      const data = await res.json();
      if (res.ok && (data.createdCount > 0 || data.count > 0 || data.success)) {
        await fetchChallenges();
        await fetchTelemetry();
      }
    } catch (err) {
      console.error("[handleGenerateAIChallenge] Failed to orchestrate generation:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
    setCurrentPage(1);
  }, [category, fetchChallenges]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  const handleSuccessSubmission = (xp: number, badges: Badge[]) => {
    setSelectedChallenge(null);
    setScoreFlash(xp);
    setUnlockedBadges(badges);

    setTimeout(() => {
      fetchTelemetry();
      fetchChallenges();
    }, 400);

    setTimeout(() => {
      setScoreFlash(null);
      setUnlockedBadges([]);
    }, 4000);
  };

  if (!isAuthorized) {
    return null;
  }

  const indexOfLastChallenge = currentPage * challengesPerPage;
  const indexOfFirstChallenge = indexOfLastChallenge - challengesPerPage;
  const currentChallenges = challenges.slice(indexOfFirstChallenge, indexOfLastChallenge);
  const totalPages = Math.ceil(challenges.length / challengesPerPage) || 1;

  return (
    <div
      className="min-h-screen relative text-slate-100 font-sans p-6 overflow-x-hidden selection:bg-cyan-500 selection:text-black"
      style={{
        background: "#02060d",
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.08) 0%, transparent 60%)'
      }}
    >
      <GlowGrid />

      {/* Floating alert flash for achievements */}
      <AnimatePresence>
        {scoreFlash !== null && (
          <motion.div
            key="score-flash-toast"
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -32, scale: 0.9 }}
            className="fixed top-8 right-8 z-50 px-6 py-3.5 rounded-2xl border font-mono font-black text-sm flex items-center gap-3 shadow-2xl"
            style={{
              background: "linear-gradient(90deg, #00e5ff, #a855f7)",
              borderColor: "rgba(0,229,255,0.4)",
              color: "#07070F",
            }}
          >
            <span>✨ CHALLENGE MASTERED!</span>
            <span className="px-2 py-0.5 rounded-md bg-black/10">+{scoreFlash} XP</span>
          </motion.div>
        )}

        {unlockedBadges.length > 0 && (
          <motion.div
            key="badge-unlock-toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            className="fixed bottom-8 right-8 z-50 p-5 rounded-2xl border border-cyan-400/20 shadow-2xl flex items-center gap-4 max-w-sm"
            style={{
              background: "linear-gradient(135deg, rgba(7,7,15,0.95), rgba(0,229,255,0.05))"
            }}
          >
            <div className="w-12 h-12 rounded-full bg-cyan-400/10 flex items-center justify-center border border-cyan-400/30 text-2xl animate-bounce">
              🏆
            </div>
            <div>
              <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">New Badge Unlocked!</p>
              <p className="text-sm font-bold text-white">{unlockedBadges[0].name}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-tight">{unlockedBadges[0].description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workspace modal coding portal */}
      <AnimatePresence>
        {selectedChallenge && (
          <ChallengeWorkspace
            key="workspace-portal"
            challenge={selectedChallenge}
            onClose={() => setSelectedChallenge(null)}
            onSuccessSubmit={handleSuccessSubmission}
          />
        )}
      </AnimatePresence>


      {/* Primary container */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 py-12">
        
        {/* Title and metadata */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-cyan-400/50 mb-1.5">
            ◈ AI Career Suite — Milestone Module 04
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-1">
            <span style={{ color: "#00e5ff", textShadow: "0 0 30px rgba(0,229,255,0.3)" }}>Peer</span>
            {" "}
            <span style={{ color: "#a855f7", textShadow: "0 0 30px rgba(168,85,247,0.3)" }}>Challenge</span>
            {" "}
            <span className="text-white">Arena</span>
          </h1>
          <p className="text-xs font-mono text-slate-505">
            Automated compiler runtime grading & real-time gamified ranking history.
          </p>
        </motion.div>

        {/* 12-Column Grid Layout */}
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: TELEMETRY & WORKSPACE (9 Cols) */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
            
            {/* Top Telemetry Panel */}
            <HUDPanel hud={hud} loading={loadingTelemetry} />

            {/* Main Challenge Window */}
            <div className="relative backdrop-blur-md bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col p-6 min-h-[500px]">
              
              {/* Category Sub-Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/60 p-2 gap-2 rounded-t-xl mb-6 flex-wrap">
                {(["Technical", "Domain", "Aptitude", "HR"] as Category[]).map((cat) => {
                  const isActive = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition ${
                        isActive
                          ? "bg-cyan-950/40 border border-cyan-400 text-cyan-400 rounded shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                          : "hover:bg-slate-800 text-slate-400 rounded"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Challenges catalog list (Full Width) */}
              <div className="space-y-4 flex-1">
                {/* List challenges */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {loadingChallenges ? (
                      [1, 2, 3].map((v) => (
                        <div key={v} className="w-full h-24 rounded-xl border border-slate-800/40 bg-slate-900/10 animate-pulse" />
                      ))
                    ) : challenges.length === 0 ? (
                      <div className="rounded-xl border border-slate-805/65 p-12 text-center bg-slate-950/40">
                        <p className="text-sm font-mono text-slate-500">No active challenges in the current category queue.</p>
                      </div>
                    ) : (
                      currentChallenges.map((c) => (
                        <ChallengeCard
                          key={c._id}
                          challenge={c}
                          isCompleted={hud?.completedChallengeIds?.includes(c._id) ?? false}
                          onEnter={() => setSelectedChallenge(c)}
                        />
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Pagination Controls */}
                {!loadingChallenges && challenges.length > challengesPerPage && (
                  <div className="flex justify-center items-center gap-4 mt-6 font-mono text-xs">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      className="px-3 py-1.5 rounded border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-all"
                    >
                      ◀ Prev
                    </button>
                    <span className="text-slate-400">
                      Page <strong className="text-cyan-400">{currentPage}</strong> of {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      className="px-3 py-1.5 rounded border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-800 transition-all"
                    >
                      Next ▶
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Badges Cabinet */}
            <div className="p-6 border border-slate-800 bg-slate-900/40 rounded-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute -top-3 left-6 bg-[#02060d] px-3 border border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-widest rounded">
                Badges Cabinet
              </div>

              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/50">◈ Vault status</span>
                <span className="text-[11px] font-mono text-slate-500">
                  {hud ? `${hud.badgeVault.filter(b => b.unlocked).length}/${hud.badgeVault.length}` : "0/9"} unlocked
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {hud?.badgeVault.map((badge) => (
                  <div
                    key={badge.id}
                    title={badge.description}
                    className={`relative rounded-xl p-4 border flex flex-col items-center justify-center gap-2 transition-all ${
                      badge.unlocked
                        ? "border-cyan-500/20 bg-cyan-500/5 shadow-md shadow-cyan-500/5"
                        : "border-white/5 bg-white/[0.01] opacity-50 filter saturate-50"
                    }`}
                  >
                    <BadgeIcon icon={badge.icon} size={28} />
                    <div className="text-center">
                      <span className="block text-xs font-bold text-white leading-tight">{badge.name}</span>
                      <span className="text-[9px] font-mono text-slate-500">{badge.tier} Class</span>
                    </div>

                    {!badge.unlocked && badge.progress > 0 && (
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${badge.progress * 100}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: IDENTITY & LEADERBOARD (3 Cols) */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            
            {/* Identity Box */}
            <div className="relative backdrop-blur-md bg-slate-900/40 border border-slate-800 rounded-lg p-5">
              <div className="text-xs text-slate-505 font-bold uppercase tracking-wider">Identity</div>
              <div className="text-lg font-bold text-white tracking-wide mt-0.5">
                {hud?.displayName || getArenaDisplayName()}
              </div>
              <div className="text-[10px] font-mono text-cyan-500/70 mt-1">Biometric line patterns verified</div>
            </div>

            {/* Live Standings Leaderboard */}
            <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1">
              <div className="p-4 bg-slate-955/60 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Leaderboard</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                  {loadingTelemetry ? "Loading..." : `${peers.filter(p => !p.isUser).length + 1}/${peers.length} Active`}
                </span>
              </div>

              <div className="p-3">
                {loadingTelemetry ? (
                  <div className="w-full h-48 flex items-center justify-center">
                    <span className="text-xs font-mono text-slate-500">Gathering global ranking metrics...</span>
                  </div>
                ) : (
                  <Leaderboard users={peers} />
                )}
              </div>
            </div>

            {/* Arena Rules Panel */}
            <div className="backdrop-blur-md bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="text-xs text-slate-505 font-bold uppercase tracking-wider">◈ Arena Rules</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose rounds strategically based on target companies. Accurate, fast compilations or deeply articulated STAR responses grant exponential XP multiplier adjustments based on question difficulty tiers.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
