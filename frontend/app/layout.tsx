"use client";

import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const authUserStr = localStorage.getItem("authUser");

    if (token && authUserStr) {
      try {
        const authUser = JSON.parse(authUserStr);
        setRole(authUser.role);
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
        setRole(null);
      }
    } else {
      setIsLoggedIn(false);
      setRole(null);
      if (pathname !== "/") {
        router.push("/");
      }
    }
  }, [pathname, router]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07070F] text-slate-100 font-sans">
        {isLoggedIn && (
          <header className="sticky top-0 z-50 w-full border-b border-cyan-500/20 bg-[#07070F]/85 backdrop-blur-md px-6 py-4 shadow-[0_1px_15px_rgba(6,182,212,0.1)]">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-black text-sm text-white shadow-lg shadow-cyan-500/20">
                  AI
                </div>
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  Career Prep Suite
                </span>
              </div>
              
              <nav className="flex items-center flex-wrap justify-center gap-5">
                <Link
                  href="/"
                  className={`text-xs uppercase tracking-wider font-semibold transition-all ${
                    pathname === "/" ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-cyan-300"
                  }`}
                >
                  🏠 Home
                </Link>
                <Link
                  href="/recruiter"
                  className={`text-xs uppercase tracking-wider font-semibold transition-all ${
                    pathname === "/recruiter" ? "text-fuchsia-400 font-bold" : "text-slate-400 hover:text-fuchsia-300"
                  }`}
                >
                  🚀 Recruiter
                </Link>
                <Link
                  href="/arena"
                  className={`text-xs uppercase tracking-wider font-semibold transition-all ${
                    pathname === "/arena" ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-cyan-300"
                  }`}
                >
                  🎮 Arena
                </Link>
                <Link
                  href="/interview"
                  className={`text-xs uppercase tracking-wider font-semibold transition-all ${
                    pathname === "/interview" ? "text-indigo-400 font-bold" : "text-slate-400 hover:text-indigo-300"
                  }`}
                >
                  🎤 Interview
                </Link>
                <Link
                  href="/placement"
                  className={`text-xs uppercase tracking-wider font-semibold transition-all ${
                    pathname === "/placement" ? "text-cyan-400 font-bold" : "text-slate-400 hover:text-cyan-300"
                  }`}
                >
                  📊 Placement
                </Link>
                <Link
                  href="/security"
                  className={`text-xs uppercase tracking-wider font-semibold transition-all ${
                    pathname === "/security" ? "text-rose-400 font-bold" : "text-slate-400 hover:text-rose-350"
                  }`}
                >
                  🛡️ Security
                </Link>
                
                {role === "admin" && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href="/admin"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400 bg-cyan-400/10 text-cyan-300 text-xs font-bold uppercase tracking-wider transition-all hover:bg-cyan-400 hover:text-slate-950 hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] ${
                        pathname === "/admin" ? "shadow-[0_0_15px_rgba(0,229,255,0.35)]" : ""
                      }`}
                    >
                      🛡️ Task 6: Admin Security Console
                    </Link>
                  </motion.div>
                )}

                <button
                  onClick={() => {
                    localStorage.clear();
                    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
                    setIsLoggedIn(false);
                    setRole(null);
                    router.push("/");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs font-semibold transition-all"
                >
                  Log Out
                </button>
              </nav>
            </div>
          </header>
        )}
        {children}
      </body>
    </html>
  );
}
