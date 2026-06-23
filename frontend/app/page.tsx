'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Supported company configurations matching Task 3 requirements
const companies = [
  { name: 'Google', tech: 'Algorithms & Scale', logo: '🌐', color: 'hover:border-blue-500/50 hover:bg-blue-500/5 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
  { name: 'Amazon', tech: 'Leadership Principles', logo: '📦', color: 'hover:border-amber-500/50 hover:bg-amber-500/5 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
  { name: 'Microsoft', tech: 'System Design & Growth', logo: '💻', color: 'hover:border-sky-500/50 hover:bg-sky-500/5 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]' },
  { name: 'TCS', tech: 'Enterprise Fundamentals', logo: '🏢', color: 'hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]' },
  { name: 'Infosys', tech: 'Client Delivery & APIs', logo: '☁️', color: 'hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
  { name: 'Startup', tech: 'Fast Building & Ownership', logo: '🚀', color: 'hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 hover:shadow-[0_0_20px_rgba(217,70,239,0.15)]' }
];

function BinaryMatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Falling binary stream characters
    const chars = ['0', '1'];
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      // semi-transparent background to create trailing motion blur
      ctx.fillStyle = 'rgba(7, 7, 15, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Randomly select '0' or '1'
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Custom cyber-color gradient matching image_742459.jpg
        const rand = Math.random();
        if (rand > 0.85) {
          ctx.fillStyle = '#d946ef'; // Fuchsia highlights
        } else if (rand > 0.5) {
          ctx.fillStyle = '#6366f1'; // Deep Indigo
        } else {
          ctx.fillStyle = '#312e81'; // Dark ambient indigo
        }

        ctx.fillText(text, x, y);

        // Reset drop to top once it goes off-screen
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover opacity-35" />;
}

export default function UnifiedHubPage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#07070F] text-white font-sans selection:bg-fuchsia-500/30 overflow-x-hidden relative">
      
      {/* ─── STUNNING DYNAMIC CYBER BACKGROUND ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Dynamic Binary Matrix Streams */}
        <BinaryMatrixBackground />

        {/* Ambient Top Glow Layer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-fuchsia-900/15 via-indigo-950/5 to-transparent blur-[150px] rounded-full" />
        
        {/* Glowing Matrix Circuit Elements & Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '56px 56px'
          }}
        />
      </div>

      {/* Custom Keyframe animations for the UI */}
      <style jsx global>{`
        @keyframes slow-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        .anim-slow-spin {
          animation: slow-spin 20s linear infinite;
        }
        .anim-float {
          animation: float-slow 6s ease-in-out infinite;
        }
      `}</style>

      {/* ─── GLOBAL HEADER NAVIGATION ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#07070F]/85 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-fuchsia-500 to-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-lg shadow-fuchsia-500/20">
              AI
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Career Prep Suite
            </span>
          </div>
          
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-white transition-colors">
              🏠 Home
            </Link>
            <Link href="/recruiter" className="text-sm font-medium text-white/50 hover:text-fuchsia-400 transition-colors">
              🚀 Recruiter Arena
            </Link>
            <Link href="/interview" className="text-sm font-medium text-white/50 hover:text-indigo-400 transition-colors">
              🎤 Mock Interview
            </Link>
            <Link href="/placement" className="text-sm font-medium text-white/50 hover:text-cyan-400 transition-colors">
              📊 Placement Hub
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE CONTENT ─── */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        
        {/* ─── HERO SECTION WITH FLOATING WIREFRAME CUBE ─── */}
        <div className="relative text-center mb-16 pt-6">
          {/* Central Rotating Wireframe Tesseract behind text */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 pointer-events-none opacity-20 anim-slow-spin flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full stroke-fuchsia-400 stroke-[0.5]" fill="none">
              {/* Outer Cube */}
              <rect x="20" y="20" width="60" height="60" />
              {/* Inner Cube */}
              <rect x="35" y="35" width="30" height="30" />
              {/* Connection Lines */}
              <line x1="20" y1="20" x2="35" y2="35" />
              <line x1="80" y1="20" x2="65" y2="35" />
              <line x1="20" y1="80" x2="35" y2="65" />
              <line x1="80" y1="80" x2="65" y2="65" />
              {/* Diagonal Cross Matrices */}
              <path d="M 50,0 L 50,100 M 0,50 L 100,50" strokeWidth="0.25" strokeDasharray="2,2" />
            </svg>
          </div>

          <motion.div
            className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-xs font-bold tracking-wider uppercase mb-5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />
            Recruiter Simulation Center Active
          </motion.div>
          
          <h1 className="relative z-10 text-5xl md:text-6xl font-black tracking-tight leading-tight">
            AI Corporate <span className="bg-gradient-to-r from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(217,70,239,0.3)]">Simulation Portal</span>
          </h1>
          <p className="relative z-10 mt-3 text-white/40 text-base max-w-lg mx-auto leading-relaxed">
            Test your skills under realistic pressure conditions modeled from actual industry workflows.
          </p>
        </div>

        {/* ─── LEVEL 1: PRIMARY PRIORITY AREA (Task 3: Recruiter Simulator) ─── */}
        <div className="mb-12">
          <motion.div
            onClick={() => router.push('/recruiter')}
            onMouseEnter={() => setHoveredCard('recruiter')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative overflow-hidden rounded-3xl p-8 md:p-10 cursor-pointer border transition-all duration-500 bg-gradient-to-br from-white/[0.04] to-white/[0.01]"
            style={{
              borderColor: hoveredCard === 'recruiter' ? 'rgba(217, 70, 239, 0.7)' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: hoveredCard === 'recruiter' 
                ? '0 0 50px rgba(217, 70, 239, 0.35), inset 0 0 24px rgba(217, 70, 239, 0.1)' 
                : '0 8px 40px rgba(0,0,0,0.4)'
            }}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          >
            {/* Ambient Corner Vector Webs */}
            <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none opacity-20">
              <svg viewBox="0 0 100 100" className="w-full h-full stroke-indigo-500 stroke-[0.3]" fill="none">
                <circle cx="100" cy="0" r="40" />
                <circle cx="100" cy="0" r="60" />
                <circle cx="100" cy="0" r="80" />
                <line x1="100" y1="0" x2="40" y2="60" />
                <line x1="100" y1="0" x2="60" y2="40" />
              </svg>
            </div>

            {/* Ambient Glow Gradient */}
            <div className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-fuchsia-500/10 via-indigo-500/5 to-transparent pointer-events-none blur-3xl opacity-80" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              {/* Info Column */}
              <div className="max-w-3xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-md text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 tracking-wider uppercase border border-fuchsia-500/40">
                    🔥 Featured Priority Module
                  </div>
                  <div className="text-white/40 text-xs font-semibold tracking-wider">Task 3: Company-Specific Simulator</div>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none flex items-center gap-3.5">
                  🚀 Company-Specific AI Recruiter Simulator
                </h2>
                
                <p className="text-white/60 text-sm md:text-base leading-relaxed">
                  Enter actual corporate interview rooms configured to replicate the authentic hiring styles, core culture criteria, and scoring rubrics of global tech giants. The AI recruiter dynamically adapts its questions, socratic style, and performance standards based on your target company.
                </p>

                {/* Corporate Pipelines Badges Showcase */}
                <div className="pt-4">
                  <div className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-3">Supported Pathways</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {companies.map((c) => (
                      <div
                        key={c.name}
                        onMouseEnter={() => setHoveredBadge(c.name)}
                        onMouseLeave={() => setHoveredBadge(null)}
                        className={`flex flex-col p-3 rounded-xl border bg-[#0d0d18]/70 backdrop-blur-sm transition-all duration-300 text-left border-white/5 ${c.color}`}
                      >
                        <div className="text-xl mb-1">{c.logo}</div>
                        <div className="font-bold text-xs text-white/90">{c.name}</div>
                        <div className="text-[9px] text-white/40 mt-0.5 line-clamp-1">{c.tech}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glowing Interactive Launch Widget */}
              <div className="flex-shrink-0 flex items-center justify-center lg:px-6">
                <div 
                  className="w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-500 border relative group"
                  style={{
                    background: hoveredCard === 'recruiter' ? '#D946EF' : 'rgba(255,255,255,0.03)',
                    borderColor: hoveredCard === 'recruiter' ? '#E879F9' : 'rgba(255,255,255,0.1)',
                    boxShadow: hoveredCard === 'recruiter' ? '0 0 40px rgba(217,70,239,0.5)' : 'none'
                  }}
                >
                  {/* Floating Pulsing Glow Halo */}
                  <span className="absolute inset-0 rounded-full bg-fuchsia-500/10 animate-ping pointer-events-none" />
                  
                  <span className="text-3xl mb-0.5 transition-transform duration-300 group-hover:scale-125">🎮</span>
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">Launch</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── LEVEL 2: SECONDARY PLATFORM MODULES (Task 1 & Task 2) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: AI Mock Interview Engine */}
          <motion.div
            onClick={() => router.push('/interview')}
            onMouseEnter={() => setHoveredCard('interview')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative overflow-hidden rounded-2xl p-6 cursor-pointer border transition-all duration-300 bg-gradient-to-br from-white/[0.02] to-white/[0.01]"
            style={{
              borderColor: hoveredCard === 'interview' ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.06)',
              boxShadow: hoveredCard === 'interview' 
                ? '0 0 30px rgba(99, 102, 241, 0.15)' 
                : '0 4px 20px rgba(0,0,0,0.1)'
            }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none blur-2xl" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">🎤</span>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Task 1</span>
                </div>
                <h3 className="text-xl font-bold mb-2">AI Socratic Interview Engine</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Engage in an adaptive conversation evaluating system design, technical architectures, and core CS fundamentals with instant AI evaluations.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
                <span>Start Socratic Session</span>
                <span>→</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2: AI Placement Readiness Hub */}
          <motion.div
            onClick={() => router.push('/placement')}
            onMouseEnter={() => setHoveredCard('placement')}
            onMouseLeave={() => setHoveredCard(null)}
            className="relative overflow-hidden rounded-2xl p-6 cursor-pointer border transition-all duration-300 bg-gradient-to-br from-white/[0.02] to-white/[0.01]"
            style={{
              borderColor: hoveredCard === 'placement' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(255, 255, 255, 0.06)',
              boxShadow: hoveredCard === 'placement' 
                ? '0 0 30px rgba(6, 182, 212, 0.15)' 
                : '0 4px 20px rgba(0,0,0,0.1)'
            }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none blur-2xl" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">📊</span>
                  <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Task 2</span>
                </div>
                <h3 className="text-xl font-bold mb-2">AI Placement Readiness Hub</h3>
                <p className="text-xs text-white/40 leading-relaxed">
                  Assess composite profile scores, visualize historical development on interactive SVG curves, and receive tailored progression blueprints.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span>Analyze Readiness Score</span>
                <span>→</span>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
