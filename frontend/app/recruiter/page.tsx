'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Company = 'Google' | 'Amazon' | 'Microsoft' | 'TCS' | 'Infosys' | 'Startup';
type Difficulty = 'Easy' | 'Medium' | 'Hard';
type View = 'select' | 'chat' | 'feedback';

interface Message {
  role: 'recruiter' | 'candidate';
  content: string;
  timestamp: Date;
}

interface Evaluation {
  overallScore: number;
  meetsExpectedStandards: boolean;
  hiringDecision: string;
  feedbackParameters: {
    technicalDepth: string;
    problemSolving: string;
    communication: string;
    cultureFit: string;
  };
  detailedFeedback: string;
}

interface SessionState {
  sessionId: string;
  companyName: Company;
  jobRole: string;
  difficulty: Difficulty;
  currentQuestionIndex: number;
  totalQuestions: number;
  messages: Message[];
  isCompleted: boolean;
  evaluation: Evaluation | null;
}

const DIFF_COLORS: Record<Difficulty, string> = {
  Easy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  Hard: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const PARAM_SCORE: Record<string, number> = {
  Exceptional: 100,
  Strong: 80,
  Adequate: 60,
  'Needs Improvement': 35,
  Insufficient: 15,
};

const PARAM_COLOR: Record<string, string> = {
  Exceptional: '#10B981',
  Strong: '#3B82F6',
  Adequate: '#F59E0B',
  'Needs Improvement': '#F97316',
  Insufficient: '#EF4444',
};

// ─── SVG Illustrations ──────────────────────────────────────────────────────
function GoogleIllustration() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gg1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4285F4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4285F4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="70" r="55" fill="url(#gg1)" />
      {/* Neural net */}
      <circle cx="40" cy="70" r="5" fill="#4285F4" opacity="0.9">
        <animate attributeName="r" values="5;6.5;5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="95" cy="38" r="4" fill="#EA4335" opacity="0.9" />
      <circle cx="95" cy="70" r="4" fill="#FBBC05" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="95" cy="102" r="4" fill="#34A853" opacity="0.9" />
      <circle cx="155" cy="50" r="5" fill="#4285F4" opacity="0.9" />
      <circle cx="155" cy="90" r="5" fill="#EA4335" opacity="0.9">
        <animate attributeName="r" values="5;7;5" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Connections */}
      <line x1="44" y1="66" x2="91" y2="41" stroke="#4285F4" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1="44" y1="70" x2="91" y2="70" stroke="#FBBC05" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="44" y1="74" x2="91" y2="99" stroke="#34A853" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="2 2" />
      <line x1="99" y1="38" x2="151" y2="52" stroke="#EA4335" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="99" y1="70" x2="151" y2="52" stroke="#4285F4" strokeWidth="0.8" strokeOpacity="0.4" strokeDasharray="3 3" />
      <line x1="99" y1="70" x2="151" y2="88" stroke="#FBBC05" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="99" y1="102" x2="151" y2="88" stroke="#34A853" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Pulse travels along edge */}
      <circle r="2.5" fill="#EA4335">
        <animateMotion dur="2s" repeatCount="indefinite" path="M44,70 L99,38" />
      </circle>
      <circle r="2.5" fill="#34A853">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M99,70 L155,90" />
      </circle>
      {/* Google logo small */}
      <text x="88" y="128" fontSize="9" fill="#4285F4" fontWeight="700" opacity="0.6">G</text>
      <text x="95" y="128" fontSize="9" fill="#EA4335" fontWeight="700" opacity="0.6">o</text>
      <text x="101" y="128" fontSize="9" fill="#FBBC05" fontWeight="700" opacity="0.6">o</text>
      <text x="107" y="128" fontSize="9" fill="#34A853" fontWeight="700" opacity="0.6">g</text>
      <text x="113" y="128" fontSize="9" fill="#4285F4" fontWeight="700" opacity="0.6">l</text>
      <text x="117" y="128" fontSize="9" fill="#EA4335" fontWeight="700" opacity="0.6">e</text>
    </svg>
  );
}

function AmazonIllustration() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ag1" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FF9900" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FF9900" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="60" rx="80" ry="55" fill="url(#ag1)" />
      {/* World map silhouette (simplified) */}
      <path d="M20,50 Q40,30 65,40 Q80,35 100,45 Q120,35 145,42 Q165,30 180,50 Q175,75 155,80 Q130,90 105,82 Q80,90 55,80 Q30,75 20,50Z"
        fill="none" stroke="#FF9900" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="3 3" />
      {/* Server nodes */}
      <circle cx="45" cy="48" r="5" fill="#FF9900" opacity="0.8">
        <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="42" r="4" fill="#FF9900" opacity="0.7" />
      <circle cx="155" cy="50" r="5" fill="#FF9900" opacity="0.8">
        <animate attributeName="r" values="5;7;5" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="72" r="3.5" fill="#FF9900" opacity="0.6" />
      <circle cx="130" cy="68" r="3.5" fill="#FF9900" opacity="0.6" />
      {/* Data paths */}
      <path d="M45,48 Q72,38 100,42" fill="none" stroke="#FF9900" strokeWidth="1" strokeOpacity="0.6">
        <animate attributeName="stroke-dasharray" values="0,120;120,0" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M100,42 Q128,38 155,50" fill="none" stroke="#FF9900" strokeWidth="1" strokeOpacity="0.6">
        <animate attributeName="stroke-dasharray" values="0,100;100,0" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path d="M45,48 Q60,62 75,72" fill="none" stroke="#FF9900" strokeWidth="0.7" strokeOpacity="0.4" strokeDasharray="3 3" />
      <path d="M155,50 Q143,61 130,68" fill="none" stroke="#FF9900" strokeWidth="0.7" strokeOpacity="0.4" strokeDasharray="3 3" />
      {/* Moving package icon */}
      <rect width="8" height="7" rx="1" fill="#FF9900" opacity="0.9">
        <animateMotion dur="4s" repeatCount="indefinite" path="M45,48 Q72,38 100,42 Q128,38 155,50" />
      </rect>
      {/* Amazon smile */}
      <path d="M78,120 Q100,132 122,120" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M118,116 L122,120 L118,124" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

function MicrosoftIllustration() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mg1" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#0078D4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0078D4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="65" rx="75" ry="55" fill="url(#mg1)" />
      {/* Azure Cloud */}
      <path d="M60,55 A22,22 0 0,1 62,12 A34,34 0 0,1 125,15 A26,26 0 0,1 120,55 Z"
        fill="none" stroke="#0078D4" strokeWidth="1.2" strokeOpacity="0.8" />
      <path d="M60,55 A22,22 0 0,1 62,12 A34,34 0 0,1 125,15 A26,26 0 0,1 120,55 Z"
        fill="#0078D4" fillOpacity="0.08" />
      {/* Data lines descending */}
      <line x1="90" y1="55" x2="90" y2="80" stroke="#0078D4" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1="100" y1="55" x2="100" y2="75" stroke="#00A4EF" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* DB stack */}
      <rect x="75" y="80" width="30" height="10" rx="2" fill="none" stroke="#0078D4" strokeWidth="0.8" strokeOpacity="0.7" />
      <line x1="80" y1="85" x2="84" y2="85" stroke="#0078D4" strokeOpacity="0.7" strokeWidth="0.8" />
      <rect x="75" y="93" width="30" height="10" rx="2" fill="none" stroke="#00A4EF" strokeWidth="0.8" strokeOpacity="0.7" />
      <line x1="80" y1="98" x2="84" y2="98" stroke="#00A4EF" strokeOpacity="0.7" strokeWidth="0.8" />
      <rect x="75" y="106" width="30" height="10" rx="2" fill="none" stroke="#7FBA00" strokeWidth="0.8" strokeOpacity="0.7" />
      {/* Side nodes */}
      <rect x="25" y="62" width="24" height="18" rx="3" fill="none" stroke="#FFB900" strokeWidth="0.8" strokeOpacity="0.7" />
      <text x="37" y="74" textAnchor="middle" fontSize="7" fill="#FFB900" opacity="0.8">App</text>
      <rect x="150" y="62" width="24" height="18" rx="3" fill="none" stroke="#7FBA00" strokeWidth="0.8" strokeOpacity="0.7" />
      <text x="162" y="74" textAnchor="middle" fontSize="7" fill="#7FBA00" opacity="0.8">API</text>
      <line x1="49" y1="71" x2="75" y2="85" stroke="#FFB900" strokeWidth="0.7" strokeOpacity="0.5" strokeDasharray="3 3" />
      <line x1="150" y1="71" x2="105" y2="85" stroke="#7FBA00" strokeWidth="0.7" strokeOpacity="0.5" strokeDasharray="3 3" />
      {/* Pulse on cloud */}
      <circle cx="90" cy="30" r="3" fill="#0078D4" opacity="0.6">
        <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="90" cy="30" r="2.5" fill="#0078D4" opacity="0.9" />
    </svg>
  );
}

function TCSIllustration() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="tg1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="70" r="60" fill="url(#tg1)" />
      <circle cx="100" cy="70" r="45" fill="none" stroke="#6366F1" strokeWidth="0.7" strokeOpacity="0.4" strokeDasharray="4 4" />
      <circle cx="100" cy="70" r="28" fill="none" stroke="#818CF8" strokeWidth="0.7" strokeOpacity="0.5" />
      <circle cx="100" cy="70" r="10" fill="#6366F1" fillOpacity="0.2" stroke="#6366F1" strokeWidth="0.8" strokeOpacity="0.7" />
      {/* Axes */}
      <line x1="100" y1="22" x2="100" y2="118" stroke="#6366F1" strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="52" y1="70" x2="148" y2="70" stroke="#6366F1" strokeWidth="0.5" strokeOpacity="0.3" />
      {/* Cardinal dots */}
      <circle cx="100" cy="25" r="4" fill="#6366F1" opacity="0.9">
        <animate attributeName="r" values="4;6;4" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="115" r="4" fill="#818CF8" opacity="0.9" />
      <circle cx="55" cy="70" r="4" fill="#6366F1" opacity="0.9" />
      <circle cx="145" cy="70" r="4" fill="#818CF8" opacity="0.9">
        <animate attributeName="r" values="4;6;4" dur="2.8s" repeatCount="indefinite" />
      </circle>
      {/* Corner enterprise nodes */}
      <rect x="22" y="25" width="22" height="15" rx="2" fill="none" stroke="#6366F1" strokeOpacity="0.6" strokeWidth="0.8" />
      <text x="33" y="35" textAnchor="middle" fontSize="6" fill="#818CF8" opacity="0.8">ERP</text>
      <rect x="155" y="25" width="22" height="15" rx="2" fill="none" stroke="#6366F1" strokeOpacity="0.6" strokeWidth="0.8" />
      <text x="166" y="35" textAnchor="middle" fontSize="6" fill="#818CF8" opacity="0.8">CRM</text>
      <rect x="22" y="100" width="22" height="15" rx="2" fill="none" stroke="#6366F1" strokeOpacity="0.6" strokeWidth="0.8" />
      <text x="33" y="110" textAnchor="middle" fontSize="6" fill="#818CF8" opacity="0.8">SCM</text>
      <rect x="155" y="100" width="22" height="15" rx="2" fill="none" stroke="#6366F1" strokeOpacity="0.6" strokeWidth="0.8" />
      <text x="166" y="110" textAnchor="middle" fontSize="6" fill="#818CF8" opacity="0.8">BPO</text>
      {/* Lines to center */}
      <line x1="44" y1="32" x2="55" y2="70" stroke="#6366F1" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="3 3" />
      <line x1="155" y1="32" x2="145" y2="70" stroke="#6366F1" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="3 3" />
      <line x1="44" y1="107" x2="55" y2="70" stroke="#6366F1" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="3 3" />
      <line x1="155" y1="107" x2="145" y2="70" stroke="#6366F1" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="3 3" />
      {/* Rotating orbit orbit dot */}
      <circle r="3" fill="#A5B4FC" opacity="0.8">
        <animateMotion dur="4s" repeatCount="indefinite" path="M100,25 A45,45 0 1 1 99.9,25" />
      </circle>
    </svg>
  );
}

function InfosysIllustration() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig1" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="75" ry="55" fill="url(#ig1)" />
      {/* COBALT node boxes */}
      <rect x="30" y="28" width="38" height="26" rx="3" fill="none" stroke="#0EA5E9" strokeWidth="0.9" strokeOpacity="0.7" />
      <text x="49" y="41" textAnchor="middle" fontSize="7" fill="#38BDF8" opacity="0.9">Cloud</text>
      <text x="49" y="50" textAnchor="middle" fontSize="6" fill="#38BDF8" opacity="0.6">COBALT</text>
      <rect x="130" y="28" width="40" height="26" rx="3" fill="none" stroke="#0EA5E9" strokeWidth="0.9" strokeOpacity="0.7" />
      <text x="150" y="41" textAnchor="middle" fontSize="7" fill="#38BDF8" opacity="0.9">AI/ML</text>
      <text x="150" y="50" textAnchor="middle" fontSize="6" fill="#38BDF8" opacity="0.6">Cognitive</text>
      <rect x="30" y="85" width="38" height="26" rx="3" fill="none" stroke="#06B6D4" strokeWidth="0.9" strokeOpacity="0.7" />
      <text x="49" y="98" textAnchor="middle" fontSize="7" fill="#67E8F9" opacity="0.9">Agile</text>
      <text x="49" y="107" textAnchor="middle" fontSize="6" fill="#67E8F9" opacity="0.6">Delivery</text>
      <rect x="130" y="85" width="40" height="26" rx="3" fill="none" stroke="#06B6D4" strokeWidth="0.9" strokeOpacity="0.7" />
      <text x="150" y="98" textAnchor="middle" fontSize="7" fill="#67E8F9" opacity="0.9">IoT</text>
      <text x="150" y="107" textAnchor="middle" fontSize="6" fill="#67E8F9" opacity="0.6">Automation</text>
      {/* Center hub */}
      <circle cx="100" cy="68" r="16" fill="none" stroke="#0EA5E9" strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="100" cy="68" r="8" fill="#0EA5E9" fillOpacity="0.2" stroke="#0EA5E9" strokeOpacity="0.8" strokeWidth="0.8" />
      <text x="100" y="72" textAnchor="middle" fontSize="7" fill="#38BDF8" opacity="0.9">HUB</text>
      {/* Connectors */}
      <line x1="68" y1="38" x2="84" y2="58" stroke="#0EA5E9" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="130" y1="38" x2="116" y2="58" stroke="#0EA5E9" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="68" y1="100" x2="84" y2="78" stroke="#06B6D4" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="130" y1="100" x2="116" y2="78" stroke="#06B6D4" strokeWidth="0.7" strokeOpacity="0.5" />
      {/* Pulse on hub */}
      <circle cx="100" cy="68" r="14" fill="none" stroke="#0EA5E9" strokeOpacity="0.3">
        <animate attributeName="r" values="14;26;14" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function StartupIllustration() {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sg1" cx="60%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="70" rx="80" ry="55" fill="url(#sg1)" />
      {/* Growth chart */}
      <line x1="25" y1="118" x2="178" y2="118" stroke="#8B5CF6" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="25" y1="20" x2="25" y2="118" stroke="#8B5CF6" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* Chart line — exponential */}
      <polyline
        points="25,112 50,108 70,100 90,90 108,74 125,55 148,32 170,18"
        fill="none" stroke="url(#chartLine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="chartLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points="25,112 50,108 70,100 90,90 108,74 125,55 148,32 170,18 170,118 25,118"
        fill="#8B5CF6" fillOpacity="0.07"
      />
      {/* Key point dots */}
      <circle cx="50" cy="108" r="3" fill="#8B5CF6" opacity="0.7" />
      <circle cx="90" cy="90" r="3" fill="#A78BFA" opacity="0.7" />
      <circle cx="125" cy="55" r="3.5" fill="#C084FC" opacity="0.8" />
      <circle cx="170" cy="18" r="5" fill="#EC4899" opacity="0.9">
        <animate attributeName="r" values="5;8;5" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* dashed projection lines */}
      <line x1="50" y1="108" x2="50" y2="118" stroke="#8B5CF6" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 2" />
      <line x1="90" y1="90" x2="90" y2="118" stroke="#A78BFA" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 2" />
      <line x1="125" y1="55" x2="125" y2="118" stroke="#C084FC" strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 2" />
      {/* Rocket */}
      <text x="164" y="16" fontSize="16" textAnchor="middle">🚀</text>
      {/* Label */}
      <text x="95" y="134" textAnchor="middle" fontSize="8" fill="#A78BFA" opacity="0.7">scale-up →</text>
    </svg>
  );
}

const COMPANY_CONFIG: Record<Company, {
  gradient: string;
  glow: string;
  border: string;
  accentColor: string;
  logo: React.ReactNode;
  tagline: string;
  roles: string[];
  illustration: React.ReactNode;
}> = {
  Google: {
    gradient: 'from-[#1a2540] via-[#1a2030] to-[#1a1a30]',
    border: 'rgba(66,133,244,0.45)',
    glow: 'rgba(66,133,244,0.3)',
    accentColor: '#4285F4',
    tagline: "Organize the world's information",
    roles: ['Frontend Developer', 'Backend Developer', 'Fullstack Engineer', 'ML Engineer'],
    illustration: <GoogleIllustration />,
    logo: (
      <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  Amazon: {
    gradient: 'from-[#1f1800] via-[#1a1400] to-[#1a1200]',
    border: 'rgba(255,153,0,0.45)',
    glow: 'rgba(255,153,0,0.3)',
    accentColor: '#FF9900',
    tagline: 'Work hard. Have fun. Make history.',
    roles: ['Frontend Developer', 'Backend Developer', 'Fullstack Engineer', 'SDE II'],
    illustration: <AmazonIllustration />,
    logo: (
      <svg viewBox="0 0 24 24" className="w-9 h-9">
        <path fill="#FF9900" d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705c-.209.189-.512.201-.745.074-1.047-.872-1.234-1.276-1.814-2.106-1.734 1.769-2.962 2.297-5.209 2.297-2.66 0-4.731-1.641-4.731-4.925 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.099v-.41c0-.753.06-1.642-.383-2.294-.385-.578-1.124-.816-1.776-.816-1.206 0-2.277.618-2.54 1.897-.053.287-.262.57-.549.585l-3.064-.329c-.259-.058-.548-.266-.472-.661C5.513 1.958 8.476 1 11.165 1c1.373 0 3.167.365 4.25 1.404 1.375 1.281 1.243 2.993 1.243 4.854v4.394c0 1.32.547 1.9 1.063 2.612.18.253.219.556-.01.745l-2.567 2.786z"/>
        <path fill="#FF9900" d="M20.556 18.728c-2.99 2.211-7.327 3.388-11.059 3.388-5.23 0-9.938-1.934-13.503-5.146-.279-.252-.031-.596.307-.399 3.845 2.237 8.597 3.582 13.502 3.582 3.313 0 6.956-.686 10.307-2.108.505-.215.929.332.446.683z"/>
        <path fill="#FF9900" d="M21.779 17.281c-.381-.487-2.521-.231-3.484-.116-.293.035-.337-.219-.074-.404 1.706-1.2 4.503-.853 4.829-.452.326.406-.086 3.21-1.688 4.551-.246.208-.481.097-.37-.176.361-.898 1.168-2.916.787-3.403z"/>
      </svg>
    ),
  },
  Microsoft: {
    gradient: 'from-[#001a2c] via-[#001525] to-[#001020]',
    border: 'rgba(0,120,212,0.45)',
    glow: 'rgba(0,120,212,0.3)',
    accentColor: '#0078D4',
    tagline: 'Empower every person on the planet',
    roles: ['Frontend Developer', 'Backend Developer', 'Fullstack Engineer', 'Azure Engineer'],
    illustration: <MicrosoftIllustration />,
    logo: (
      <svg viewBox="0 0 24 24" className="w-9 h-9">
        <path fill="#F25022" d="M1 1h10v10H1z"/>
        <path fill="#00A4EF" d="M13 1h10v10H13z"/>
        <path fill="#7FBA00" d="M1 13h10v10H1z"/>
        <path fill="#FFB900" d="M13 13h10v10H13z"/>
      </svg>
    ),
  },
  TCS: {
    gradient: 'from-[#0d0d2b] via-[#0a0a22] to-[#07071a]',
    border: 'rgba(99,102,241,0.45)',
    glow: 'rgba(99,102,241,0.3)',
    accentColor: '#6366F1',
    tagline: 'Experience certainty.',
    roles: ['Frontend Developer', 'Backend Developer', 'Associate Engineer', 'Systems Analyst'],
    illustration: <TCSIllustration />,
    logo: (
      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600 font-black text-white text-sm tracking-widest">TCS</div>
    ),
  },
  Infosys: {
    gradient: 'from-[#001525] via-[#001020] to-[#00080f]',
    border: 'rgba(14,165,233,0.45)',
    glow: 'rgba(14,165,233,0.3)',
    accentColor: '#0EA5E9',
    tagline: 'Navigate your next.',
    roles: ['Frontend Developer', 'Backend Developer', 'Technology Analyst', 'Systems Engineer'],
    illustration: <InfosysIllustration />,
    logo: (
      <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-sky-600 font-black text-white text-xs tracking-wider">INFY</div>
    ),
  },
  Startup: {
    gradient: 'from-[#1a0d2e] via-[#150a24] to-[#0f051a]',
    border: 'rgba(139,92,246,0.45)',
    glow: 'rgba(139,92,246,0.3)',
    accentColor: '#8B5CF6',
    tagline: 'Move fast. Build things that matter.',
    roles: ['Fullstack Engineer', 'Frontend Developer', 'Backend Developer', 'Founding Engineer'],
    illustration: <StartupIllustration />,
    logo: (
      <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl">🚀</div>
    ),
  },
};

// ── Hero wave particles ──────────────────────────────────────────────────────
function HeroParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: 5 + (i * 3.2) % 90,
    y: 10 + (i * 7.3) % 80,
    r: 1 + (i % 4) * 0.7,
    dur: 3 + (i % 5) * 0.8,
    delay: (i % 10) * 0.3,
    color: ['#4285F4', '#EA4335', '#FF9900', '#0078D4', '#8B5CF6', '#0EA5E9', '#34A853', '#FBBC05'][i % 8],
  }));
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      {[0, 1, 2].map(w => (
        <path
          key={w}
          d={`M-10,${100 + w * 60} Q200,${60 + w * 55} 400,${110 + w * 50} T800,${90 + w * 60}`}
          fill="none"
          stroke={['#4285F4', '#8B5CF6', '#0EA5E9'][w]}
          strokeWidth="0.8"
          strokeOpacity={0.18 - w * 0.04}
          strokeDasharray={w === 1 ? '6 6' : 'none'}
        />
      ))}
      {particles.map(p => (
        <circle key={p.id} cx={`${p.x}%`} cy={`${p.y}%`} r={p.r} fill={p.color} opacity={0.25}>
          <animate attributeName="cy" values={`${p.y}%;${p.y - 8}%;${p.y}%`} dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.55;0.25" dur={`${p.dur}s`} begin={`${p.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

// ── Score Arc ────────────────────────────────────────────────────────────────
function ScoreArc({ score }: { score: number }) {
  const R = 52, circ = 2 * Math.PI * R;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <motion.circle cx="72" cy="72" r={R} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span className="text-3xl font-black" style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, type: 'spring' }}>
          {score}
        </motion.span>
        <span className="text-xs text-white/40">/100</span>
      </div>
    </div>
  );
}

function ParamBar({ label, value, delay }: { label: string; value: string; delay: number }) {
  const pct = PARAM_SCORE[value] ?? 50;
  const col = PARAM_COLOR[value] ?? '#6B7280';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-bold" style={{ color: col }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: col, boxShadow: `0 0 6px ${col}` }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

export default function RecruiterSimulatorPage() {
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

  const [view, setView] = useState<View>('select');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Medium');
  const [session, setSession] = useState<SessionState | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const API = '/api/recruiter';

  const getRecruiterUserId = useCallback(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("authUser");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.id || parsed?._id || "000000000000000000000000";
      }
    }
    return "000000000000000000000000";
  }, []);

  useEffect(() => {
    if (view === 'chat') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [session?.messages]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handleStart = useCallback(async () => {
    if (!selectedCompany || !selectedRole) return;
    setIsStarting(true); setError('');
    try {
      const currentUserId = getRecruiterUserId();
      const res = await fetch(`${API}/session/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, companyName: selectedCompany, jobRole: selectedRole, difficulty: selectedDifficulty }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSession({
        sessionId: data.sessionId, companyName: selectedCompany, jobRole: selectedRole,
        difficulty: selectedDifficulty, currentQuestionIndex: data.currentQuestionIndex,
        totalQuestions: data.totalQuestions, isCompleted: false, evaluation: null,
        messages: [{ role: 'recruiter', content: data.message, timestamp: new Date() }],
      });
      setElapsed(0); setView('chat');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally { setIsStarting(false); }
  }, [selectedCompany, selectedRole, selectedDifficulty]);

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || !session || isLoading) return;
    const answer = inputText.trim();
    setInputText(''); setIsLoading(true); setError('');
    setSession(prev => prev ? { ...prev, messages: [...prev.messages, { role: 'candidate', content: answer, timestamp: new Date() }] } : prev);
    try {
      const res = await fetch(`${API}/session/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, answer }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (data.isCompleted) {
        setSession(prev => prev ? { ...prev, currentQuestionIndex: data.currentQuestionIndex, isCompleted: true, evaluation: data.evaluation } : prev);
        setTimeout(() => setView('feedback'), 800);
      } else {
        setSession(prev => prev ? {
          ...prev, currentQuestionIndex: data.currentQuestionIndex,
          messages: [...prev.messages, { role: 'recruiter', content: data.message, timestamp: new Date() }],
        } : prev);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally { setIsLoading(false); }
  }, [inputText, session, isLoading]);

  const resetAll = () => {
    setView('select'); setSession(null); setSelectedCompany(null);
    setSelectedRole(''); setSelectedDifficulty('Medium'); setInputText(''); setElapsed(0); setError('');
  };

  const cfg = selectedCompany ? COMPANY_CONFIG[selectedCompany] : null;

  if (!isAuthorized) {
    return null;
  }

  if (view === 'select') {
    return (
      <div className="min-h-screen bg-[#06060F] text-white overflow-x-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Sticky Global Navigation Header */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#07070F]/80 backdrop-blur-md px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-fuchsia-500 to-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-lg shadow-fuchsia-500/20">
                AI
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Career Prep Suite
              </span>
            </div>
            
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
                🏠 Home
              </Link>
              <Link href="/recruiter" className="text-sm font-semibold text-white border-b-2 border-fuchsia-500 pb-1 px-1 transition-colors">
                🚀 Recruiter
              </Link>
              <Link href="/arena" className="text-sm font-medium text-white/50 hover:text-cyan-400 transition-colors">
                🎮 Peer Arena
              </Link>
              <Link href="/interview" className="text-sm font-medium text-white/50 hover:text-indigo-400 transition-colors">
                🎤 Interview
              </Link>
              <Link href="/placement" className="text-sm font-medium text-white/50 hover:text-cyan-400 transition-colors">
                📊 Placement
              </Link>
            </nav>
          </div>
        </header>

        {/* ── Hero Banner ── */}
        <div className="relative overflow-hidden" style={{ minHeight: 260, background: 'linear-gradient(135deg, #0a0a1f 0%, #0d0d28 40%, #070714 100%)' }}>
          <HeroParticles />
          <div className="absolute right-0 top-0 w-72 h-full opacity-70 pointer-events-none">
            <svg viewBox="0 0 280 260" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="cloudGlow" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#0078D4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0078D4" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="180" cy="80" rx="80" ry="70" fill="url(#cloudGlow)" />
              <path d="M120,100 A30,30 0 0,1 125,40 A45,45 0 0,1 205,44 A32,32 0 0,1 198,100 Z"
                fill="none" stroke="#00A4EF" strokeWidth="1.5" strokeOpacity="0.8" />
              <path d="M120,100 A30,30 0 0,1 125,40 A45,45 0 0,1 205,44 A32,32 0 0,1 198,100 Z"
                fill="#0078D4" fillOpacity="0.12" />
              <path d="M150,52 L168,80 L132,80 Z" fill="none" stroke="#00A4EF" strokeWidth="1.2" strokeOpacity="0.9" />
              <circle cx="150" cy="52" r="3" fill="#00A4EF" opacity="0.9">
                <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
              </circle>
              <line x1="150" y1="100" x2="150" y2="130" stroke="#0078D4" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="4 4" />
              <rect x="130" y="130" width="40" height="18" rx="3" fill="none" stroke="#0078D4" strokeOpacity="0.6" strokeWidth="0.9" />
              <text x="150" y="143" textAnchor="middle" fontSize="7" fill="#38BDF8" opacity="0.9">Database</text>
              <line x1="130" y1="139" x2="95" y2="155" stroke="#0078D4" strokeWidth="0.7" strokeOpacity="0.4" />
              <rect x="60" y="150" width="36" height="16" rx="2" fill="none" stroke="#00A4EF" strokeOpacity="0.55" strokeWidth="0.8" />
              <text x="78" y="161" textAnchor="middle" fontSize="6.5" fill="#38BDF8" opacity="0.8">Storage</text>
              <line x1="170" y1="139" x2="200" y2="155" stroke="#0078D4" strokeWidth="0.7" strokeOpacity="0.4" />
              <rect x="188" y="150" width="36" height="16" rx="2" fill="none" stroke="#0EA5E9" strokeOpacity="0.55" strokeWidth="0.8" />
              <text x="206" y="161" textAnchor="middle" fontSize="6.5" fill="#38BDF8" opacity="0.8">Compute</text>
              <circle cx="78" cy="80" r="5" fill="#6366F1" opacity="0.7">
                <animate attributeName="r" values="5;8;5" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="225" cy="120" r="4" fill="#EC4899" opacity="0.7">
                <animate attributeName="r" values="4;7;4" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="90" cy="190" r="4" fill="#8B5CF6" opacity="0.6">
                <animate attributeName="r" values="4;6;4" dur="2.2s" repeatCount="indefinite" />
              </circle>
              {[{x:100,y:35,c:'#4285F4'},{x:220,y:50,c:'#34A853'},{x:250,y:160,c:'#FF9900'},{x:65,y:220,c:'#EA4335'},{x:215,y:210,c:'#0EA5E9'}].map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={p.c} opacity="0.5">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2+i*0.4}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </svg>
          </div>
          <div className="relative z-10 px-8 pt-10 pb-8 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/35 bg-violet-500/10 text-violet-300 text-[11px] font-semibold tracking-widest uppercase mb-5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              AI Recruiter Simulator
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
              className="text-5xl font-black leading-tight"
            >
              <span className="text-white">Choose Your Interview</span>
              <br />
              <span style={{ background: 'linear-gradient(90deg, #c084fc, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Arena
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="mt-3 text-white/50 text-base max-w-lg leading-relaxed"
            >
              Select a company, pick your role and difficulty. The AI recruiter will conduct a fully immersive mock interview.
            </motion.p>
          </div>
        </div>

        {/* ── Company Cards Grid ── */}
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(Object.keys(COMPANY_CONFIG) as Company[]).map((company, i) => {
              const c = COMPANY_CONFIG[company];
              const isSelected = selectedCompany === company;
              return (
                <motion.button
                  key={company}
                  onClick={() => { setSelectedCompany(company); setSelectedRole(c.roles[0]); }}
                  className="relative overflow-hidden rounded-2xl text-left transition-all group"
                  style={{
                    background: `linear-gradient(135deg, ${c.gradient.replace('from-','').replace('via-','').replace('to-','')})`,
                    backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                    border: `1px solid ${isSelected ? c.border : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: isSelected ? `0 0 32px ${c.glow}, 0 0 0 1px ${c.border}` : '0 2px 12px rgba(0,0,0,0.4)',
                    minHeight: 185,
                  }}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ scale: 1.02, boxShadow: `0 0 28px ${c.glow}` }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-80`} />
                  <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
                  }} />
                  <div className="absolute right-0 top-0 w-[55%] h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                    {c.illustration}
                  </div>
                  <div className="relative z-10 p-5 pr-2" style={{ width: '55%' }}>
                    <div className="flex items-center gap-2 mb-3">
                      {c.logo}
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: c.accentColor }}>✓</motion.div>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white mb-1 leading-tight">{company}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: `${c.accentColor}cc` }}>{c.tagline}</p>
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: `1px solid ${c.border}` }}
                    animate={isSelected ? { opacity: [0.5, 1, 0.5] } : { opacity: 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* ── Config Panel ── */}
          <AnimatePresence>
            {selectedCompany && cfg && (
              <motion.div
                initial={{ opacity: 0, y: 16, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                className="overflow-hidden mt-6"
              >
                <div className="rounded-2xl p-6 border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(12px)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                    <div>
                      <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-3">Job Role</label>
                      <div className="flex flex-wrap gap-2">
                        {cfg.roles.map(r => (
                          <button key={r} onClick={() => setSelectedRole(r)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                            style={selectedRole === r
                              ? { background: cfg.accentColor, borderColor: cfg.accentColor, color: '#fff' }
                              : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.45)' }}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-white/35 uppercase tracking-widest mb-3">Difficulty</label>
                      <div className="flex gap-3">
                        {(['Easy','Medium','Hard'] as Difficulty[]).map(d => (
                          <button key={d} onClick={() => setSelectedDifficulty(d)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${selectedDifficulty === d ? DIFF_COLORS[d] : 'text-white/25 border-white/8'}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">{error}</div>
                  )}
                  <motion.button onClick={handleStart} disabled={isStarting || !selectedRole}
                    className="w-full py-4 rounded-xl font-bold text-white text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: `linear-gradient(90deg, ${cfg.accentColor}, ${cfg.accentColor}bb)`, boxShadow: `0 4px 24px ${cfg.glow}` }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    {isStarting ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                        Connecting to {selectedCompany} Recruiter…
                      </span>
                    ) : `Begin Interview at ${selectedCompany} →`}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── CHAT VIEW ──────────────────────────────────────────────────────────────
  if (view === 'chat' && session) {
    const cc = COMPANY_CONFIG[session.companyName];
    const progress = (session.currentQuestionIndex / session.totalQuestions) * 100;
    return (
      <div className="min-h-screen bg-[#07070F] text-white flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[350px] opacity-10 blur-[140px] rounded-full" style={{ background: cc.accentColor }} />
        </div>
        <div className="relative z-10 px-6 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={resetAll} className="text-white/30 hover:text-white/70 transition-colors text-sm">← Exit</button>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              {cc.logo}
              <div>
                <div className="text-sm font-bold">{session.companyName}</div>
                <div className="text-[11px] text-white/40">{session.jobRole} · {session.difficulty}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm font-bold" style={{ color: cc.accentColor }}>{formatTime(elapsed)}</span>
            <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${DIFF_COLORS[session.difficulty]}`}>{session.difficulty}</span>
          </div>
        </div>
        <div className="relative z-10 px-6 py-2 border-b border-white/5">
          <div className="flex justify-between text-[11px] text-white/30 mb-1.5">
            <span>Question {Math.min(session.currentQuestionIndex, session.totalQuestions)} of {session.totalQuestions}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: cc.accentColor }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <AnimatePresence initial={false}>
                {session.messages.map((msg, i) => (
                  <motion.div key={i} className={`flex ${msg.role === 'candidate' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    {msg.role === 'recruiter' ? (
                      <div className="flex items-start gap-2.5 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border mt-0.5"
                          style={{ borderColor: cc.border, background: `${cc.accentColor}20`, color: cc.accentColor }}>
                          {session.companyName[0]}
                        </div>
                        <div>
                          <div className="text-[10px] text-white/30 mb-1 ml-1">{session.companyName} Recruiter</div>
                          <div className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-white/85"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-white"
                        style={{ background: cc.accentColor, boxShadow: `0 4px 20px ${cc.glow}` }}>
                        {msg.content}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border mt-0.5"
                      style={{ borderColor: cc.border, background: `${cc.accentColor}20`, color: cc.accentColor }}>
                      {session.companyName[0]}
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex gap-1.5 items-center h-4">
                        {[0, 1, 2].map(i => (
                          <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: cc.accentColor }}
                            animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            {!session.isCompleted && (
              <div className="px-6 pb-6 pt-3 border-t border-white/5">
                {error && (
                  <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <div className="flex gap-3">
                  <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                    disabled={isLoading}
                    rows={3}
                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-white/20 transition-colors disabled:opacity-40"
                  />
                  <motion.button
                    onClick={handleSubmit}
                    disabled={!inputText.trim() || isLoading}
                    className="px-5 py-3 rounded-xl font-semibold text-white text-sm self-end disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    style={{ background: cc.accentColor }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Send
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Right Info Panel */}
          <div className="w-72 xl:w-80 border-l border-white/5 p-5 flex flex-col gap-5 overflow-y-auto">
            {/* Logo Badge */}
            <div className="rounded-2xl p-5 flex flex-col items-center text-center border"
              style={{ background: `linear-gradient(135deg, ${cc.accentColor}15, transparent)`, borderColor: `${cc.accentColor}30` }}>
              <motion.div animate={{ boxShadow: [`0 0 0 0 ${cc.glow}`, `0 0 20px 8px ${cc.glow}30`, `0 0 0 0 ${cc.glow}`] }}
                transition={{ duration: 3, repeat: Infinity }} className="mb-3 rounded-full p-3">
                {cc.logo}
              </motion.div>
              <h3 className="font-bold text-sm">{session.companyName}</h3>
              <p className="text-white/40 text-xs mt-1">{session.jobRole}</p>
            </div>

            {/* Recruiter parameters */}
            <div className="rounded-xl p-4 border border-white/5 bg-white/[0.02] space-y-3">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Recruiter Focus</h4>
              {[
                { label: 'Technical Depth', icon: '⚙️' },
                { label: 'Problem Solving', icon: '🧠' },
                { label: 'Communication', icon: '💬' },
                { label: 'Culture Fit', icon: '🌐' }
              ].map(({ label, icon }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-white/50">
                  <span>{icon}</span>
                  <span>{label}</span>
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-white/20">Live</span>
                </div>
              ))}
            </div>

            {/* Timer */}
            <div className="rounded-xl p-4 border border-white/5 bg-white/[0.02] text-center">
              <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Session Time</div>
              <div className="font-mono text-2xl font-bold" style={{ color: cc.accentColor }}>
                {formatTime(elapsed)}
              </div>
            </div>

            {/* Question indicators tracker */}
            <div className="rounded-xl p-4 border border-white/5 bg-white/[0.02]">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Questions</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: session.totalQuestions }).map((_, i) => {
                  const done = i < session.currentQuestionIndex - 1;
                  const current = i === session.currentQuestionIndex - 1;
                  return (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all"
                      style={{
                        background: done ? cc.accentColor : current ? `${cc.accentColor}30` : 'transparent',
                        borderColor: done || current ? cc.accentColor : 'rgba(255,255,255,0.1)',
                        color: done ? 'white' : current ? cc.accentColor : 'rgba(255,255,255,0.2)',
                        boxShadow: current ? `0 0 12px ${cc.glow}` : 'none'
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── FEEDBACK VIEW ──────────────────────────────────────────────────────────
  if (view === 'feedback' && session?.evaluation) {
    const { evaluation } = session;
    const fbCfg = COMPANY_CONFIG[session.companyName];
    const isHired = evaluation.meetsExpectedStandards && evaluation.overallScore >= 70;
    const isMid = !isHired && evaluation.overallScore >= 45;

    const statusConfig = isHired
      ? { label: 'Strong Hire', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: '🎉' }
      : isMid
      ? { label: 'Conditional', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: '🔄' }
      : { label: 'No Hire', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '📋' };

    return (
      <div className="min-h-screen bg-[#07070F] text-white font-sans overflow-auto">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] blur-[150px] opacity-10"
            style={{ background: statusConfig.color }} />
        </div>

        <motion.div
          className="relative max-w-4xl mx-auto px-6 py-14"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-1">Interview Complete</div>
              <h1 className="text-3xl font-black">{session.companyName} · {session.jobRole}</h1>
              <p className="text-white/40 text-sm mt-1">{session.difficulty} Difficulty · {formatTime(elapsed)}</p>
            </div>
            <button onClick={resetAll} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/20 transition-all">
              New Interview
            </button>
          </div>

          {/* Status banner banner */}
          <motion.div
            className="rounded-2xl p-6 mb-8 border flex items-center gap-6"
            style={{ background: statusConfig.bg, borderColor: statusConfig.border }}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <div className="text-5xl">{statusConfig.icon}</div>
            <div className="flex-1">
              <div className="text-2xl font-black" style={{ color: statusConfig.color }}>{statusConfig.label}</div>
              <div className="text-white/60 text-sm mt-0.5">{evaluation.hiringDecision}</div>
            </div>
            <ScoreArc score={evaluation.overallScore} />
          </motion.div>

          {/* Parameters grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div
              className="rounded-2xl p-6 border border-white/5 bg-white/[0.02] space-y-5"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            >
              <h3 className="font-bold text-sm text-white/60 uppercase tracking-widest">Performance Metrics</h3>
              <ParamBar label="Technical Depth" value={evaluation.feedbackParameters.technicalDepth} delay={0.5} />
              <ParamBar label="Problem Solving" value={evaluation.feedbackParameters.problemSolving} delay={0.65} />
              <ParamBar label="Communication" value={evaluation.feedbackParameters.communication} delay={0.8} />
              <ParamBar label="Culture Fit" value={evaluation.feedbackParameters.cultureFit} delay={0.95} />
            </motion.div>

            <motion.div
              className="rounded-2xl p-6 border border-white/5 bg-white/[0.02]"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
            >
              <h3 className="font-bold text-sm text-white/60 uppercase tracking-widest mb-4">Meets Standard?</h3>
              <div
                className="rounded-xl px-4 py-3 text-sm font-semibold mb-4 border"
                style={{
                  background: evaluation.meetsExpectedStandards ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  borderColor: evaluation.meetsExpectedStandards ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                  color: evaluation.meetsExpectedStandards ? '#10B981' : '#EF4444'
                }}
              >
                {evaluation.meetsExpectedStandards ? '✓ Meets hiring bar' : '✗ Does not meet hiring bar'}
              </div>

              <div className="space-y-3">
                {[
                  { param: 'Technical Depth', val: evaluation.feedbackParameters.technicalDepth },
                  { param: 'Problem Solving', val: evaluation.feedbackParameters.problemSolving },
                  { param: 'Communication', val: evaluation.feedbackParameters.communication },
                  { param: 'Culture Fit', val: evaluation.feedbackParameters.cultureFit }
                ].map(({ param, val }) => (
                  <div key={param} className="flex items-center justify-between text-sm">
                    <span className="text-white/40">{param}</span>
                    <span className="font-semibold" style={{ color: PARAM_COLOR[val] ?? '#6B7280' }}>{val}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Detailed feedback */}
          <motion.div
            className="rounded-2xl p-6 border border-white/5 bg-white/[0.02]"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          >
            <h3 className="font-bold text-sm text-white/60 uppercase tracking-widest mb-4">
              {session.companyName} Evaluator Feedback
            </h3>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
              {evaluation.detailedFeedback}
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="mt-8 flex gap-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          >
            <motion.button
              onClick={resetAll}
              className="flex-1 py-4 rounded-xl font-bold text-white"
              style={{ background: fbCfg.accentColor }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            >
              Try Another Company
            </motion.button>
            <motion.button
              onClick={() => {
                setSession(prev => prev ? { ...prev, messages: [], currentQuestionIndex: 0, isCompleted: false, evaluation: null } : prev);
                setView('select');
                setSelectedCompany(session.companyName);
                setSelectedRole(session.jobRole);
              }}
              className="px-6 py-4 rounded-xl font-bold border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
            >
              Retry Same Role
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return null;
}
