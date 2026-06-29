"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Target,
  ChevronRight,
  UploadCloud,
  FileText,
  AlertCircle,
  Clock,
  ShieldAlert
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
  interviewMetrics?: {
    sessionCount: number;
    avgTechnicalAccuracy: number;
    avgCommunicationClarity: number;
    avgRoleRelevance: number;
  };
  resumeEntities?: {
    technologies: string[];
    projects: string[];
    missingSkills: string[];
  };
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
const API_BASE = "/api/readiness";

const SCORE_LABELS: Record<keyof Scores, string> = {
  resumeScore: "Resume Score",
  interviewScore: "Interview Analytics",
  technicalSkillScore: "Skill Assessments",
  communicationScore: "Communication Clarity",
};

const CLASSIFICATION_CONFIG: Record<
  Classification,
  { color: string; glow: string; ring: string; label: string; dot: string; bg: string }
> = {
  "Placement Ready": {
    color: "text-emerald-400",
    glow: "shadow-emerald-500/30",
    ring: "border-emerald-500/40",
    label: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
    bg: "bg-emerald-950/20"
  },
  "Needs Improvement": {
    color: "text-amber-400",
    glow: "shadow-amber-500/30",
    ring: "border-amber-500/40",
    label: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    dot: "bg-amber-400",
    bg: "bg-amber-950/20"
  },
  "High Potential Candidate": {
    color: "text-cyan-400",
    glow: "shadow-cyan-500/30",
    ring: "border-cyan-500/40",
    label: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    dot: "bg-cyan-400",
    bg: "bg-cyan-950/20"
  },
};

const CANDIDATE_LABELS: Record<CandidateType, string> = {
  fresher: "Fresher",
  internship_seeker: "Internship Seeker",
  experienced: "Experienced Professional",
};

// ─── Standard Auth Helpers ────────────────────────────────────────────────────
const getAuthUser = () => {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem("authUser");
    if (raw) return JSON.parse(raw);
  }
  return null;
};

// ─── SVG History Line Chart ──────────────────────────────────────────────────
function HistoryChart({ history }: { history: HistoryPoint[] }) {
  const W = 700;
  const H = 200;
  const PAD = { top: 20, right: 30, bottom: 40, left: 50 };

  if (history.length < 2) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm font-mono border border-slate-800/40 rounded-lg bg-slate-950/20">
        Requires at least 2 historical runs to graph trend timeline.
      </div>
    );
  }

  // Sort chronological (oldest first for line graph)
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const minVal = 0;
  const maxVal = 100;

  const getX = (i: number) => PAD.left + (i / (sorted.length - 1)) * (W - PAD.left - PAD.right);
  const getY = (val: number) => H - PAD.bottom - ((val - minVal) / (maxVal - minVal)) * (H - PAD.top - PAD.bottom);

  // Build SVG Path
  let d = "";
  sorted.forEach((p, i) => {
    const x = getX(i);
    const y = getY(p.compositeScore);
    if (i === 0) d += `M ${x} ${y}`;
    else d += ` L ${x} ${y}`;
  });

  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px] h-auto select-none">
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map((grid) => {
          const y = getY(grid);
          return (
            <g key={grid} className="opacity-20">
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#475569" strokeDasharray="3,3" strokeWidth={1} />
              <text x={PAD.left - 10} y={y + 4} fill="#94a3b8" fontSize={10} textAnchor="end" className="font-mono">
                {grid}%
              </text>
            </g>
          );
        })}

        {/* X Axis labels */}
        {sorted.map((p, i) => {
          const x = getX(i);
          const date = new Date(p.timestamp).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          return (
            <text
              key={p._id || i}
              x={x}
              y={H - 12}
              fill="#64748b"
              fontSize={9}
              textAnchor="middle"
              className="font-mono opacity-80"
              transform={`rotate(-15, ${x}, ${H - 12})`}
            >
              {date}
            </text>
          );
        })}

        {/* Line Path */}
        <path d={d} fill="none" stroke="url(#line-glow)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="line-glow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Interactive Dots */}
        {sorted.map((p, i) => {
          const x = getX(i);
          const y = getY(p.compositeScore);
          return (
            <g key={p._id || i} className="group cursor-pointer">
              <circle cx={x} cy={y} r={6} fill="#020617" stroke="#06b6d4" strokeWidth={2.5} className="transition-all duration-200 group-hover:r-8" />
              <circle cx={x} cy={y} r={2} fill="#22d3ee" />
              {/* Tooltip on hover */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <rect x={x - 30} y={y - 32} width={60} height={20} rx={4} fill="#0f172a" stroke="#334155" strokeWidth={1} />
                <text x={x} y={y - 19} fill="#fff" fontSize={9} fontWeight="bold" textAnchor="middle" className="font-mono">
                  Score: {p.compositeScore}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PlacementReadinessEngine() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session & Authentication
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>("");
  const [userId, setUserId] = useState<string>("000000000000000000000000");

  // Input states
  const [candidateType, setCandidateType] = useState<CandidateType>("fresher");
  const [resumeText, setResumeText] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Skill Assessment sliders (0-100)
  const [skillTechnical, setSkillTechnical] = useState<number>(65);
  const [skillDomain, setSkillDomain] = useState<number>(60);
  const [skillAptitude, setSkillAptitude] = useState<number>(70);
  const [skillHR, setSkillHR] = useState<number>(65);
  const [skillsAutoDetected, setSkillsAutoDetected] = useState<boolean>(false);

  // Extracted entities preview
  const [extractedTechs, setExtractedTechs] = useState<string[]>([]);
  const [extractedProjects, setExtractedProjects] = useState<string[]>([]);
  const [resumeScore, setResumeScore] = useState<number>(0);

  // Result state
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authUser = getAuthUser();
    if (!authUser) {
      router.push("/");
      return;
    }
    setUser(authUser);
    setToken(authUser.token || "");
    const uid = authUser.id || authUser._id || "000000000000000000000000";
    setUserId(uid);

    // Load initial aggregates and history
    fetchHistory(uid, authUser.token || "");
  }, [router]);

  const fetchHistory = async (uid: string, tokenVal: string) => {
    try {
      const res = await fetch(`${API_BASE}/history/${uid}`, {
        headers: { Authorization: `Bearer ${tokenVal}` },
      });
      const payload = await res.json();
      if (res.ok && payload.success) {
        setHistory(payload.data);
      }
    } catch (err) {
      console.error("Failed to load evaluation history:", err);
    }
  };

  // ─── File Drag & Drop Handlers ──────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setParseError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processUploadedFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "text/plain" &&
      !file.name.toLowerCase().endsWith(".txt")
    ) {
      setParseError("Invalid format. Please upload a PDF or plain text (.txt) file.");
      return;
    }

    setIsParsing(true);
    setParseError(null);
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        // Real PDF binary upload to server endpoint
        const formData = new FormData();
        formData.append("resume", file);
        formData.append("userId", userId);

        const res = await fetch(`${API_BASE}/resume/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const payload = await res.json();
        if (res.ok && payload.success) {
          const data = payload.data;
          setResumeText(data.extractedText || "");
          setExtractedTechs(data.technologies || []);
          setExtractedProjects(data.projects || []);
          setResumeScore(data.resumeScore || 0);
          // Auto-populate skill sliders from resume analysis
          if (data.skillScores) {
            setSkillTechnical(data.skillScores.technical ?? 65);
            setSkillDomain(data.skillScores.domain ?? 60);
            setSkillAptitude(data.skillScores.aptitude ?? 70);
            setSkillHR(data.skillScores.hr ?? 65);
            setSkillsAutoDetected(true);
          }
        } else {
          setParseError(payload.message || "Failed to parse PDF resume.");
        }
      } else {
        // Read text file locally
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = (event.target?.result as string) || "";
          setResumeText(text);
          // Call resume text parser endpoint
          const res = await fetch(`${API_BASE}/resume`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ resumeText: text, userId }),
          });
          const payload = await res.json();
          if (res.ok && payload.success) {
            const data = payload.data;
            setExtractedTechs(data.technologies || []);
            setExtractedProjects(data.projects || []);
            setResumeScore(data.resumeScore || 0);
            // Auto-populate skill sliders from resume analysis
            if (data.skillScores) {
              setSkillTechnical(data.skillScores.technical ?? 65);
              setSkillDomain(data.skillScores.domain ?? 60);
              setSkillAptitude(data.skillScores.aptitude ?? 70);
              setSkillHR(data.skillScores.hr ?? 65);
              setSkillsAutoDetected(true);
            }
          } else {
            setParseError(payload.message || "Failed to parse resume text.");
          }
        };
        reader.readAsText(file);
      }
    } catch (err) {
      setParseError("Error communicating with resume parser server.");
    } finally {
      setIsParsing(false);
    }
  };

  // ─── Parse Resume Action (Manual submission) ──────────────────────────────
  const handleParseResume = async () => {
    if (!resumeText.trim() || resumeText.trim().length < 20) {
      setParseError("Please type, paste, or upload resume text first (min 20 characters).");
      return;
    }

    setIsParsing(true);
    setParseError(null);
    try {
      const res = await fetch(`${API_BASE}/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeText, userId }),
      });

      const payload = await res.json();
      if (res.ok && payload.success) {
        const data = payload.data;
        setExtractedTechs(data.technologies || []);
        setExtractedProjects(data.projects || []);
        setResumeScore(data.resumeScore || 0);
        // Auto-populate skill sliders from resume analysis
        if (data.skillScores) {
          setSkillTechnical(data.skillScores.technical ?? 65);
          setSkillDomain(data.skillScores.domain ?? 60);
          setSkillAptitude(data.skillScores.aptitude ?? 70);
          setSkillHR(data.skillScores.hr ?? 65);
          setSkillsAutoDetected(true);
        }
      } else {
        setParseError(payload.message || "Failed to extract entities from resume.");
      }
    } catch (err) {
      setParseError("Network error connecting to resume parser.");
    } finally {
      setIsParsing(false);
    }
  };

  // ─── Evaluate Readiness Action ──────────────────────────────────────────────
  const handleEvaluate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          candidateType,
          resumeText,
          skillScores: {
            technical: skillTechnical,
            domain: skillDomain,
            aptitude: skillAptitude,
            hr: skillHR,
          },
        }),
      });

      const payload = await res.json();
      if (res.ok && payload.success) {
        setResult(payload.data);
        // Refresh history graph
        fetchHistory(userId, token);
      } else {
        setError(payload.message || "Readiness calculation failed.");
      }
    } catch (err) {
      setError("Network timeout communicating with evaluation nodes.");
    } finally {
      setIsLoading(false);
    }
  };

  const glassStyle = {
    backdropFilter: "blur(20px)",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  };

  const config = result ? CLASSIFICATION_CONFIG[result.readinessClassification] : null;

  return (
    <div className="min-h-screen bg-[#020205] text-slate-100 flex relative overflow-hidden select-none">
      
      {/* ─── PERSISTENT BACKGROUND IMAGE OVERLAY ─── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/image_c13234.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: 0.18,
        }}
      />

      {/* ─── SIGNATURE GRADIENT OVERLAY ─── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "linear-gradient(160deg, #030718ee 0%, #060d2ecc 40%, #0a0a35dd 100%)",
        }}
      />

      {/* ─── SCIFI SCANLINE OVERLAY ─── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* ─── GLOW DECORS ─── */}
      <div className="absolute top-10 right-1/4 w-[500px] h-[500px] bg-cyan-950/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[500px] bg-indigo-950/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* ─── MAIN PORTAL WRAPPER ─── */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 relative z-10 flex flex-col min-h-screen">
        
        {/* Page Title Section */}
        <div className="flex items-center gap-3 mb-8 border-b border-slate-800/40 pb-4">
          <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-white">Placement Readiness Dashboard</h1>
            <p className="text-[10px] text-cyan-400/70 font-mono">INTEGRATED MULTI-MODAL EVALUATOR v2.0</p>
          </div>
        </div>

        {/* CORE WORKSPACE GRID */}
        <div className="grid grid-span-12 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: TELEMETRY INPUTS CONTROL SHEET (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            <Card style={glassStyle} className="shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Target className="w-4 h-4" /> 1. Configure Clearance Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase block mb-2">Candidate Tracking Track</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(CANDIDATE_LABELS) as CandidateType[]).map((track) => (
                      <button
                        key={track}
                        onClick={() => setCandidateType(track)}
                        className={`py-2 px-3 text-center rounded text-xs font-mono transition-all duration-200 border ${
                          candidateType === track
                            ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400"
                        }`}
                      >
                        {CANDIDATE_LABELS[track]}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card style={glassStyle} className="shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> 2. Resume PDF/TXT Dropzone
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Drag Drop dropzone */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-250 ${
                    isDragActive
                      ? "border-cyan-400 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "border-slate-800 bg-slate-950/20 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".txt,.pdf"
                  />
                  <UploadCloud className="w-8 h-8 text-cyan-400/70 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-mono">Drag & Drop Resume PDF/TXT or click to browse</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Files are securely parsed on Express API Nodes</p>
                </div>

                <div className="relative">
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Alternatively, paste raw resume text credentials here directly..."
                    className="w-full h-32 bg-slate-950/40 border border-slate-800 rounded p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                  {resumeText && (
                    <span className="absolute bottom-2 right-2 text-[9px] text-slate-500 font-mono">
                      {resumeText.split(/\s+/).length} words
                    </span>
                  )}
                </div>

                {parseError && (
                  <div className="p-2 border border-red-500/20 bg-red-500/5 rounded flex items-center gap-2 text-red-400 text-xs font-mono">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{parseError}</span>
                  </div>
                )}

                <Button
                  onClick={handleParseResume}
                  disabled={isParsing || !resumeText.trim()}
                  className="w-full bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 font-mono text-xs"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Processing Extraction...
                    </>
                  ) : (
                    "Extract Entities & Score Resume"
                  )}
                </Button>

                {/* Resume Entity Tags Preview */}
                {extractedTechs.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/30">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">Extracted Techs</span>
                      <div className="flex flex-wrap gap-1">
                        {extractedTechs.slice(0, 10).map((tech, idx) => (
                          <span key={idx} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] px-1.5 py-0.5 rounded font-mono">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                    {extractedProjects.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Identified Projects</span>
                        <ul className="text-[9px] font-mono text-slate-400 space-y-1 list-disc pl-4">
                           {extractedProjects.slice(0, 3).map((proj, idx) => (
                            <li key={idx} className="truncate">{proj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs font-mono bg-cyan-950/10 p-2 border border-cyan-500/15 rounded">
                      <span className="text-slate-400">Extracted Resume Strength:</span>
                      <span className="text-cyan-400 font-bold">{resumeScore}/100</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card style={glassStyle} className="shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Code2 className="w-4 h-4" /> 3. Skill Assessment
                  {skillsAutoDetected && (
                    <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 normal-case tracking-normal">
                      <BadgeCheck className="w-3 h-3" /> Auto-Detected from Resume
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-5">
                {!skillsAutoDetected && (
                  <p className="text-[10px] text-slate-500 font-mono mb-1">
                    Upload your resume above to auto-detect these scores, or adjust manually.
                  </p>
                )}
                {[
                  { label: "Technical Core", val: skillTechnical, set: setSkillTechnical },
                  { label: "Domain Awareness", val: skillDomain, set: setSkillDomain },
                  { label: "Aptitude & Logic", val: skillAptitude, set: setSkillAptitude },
                  { label: "HR & Behavioral", val: skillHR, set: setSkillHR },
                ].map((s, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">{s.label}</span>
                      <span className={`font-bold ${skillsAutoDetected ? 'text-emerald-400' : 'text-cyan-400'}`}>{s.val}%</span>
                    </div>
                    <div className="relative w-full">
                      {/* Progress bar background */}
                      <div className="w-full h-2 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${skillsAutoDetected ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-cyan-600 to-cyan-400'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${s.val}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {skillsAutoDetected && (
                  <p className="text-[10px] text-emerald-500/60 font-mono text-center pt-1">
                    Scores derived from resume keyword analysis & content depth
                  </p>
                )}
              </CardContent>
            </Card>

            <Button
              size="lg"
              onClick={handleEvaluate}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono text-sm tracking-wider uppercase py-4 shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Syncing Multi-Modal Telemetry...
                </>
              ) : (
                "Run Placement Evaluation"
              )}
            </Button>

            {error && (
              <div className="p-3 border border-red-500/20 bg-red-500/5 rounded flex items-start gap-2.5 text-red-400 text-xs font-mono">
                <ShieldAlert className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* RIGHT: ANALYTICS SHEET CANVAS & ROADMAP (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  
                  {/* Results Metric Panel */}
                  <Card style={glassStyle} className="shadow-lg relative overflow-hidden">
                    {/* Glowing highlight indicator */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${config?.color.replace("text-", "bg-")}`} />
                    <CardHeader className="pb-3 border-b border-slate-800/30">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Evaluation Results Canvas</CardTitle>
                        <Badge className={`${config?.label} border text-[10px] font-mono px-2 py-0.5 rounded`}>
                          {result.readinessClassification}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      
                      {/* Radial Progress Ring */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="72" cy="72" r="62" fill="transparent" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="8" />
                            <circle
                              cx="72"
                              cy="72"
                              r="62"
                              fill="transparent"
                              stroke="url(#progress-gradient)"
                              strokeWidth="8"
                              strokeDasharray={389.5}
                              strokeDashoffset={389.5 - (389.5 * result.compositeScore) / 100}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22d3ee" />
                                <stop offset="100%" stopColor="#6366f1" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-4xl font-extrabold text-white tracking-tighter">{result.compositeScore}</span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">Readiness</span>
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown Bars */}
                      <div className="md:col-span-7 space-y-4">
                        {(Object.keys(SCORE_LABELS) as Array<keyof Scores>).map((key, idx) => {
                          const val = result.scores[key] || 0;
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between items-center text-[11px] font-mono">
                                <span className="text-slate-400">{SCORE_LABELS[key]}</span>
                                <span className="text-white font-bold">{val}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-950 border border-slate-800/80 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${val}%` }}
                                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </CardContent>
                  </Card>

                  {/* Weak areas vs Communication Gaps Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card style={glassStyle} className="shadow-lg">
                      <CardHeader className="pb-2 border-b border-slate-800/30">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Weak Technical Areas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-1.5">
                          {result.evaluation.weakTechnicalAreas.map((area, idx) => (
                            <span key={idx} className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded font-mono">
                              {area}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card style={glassStyle} className="shadow-lg">
                      <CardHeader className="pb-2 border-b border-slate-800/30">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Communication Gaps
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap gap-1.5">
                          {result.evaluation.communicationGaps.map((gap, idx) => (
                            <span key={idx} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded font-mono">
                              {gap}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Programmatic Roadmap Cards */}
                  <Card style={glassStyle} className="shadow-lg">
                    <CardHeader className="pb-3 border-b border-slate-800/30">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Personalized Roadmap Matrix
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { title: "Target Technologies", icon: "💻", items: result.personalizedRoadmap.technologies },
                          { title: "Portfolio Projects", icon: "📁", items: result.personalizedRoadmap.projects },
                          { title: "Target Certifications", icon: "📜", items: result.personalizedRoadmap.certifications },
                          { title: "Interview Topics", icon: "🎤", items: result.personalizedRoadmap.interviewTopics },
                        ].map((sect, idx) => (
                          <div key={idx} className="bg-slate-950/30 border border-slate-800/40 rounded p-3.5 space-y-2">
                            <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                              <span>{sect.icon}</span> <span>{sect.title}</span>
                            </span>
                            <ul className="text-[10px] font-mono text-slate-400 space-y-1 list-none pl-1">
                              {sect.items.slice(0, 5).map((item, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <ChevronRight className="w-3.5 h-3.5 text-cyan-500 mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                </motion.div>
              ) : (
                <div className="h-[400px] border border-slate-800/40 rounded-xl bg-slate-950/20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <BrainCircuit className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Readiness Engine Offline</h3>
                  <p className="text-xs text-slate-600 max-w-sm mt-1 font-mono">Configure candidate parameters, drag/paste your resume text, and submit the telemetry payload to generate composite score metrics.</p>
                </div>
              )}
            </AnimatePresence>

            {/* History trend timeline */}
            <Card style={glassStyle} className="shadow-lg">
              <CardHeader className="pb-3 border-b border-slate-800/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Evaluation History & Trend Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <HistoryChart history={history} />
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

    </div>
  );
}
