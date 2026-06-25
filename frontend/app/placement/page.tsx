"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BrainCircuit,
  Zap,
  TrendingUp,
  Award,
  Code2,
  FolderOpen,
  BadgeCheck,
  MessageSquare,
  Loader2,
  BarChart3,
  Target,
  ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type CandidateType = "fresher" | "internship_seeker" | "experienced";

type Scores = {
  resumeScore: number;
  interviewScore: number;
  technicalSkillScore: number;
  communicationScore: number;
};

type Evaluation = {
  weakTechnicalAreas: string[];
  communicationGaps: string[];
  missingIndustrySkills: string[];
};

type Roadmap = {
  technologies: string[];
  projects: string[];
  certifications: string[];
  interviewTopics: string[];
};

type Classification =
  | "Placement Ready"
  | "Needs Improvement"
  | "High Potential Candidate";

type EvaluationResult = {
  _id: string;
  candidateType: CandidateType;
  scores: Scores;
  compositeScore: number;
  evaluation: Evaluation;
  readinessClassification: Classification;
  personalizedRoadmap: Roadmap;
  timestamp: string;
};

type HistoryPoint = {
  _id: string;
  scores: Scores;
  compositeScore: number;
  readinessClassification: Classification;
  candidateType: CandidateType;
  timestamp: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000/api/placement";

const SCORE_LABELS: Record<keyof Scores, string> = {
  resumeScore: "Resume",
  interviewScore: "Interview",
  technicalSkillScore: "Technical Skills",
  communicationScore: "Communication",
};

const CLASSIFICATION_CONFIG: Record<
  Classification,
  { color: string; glow: string; ring: string; label: string; dot: string }
> = {
  "Placement Ready": {
    color: "text-emerald-400",
    glow: "shadow-emerald-500/30",
    ring: "border-emerald-500/40",
    label: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  "Needs Improvement": {
    color: "text-amber-400",
    glow: "shadow-amber-500/30",
    ring: "border-amber-500/40",
    label: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
  },
  "High Potential Candidate": {
    color: "text-violet-400",
    glow: "shadow-violet-500/30",
    ring: "border-violet-500/40",
    label: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    dot: "bg-violet-400",
  },
};

const CANDIDATE_LABELS: Record<CandidateType, string> = {
  fresher: "Fresher",
  internship_seeker: "Internship Seeker",
  experienced: "Experienced",
};

// Hard-coded demo userId — replace with your auth context value
const DEMO_USER_ID = "6659f3a1c2e4b8a5d1234abc";

// ─── SVG History Chart ────────────────────────────────────────────────────────
function HistoryChart({ history }: { history: HistoryPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 700;
  const H = 180;
  const PAD = { top: 16, right: 24, bottom: 36, left: 40 };

  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-[180px] text-slate-500 text-sm">
        Submit at least 2 evaluations to view trend graph.
      </div>
    );
  }

  const scores = history.map((h) => h.compositeScore);
  const minS = Math.min(...scores) - 5;
  const maxS = Math.max(...scores) + 5;

  const xScale = (i: number) =>
    PAD.left + (i / (history.length - 1)) * (W - PAD.left - PAD.right);
  const yScale = (v: number) =>
    H - PAD.bottom - ((v - minS) / (maxS - minS)) * (H - PAD.top - PAD.bottom);

  const pathD = history
    .map((h, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(h.compositeScore)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L ${xScale(history.length - 1)} ${H - PAD.bottom} L ${xScale(0)} ${H - PAD.bottom} Z`;

  const classColor = (c: Classification) => {
    if (c === "Placement Ready") return "#34d399";
    if (c === "High Potential Candidate") return "#a78bfa";
    return "#fbbf24";
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = yScale(tick);
        if (y < PAD.top || y > H - PAD.bottom) return null;
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">
              {tick}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="url(#lineGrad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Data points */}
      {history.map((h, i) => (
        <g key={h._id}>
          <circle
            cx={xScale(i)}
            cy={yScale(h.compositeScore)}
            r="5"
            fill={classColor(h.readinessClassification)}
            stroke="#0f172a"
            strokeWidth="2"
          />
          {/* X-axis label */}
          <text
            x={xScale(i)}
            y={H - PAD.bottom + 16}
            textAnchor="middle"
            fill="#64748b"
            fontSize="9"
          >
            {new Date(h.timestamp).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Score Slider ─────────────────────────────────────────────────────────────
function ScoreSlider({
  label,
  scoreKey,
  value,
  onChange,
}: {
  label: string;
  scoreKey: keyof Scores;
  value: number;
  onChange: (key: keyof Scores, val: number) => void;
}) {
  const color =
    value >= 75 ? "text-emerald-400" : value >= 50 ? "text-violet-400" : "text-amber-400";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(scoreKey, Number(e.target.value))}
        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

// ─── Roadmap Grid ─────────────────────────────────────────────────────────────
function RoadmapGrid({ roadmap }: { roadmap: Roadmap }) {
  const sections: {
    key: keyof Roadmap;
    icon: React.ReactNode;
    title: string;
    accent: string;
  }[] = [
    {
      key: "technologies",
      icon: <Code2 className="w-4 h-4" />,
      title: "Technologies to Master",
      accent: "border-indigo-500/30 bg-indigo-500/5",
    },
    {
      key: "projects",
      icon: <FolderOpen className="w-4 h-4" />,
      title: "Build These Projects",
      accent: "border-violet-500/30 bg-violet-500/5",
    },
    {
      key: "certifications",
      icon: <BadgeCheck className="w-4 h-4" />,
      title: "Earn Certifications",
      accent: "border-emerald-500/30 bg-emerald-500/5",
    },
    {
      key: "interviewTopics",
      icon: <MessageSquare className="w-4 h-4" />,
      title: "Interview Focus Areas",
      accent: "border-amber-500/30 bg-amber-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sections.map(({ key, icon, title, accent }) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl border p-4 ${accent}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-slate-400">{icon}</span>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {title}
            </span>
          </div>
          <ul className="space-y-2">
            {roadmap[key].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Evaluation Weakness Cards ────────────────────────────────────────────────
function EvaluationBreakdown({ evaluation }: { evaluation: Evaluation }) {
  const sections = [
    {
      title: "Weak Technical Areas",
      items: evaluation.weakTechnicalAreas,
      color: "text-red-400",
      bg: "bg-red-500/5 border-red-500/20",
    },
    {
      title: "Communication Gaps",
      items: evaluation.communicationGaps,
      color: "text-amber-400",
      bg: "bg-amber-500/5 border-amber-500/20",
    },
    {
      title: "Missing Industry Skills",
      items: evaluation.missingIndustrySkills,
      color: "text-orange-400",
      bg: "bg-orange-500/5 border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {sections.map(({ title, items, color, bg }) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-xl border p-4 ${bg}`}
        >
          <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${color}`}>{title}</p>
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-1.5">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.replace("text-", "bg-")}`} />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlacementReadinessPage() {
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

  const [candidateType, setCandidateType] = useState<CandidateType>("fresher");
  const [scores, setScores] = useState<Scores>({
    resumeScore: 60,
    interviewScore: 55,
    technicalSkillScore: 65,
    communicationScore: 58,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("evaluate");

  const compositeScore =
    (scores.resumeScore +
      scores.interviewScore +
      scores.technicalSkillScore +
      scores.communicationScore) /
    4;

  const handleScoreChange = (key: keyof Scores, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history/${DEMO_USER_ID}`);
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch {
      // Silent — history is supplementary
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (!isAuthorized) {
    return null;
  }

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: DEMO_USER_ID, candidateType, scores }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Evaluation failed.");
      setResult(json.data);
      setActiveTab("results");
      await fetchHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const classConfig = result
    ? CLASSIFICATION_CONFIG[result.readinessClassification]
    : null;

  return (
    <div className="relative min-h-screen bg-[#050810] text-slate-100 overflow-x-hidden">
      {/* Background grid texture */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12) 0%, transparent 70%), linear-gradient(rgba(30,41,59,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.4) 1px, transparent 1px)",
          backgroundSize: "auto, 48px 48px, 48px 48px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase text-indigo-400">
              AI Placement Engine
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Placement Readiness Dashboard
          </h1>
          <p className="mt-2 text-slate-400 text-sm max-w-xl">
            Enter your current performance metrics. The AI evaluates your readiness, identifies
            gaps, and builds a personalised action roadmap.
          </p>
        </motion.div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/70 border border-slate-800 mb-6">
            <TabsTrigger value="evaluate" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Evaluate
            </TabsTrigger>
            <TabsTrigger value="results" disabled={!result} className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Results
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ── EVALUATE TAB ───────────────────────────────────────────── */}
          <TabsContent value="evaluate">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Profile selector */}
              <Card className="bg-slate-900/60 border-slate-800 col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    Candidate Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Select
                    value={candidateType}
                    onValueChange={(v) => setCandidateType(v as CandidateType)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {Object.entries(CANDIDATE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k} className="text-slate-200">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Live composite preview */}
                  <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Composite Score
                    </p>
                    <p
                      className={`text-5xl font-black font-mono tabular-nums ${
                        compositeScore >= 75
                          ? "text-emerald-400"
                          : compositeScore >= 50
                          ? "text-violet-400"
                          : "text-amber-400"
                      }`}
                    >
                      {compositeScore.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">/ 100</p>
                  </div>

                  <div className="text-xs text-slate-500 leading-relaxed">
                    {candidateType === "fresher" &&
                      "Foundational guidance with 3–6 month roadmap."}
                    {candidateType === "internship_seeker" &&
                      "Execution timelines and open-source strategy."}
                    {candidateType === "experienced" &&
                      "Architecture, leadership, and senior-track positioning."}
                  </div>
                </CardContent>
              </Card>

              {/* Score sliders */}
              <Card className="bg-slate-900/60 border-slate-800 col-span-1 md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    Performance Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(Object.keys(SCORE_LABELS) as (keyof Scores)[]).map((key) => (
                    <ScoreSlider
                      key={key}
                      label={SCORE_LABELS[key]}
                      scoreKey={key}
                      value={scores[key]}
                      onChange={handleScoreChange}
                    />
                  ))}

                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Evaluating with AI…
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Run Placement Evaluation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── RESULTS TAB ────────────────────────────────────────────── */}
          <TabsContent value="results">
            <AnimatePresence mode="wait">
              {result && classConfig && (
                <motion.div
                  key={result._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {/* Classification badge hero */}
                  <div
                    className={`relative rounded-2xl border ${classConfig.ring} bg-slate-900/80 shadow-xl ${classConfig.glow} p-6 flex flex-col sm:flex-row items-center gap-6`}
                  >
                    {/* Glow pulse */}
                    <div
                      className={`absolute -top-px left-1/2 -translate-x-1/2 h-px w-40 ${classConfig.dot.replace("bg-", "bg-gradient-to-r from-transparent via-")} to-transparent`}
                    />

                    <div className="text-center sm:text-left flex-1">
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                        Readiness Classification
                      </p>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-lg font-bold ${classConfig.label}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${classConfig.dot}`} />
                        {result.readinessClassification}
                      </span>
                      <p className="mt-2 text-slate-400 text-sm">
                        {CANDIDATE_LABELS[result.candidateType]} ·{" "}
                        {new Date(result.timestamp).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Score ring */}
                    <div className="flex-shrink-0 text-center">
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">
                        Composite
                      </p>
                      <p className={`text-6xl font-black font-mono ${classConfig.color}`}>
                        {result.compositeScore}
                      </p>
                      <p className="text-xs text-slate-500">/ 100</p>
                    </div>

                    {/* Per-score pills */}
                    <div className="flex flex-wrap gap-2 sm:flex-col">
                      {(Object.entries(result.scores) as [keyof Scores, number][]).map(
                        ([key, val]) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-1.5"
                          >
                            <span className="text-xs text-slate-400 w-24">
                              {SCORE_LABELS[key]}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-200">
                              {val}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Evaluation breakdown */}
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Gap Analysis
                    </h2>
                    <EvaluationBreakdown evaluation={result.evaluation} />
                  </div>

                  {/* Roadmap */}
                  <div>
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Personalised Roadmap
                    </h2>
                    <RoadmapGrid roadmap={result.personalizedRoadmap} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ── HISTORY TAB ────────────────────────────────────────────── */}
          <TabsContent value="history">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Composite Score Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HistoryChart history={history} />
                  {/* Legend */}
                  <div className="flex gap-4 mt-3 flex-wrap">
                    {(
                      Object.entries(CLASSIFICATION_CONFIG) as [
                        Classification,
                        (typeof CLASSIFICATION_CONFIG)[Classification]
                      ][]
                    ).map(([cls, cfg]) => (
                      <div key={cls} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        {cls}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* History table */}
              {history.length > 0 && (
                <Card className="bg-slate-900/60 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-slate-300">
                      Submission Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800">
                            {["Date", "Type", "Resume", "Interview", "Technical", "Comms", "Composite", "Status"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {[...history].reverse().map((row) => {
                            const cfg = CLASSIFICATION_CONFIG[row.readinessClassification];
                            return (
                              <tr
                                key={row._id}
                                className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">
                                  {new Date(row.timestamp).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "2-digit",
                                  })}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300 capitalize">
                                  {CANDIDATE_LABELS[row.candidateType]}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300 font-mono">
                                  {row.scores.resumeScore}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300 font-mono">
                                  {row.scores.interviewScore}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300 font-mono">
                                  {row.scores.technicalSkillScore}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300 font-mono">
                                  {row.scores.communicationScore}
                                </td>
                                <td className={`py-2.5 pr-4 font-mono font-bold ${cfg.color}`}>
                                  {row.compositeScore}
                                </td>
                                <td className="py-2.5">
                                  <Badge
                                    className={`text-xs border ${cfg.label} font-medium`}
                                  >
                                    {row.readinessClassification}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {history.length === 0 && (
                <div className="text-center py-16 text-slate-500 text-sm">
                  No evaluation history yet. Run your first evaluation to start tracking.
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
