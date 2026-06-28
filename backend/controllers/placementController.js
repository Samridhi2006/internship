/**
 * placementController.js
 * AI Placement Readiness Engine — Backend Controller (Task 2)
 *
 * Endpoints:
 *   POST /api/readiness/evaluate        — full composite readiness evaluation
 *   GET  /api/readiness/history/:userId  — evaluation history for trend graphs
 *   GET  /api/readiness/assessments      — platform-wide skill diagnostic aggregates
 *   POST /api/readiness/resume           — resume text parsing + entity extraction
 *
 * Composite Score Weighting:
 *   Resume Metrics      30%
 *   Interview Analytics  40%  (fetched live from Task 1 InterviewSession schema)
 *   Skill Assessments   30%
 */

import Groq from "groq-sdk";
import User from "../models/User.js";
import InterviewSession from "../models/InterviewSession.js";
import PlacementReadiness from "../models/PlacementReadiness.js";

// ─── Groq instance (lazy singleton) ──────────────────────────────────────────

let groqInstance = null;
function getGroq() {
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqInstance;
}

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ─── Scoring Constants ───────────────────────────────────────────────────────

const WEIGHTS = {
  resume: 0.30,
  interview: 0.40,
  skillAssessment: 0.30,
};

const CLASSIFICATION_THRESHOLDS = {
  PLACEMENT_READY: 75,
  HIGH_POTENTIAL: 55,
};

const CANDIDATE_TRACKS = ["fresher", "internship_seeker", "experienced"];

// ─── Known technology keywords for regex fallback extraction ─────────────────

const TECH_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin",
  "react", "angular", "vue", "next.js", "nextjs", "node.js", "nodejs", "express", "django", "flask", "spring",
  "mongodb", "postgresql", "mysql", "redis", "firebase", "supabase", "dynamodb", "elasticsearch",
  "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "jenkins", "github actions", "ci/cd",
  "html", "css", "tailwind", "sass", "graphql", "rest", "api", "microservices", "serverless",
  "machine learning", "deep learning", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
  "git", "linux", "agile", "scrum", "jira", "figma", "webrtc", "socket.io",
];

const INDUSTRY_SKILLS = [
  "system design", "data structures", "algorithms", "design patterns", "solid principles",
  "test driven development", "unit testing", "integration testing", "performance optimization",
  "security best practices", "cloud architecture", "database design", "api design",
  "ci/cd pipelines", "monitoring", "logging", "documentation", "code review",
  "team collaboration", "problem solving", "communication", "leadership",
];

// ─── Helper: Compute composite score ─────────────────────────────────────────

function computeCompositeScore(resumeScore, interviewScore, skillScore) {
  const composite =
    resumeScore * WEIGHTS.resume +
    interviewScore * WEIGHTS.interview +
    skillScore * WEIGHTS.skillAssessment;
  return Math.round(Math.min(100, Math.max(0, composite)));
}

// ─── Helper: Classify candidate ──────────────────────────────────────────────

function classifyCandidate(compositeScore) {
  if (compositeScore >= CLASSIFICATION_THRESHOLDS.PLACEMENT_READY) {
    return "Placement Ready";
  }
  if (compositeScore >= CLASSIFICATION_THRESHOLDS.HIGH_POTENTIAL) {
    return "High Potential Candidate";
  }
  return "Needs Improvement";
}

// ─── Helper: Fetch live interview metrics for a user ─────────────────────────

async function fetchInterviewMetrics(userId) {
  const defaultMetrics = {
    sessionCount: 0,
    avgTechnicalAccuracy: 60,
    avgCommunicationClarity: 60,
    avgRoleRelevance: 60,
    interviewScore: 60,
  };

  try {
    // Guard: failsafe mock ObjectId
    const isMockId = userId === "000000000000000000000000";
    if (isMockId) {
      return { ...defaultMetrics, interviewScore: 65 };
    }

    const sessions = await InterviewSession.find({
      $or: [{ candidateId: userId }, { candidateId: "anonymous" }],
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (!sessions || sessions.length === 0) return defaultMetrics;

    let totalTech = 0, totalComm = 0, totalRel = 0, metricCount = 0;

    for (const session of sessions) {
      const history = session.history || [];
      const nonSkipped = history.filter((h) => !h.skipped);
      if (nonSkipped.length === 0) continue;

      // The interviewController stores metrics in history[].metrics
      // or as top-level score fields
      for (const entry of nonSkipped) {
        if (entry.metrics) {
          totalTech += entry.metrics.technicalAccuracy || 0;
          totalComm += entry.metrics.communicationClarity || 0;
          totalRel += entry.metrics.roleRelevance || 0;
          metricCount++;
        } else {
          // Fallback: derive from score (0-10 → 0-100)
          const normalizedScore = Math.min(100, (entry.score || 0) * 10);
          totalTech += normalizedScore;
          totalComm += normalizedScore;
          totalRel += normalizedScore;
          metricCount++;
        }
      }
    }

    if (metricCount === 0) return defaultMetrics;

    const avgTech = Math.round(totalTech / metricCount);
    const avgComm = Math.round(totalComm / metricCount);
    const avgRel = Math.round(totalRel / metricCount);
    const interviewScore = Math.round((avgTech + avgComm + avgRel) / 3);

    return {
      sessionCount: sessions.length,
      avgTechnicalAccuracy: avgTech,
      avgCommunicationClarity: avgComm,
      avgRoleRelevance: avgRel,
      interviewScore,
    };
  } catch (err) {
    console.error("[placementController] fetchInterviewMetrics error:", err.message);
    return defaultMetrics;
  }
}

// ─── Helper: Regex-based resume entity extraction (fallback) ─────────────────

function extractEntitiesRegex(resumeText) {
  const lower = resumeText.toLowerCase();

  const foundTech = TECH_KEYWORDS.filter((kw) => lower.includes(kw));
  const foundIndustry = INDUSTRY_SKILLS.filter((kw) => lower.includes(kw));
  const missingSkills = INDUSTRY_SKILLS.filter((kw) => !lower.includes(kw)).slice(0, 8);

  // Extract project-like phrases (lines starting with • or - or numbers, or containing "project")
  const lines = resumeText.split(/\n/);
  const projects = lines
    .filter((line) => /project|built|developed|created|implemented|designed/i.test(line))
    .map((line) => line.replace(/^[\s•\-\d.]+/, "").trim())
    .filter((line) => line.length > 10)
    .slice(0, 6);

  // Score based on content richness
  const wordCount = resumeText.split(/\s+/).length;
  let resumeScore = 40;
  if (foundTech.length >= 8) resumeScore += 20;
  else if (foundTech.length >= 4) resumeScore += 12;
  else if (foundTech.length >= 2) resumeScore += 6;

  if (projects.length >= 3) resumeScore += 15;
  else if (projects.length >= 1) resumeScore += 8;

  if (wordCount >= 300) resumeScore += 15;
  else if (wordCount >= 150) resumeScore += 10;
  else if (wordCount >= 50) resumeScore += 5;

  if (foundIndustry.length >= 5) resumeScore += 10;
  else if (foundIndustry.length >= 2) resumeScore += 5;

  resumeScore = Math.min(100, resumeScore);

  return {
    technologies: foundTech,
    projects,
    missingSkills,
    resumeScore,
  };
}

// ─── Helper: Groq-based resume entity extraction ─────────────────────────────

async function extractEntitiesGroq(resumeText) {
  if (!process.env.GROQ_API_KEY) {
    return null; // Fall through to regex
  }

  const systemPrompt = `
You are a resume analysis engine. Extract structured information from the resume text provided.

Rules:
1. Respond ONLY with a valid JSON object — no markdown, no code fences.
2. The JSON must contain exactly these keys:
   - "technologies": array of programming languages, frameworks, tools, and databases mentioned
   - "projects": array of project names or brief descriptions found
   - "missingIndustrySkills": array of important industry skills NOT mentioned (e.g., testing, CI/CD, system design)
   - "resumeScore": integer 0-100 rating the resume's overall strength for placement readiness
3. Be thorough but concise. Max 10 items per array.

Example output:
{"technologies":["React","Node.js","MongoDB"],"projects":["E-commerce Platform","Chat Application"],"missingIndustrySkills":["System Design","Unit Testing"],"resumeScore":72}
`.trim();

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Resume Text:\n\n${resumeText.slice(0, 4000)}` },
      ],
      temperature: 0.2,
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    const rawText = completion?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies.slice(0, 15) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, 10) : [],
      missingSkills: Array.isArray(parsed.missingIndustrySkills) ? parsed.missingIndustrySkills.slice(0, 10) : [],
      resumeScore: Math.min(100, Math.max(0, parseInt(parsed.resumeScore ?? 50, 10))),
    };
  } catch (err) {
    console.error("[placementController] Groq resume extraction failed:", err.message);
    return null;
  }
}

// ─── Helper: Generate personalized roadmap via Groq ──────────────────────────

async function generateRoadmapGroq(candidateType, weakAreas, missingSkills, classification) {
  if (!process.env.GROQ_API_KEY) {
    return generateRoadmapFallback(candidateType, weakAreas, missingSkills);
  }

  const systemPrompt = `
You are a career placement advisor. Generate a personalized learning roadmap based on the candidate profile.

Rules:
1. Respond ONLY with a valid JSON object — no markdown, no code fences.
2. The JSON must contain exactly these keys:
   - "technologies": array of 4-6 specific technologies/tools to learn or improve
   - "projects": array of 3-5 specific project ideas to build for portfolio
   - "certifications": array of 3-4 specific certifications to pursue
   - "interviewTopics": array of 4-6 specific interview preparation topics
3. Tailor recommendations to the candidate type and their weak areas.
4. Be specific — name actual technologies, certifications, and project ideas.

Example:
{"technologies":["React.js","System Design","Docker"],"projects":["Full-stack E-commerce App","REST API with Auth"],"certifications":["AWS Cloud Practitioner","Meta Front-End Developer"],"interviewTopics":["Binary Trees","Dynamic Programming","System Design Basics"]}
`.trim();

  const userPrompt = `
Candidate Type: ${candidateType}
Classification: ${classification}
Weak Technical Areas: ${weakAreas.join(", ") || "None identified"}
Missing Industry Skills: ${missingSkills.join(", ") || "None identified"}

Generate a tailored roadmap.
`.trim();

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    const rawText = completion?.choices?.[0]?.message?.content || "";
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies.slice(0, 8) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, 6) : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications.slice(0, 5) : [],
      interviewTopics: Array.isArray(parsed.interviewTopics) ? parsed.interviewTopics.slice(0, 8) : [],
    };
  } catch (err) {
    console.error("[placementController] Groq roadmap generation failed:", err.message);
    return generateRoadmapFallback(candidateType, weakAreas, missingSkills);
  }
}

// ─── Helper: Fallback roadmap generation (no Groq) ───────────────────────────

function generateRoadmapFallback(candidateType, weakAreas, missingSkills) {
  const roadmaps = {
    fresher: {
      technologies: ["JavaScript ES6+", "React.js", "Node.js & Express", "MongoDB", "Git & GitHub", "REST API Design"],
      projects: ["Personal Portfolio Website", "Todo App with Auth", "Blog Platform with CRUD", "Weather Dashboard with API Integration"],
      certifications: ["freeCodeCamp JavaScript Algorithms", "Meta Front-End Developer Certificate", "MongoDB University M001"],
      interviewTopics: ["Data Structures Basics", "Array & String Problems", "OOP Concepts", "SQL vs NoSQL", "HTTP & REST Fundamentals"],
    },
    internship_seeker: {
      technologies: ["TypeScript", "Next.js", "PostgreSQL", "Docker Basics", "Tailwind CSS", "GraphQL"],
      projects: ["Full-Stack E-Commerce Platform", "Real-Time Chat Application", "Task Management Dashboard", "API Gateway with Rate Limiting"],
      certifications: ["AWS Cloud Practitioner", "Google IT Support Professional", "HackerRank Problem Solving"],
      interviewTopics: ["System Design Basics", "Dynamic Programming", "Tree & Graph Traversals", "Database Indexing", "Caching Strategies"],
    },
    experienced: {
      technologies: ["Kubernetes", "Terraform", "Apache Kafka", "Redis Advanced Patterns", "gRPC", "Prometheus & Grafana"],
      projects: ["Microservices Architecture Demo", "CI/CD Pipeline with GitHub Actions", "Distributed Task Queue", "Real-Time Analytics Dashboard"],
      certifications: ["AWS Solutions Architect Associate", "Certified Kubernetes Administrator", "Google Professional Cloud Architect"],
      interviewTopics: ["Distributed Systems", "CAP Theorem & Consensus", "Load Balancing Strategies", "Event-Driven Architecture", "Security Best Practices", "Performance Profiling"],
    },
  };

  return roadmaps[candidateType] || roadmaps.fresher;
}

// ─── Helper: Identify weak areas from scores ─────────────────────────────────

function identifyWeakAreas(interviewMetrics, skillScores) {
  const weakTechnicalAreas = [];
  const communicationGaps = [];

  if (interviewMetrics.avgTechnicalAccuracy < 65) {
    weakTechnicalAreas.push("Core Technical Fundamentals");
  }
  if (interviewMetrics.avgRoleRelevance < 65) {
    weakTechnicalAreas.push("Role-Specific Domain Knowledge");
  }
  if ((skillScores.technical || 50) < 60) {
    weakTechnicalAreas.push("Hands-On Coding Proficiency");
  }
  if ((skillScores.domain || 50) < 60) {
    weakTechnicalAreas.push("Industry Domain Awareness");
  }
  if ((skillScores.aptitude || 50) < 60) {
    weakTechnicalAreas.push("Logical Reasoning & Aptitude");
  }

  if (interviewMetrics.avgCommunicationClarity < 65) {
    communicationGaps.push("Interview Response Clarity");
  }
  if ((skillScores.hr || 50) < 60) {
    communicationGaps.push("HR & Behavioral Interview Readiness");
  }
  if (interviewMetrics.avgCommunicationClarity < 50) {
    communicationGaps.push("Structured Answer Formatting");
  }

  // Add defaults if arrays are empty
  if (weakTechnicalAreas.length === 0) {
    weakTechnicalAreas.push("Advanced Algorithm Optimization");
  }
  if (communicationGaps.length === 0) {
    communicationGaps.push("Executive Summary Presentation");
  }

  return { weakTechnicalAreas, communicationGaps };
}

// ─── Helper: Push security log to user document ─────────────────────────────

async function pushSecurityLog(userId, eventType, metadata) {
  try {
    if (userId === "000000000000000000000000") return; // skip failsafe user
    const user = await User.findById(userId);
    if (user) {
      user.securityLogs.push({
        timestamp: new Date(),
        eventType,
        ipAddress: "0.0.0.0",
        deviceDetails: { deviceType: "unknown", os: "Unknown", browser: "Unknown", userAgent: "" },
        status: "SUCCESS",
        metadata,
      });
      if (user.securityLogs.length > 500) {
        user.securityLogs = user.securityLogs.slice(-500);
      }
      await user.save();
    }
  } catch (err) {
    console.error("[placementController] Security log push failed:", err.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENDPOINT: POST /api/readiness/resume
// Resume text parsing + entity extraction
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function parseResume(req, res) {
  try {
    const { resumeText, userId } = req.body;

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "Resume text is required and must be at least 20 characters.",
      });
    }

    const trimmedText = resumeText.trim();

    // Try Groq extraction first, fall back to regex
    let entities = await extractEntitiesGroq(trimmedText);
    if (!entities) {
      entities = extractEntitiesRegex(trimmedText);
    }

    // Push security log
    if (userId) {
      await pushSecurityLog(userId, "RESUME_PARSED", {
        action: "resume_entity_extraction",
        technologiesFound: entities.technologies.length,
        projectsFound: entities.projects.length,
        resumeScore: entities.resumeScore,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume parsed successfully.",
      data: {
        technologies: entities.technologies,
        projects: entities.projects,
        missingSkills: entities.missingSkills,
        resumeScore: entities.resumeScore,
      },
    });
  } catch (err) {
    console.error("[parseResume] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Resume parsing failed due to a server error.",
      error: err.message,
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENDPOINT: POST /api/readiness/evaluate
// Full composite placement readiness evaluation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function evaluatePlacementReadiness(req, res) {
  try {
    const {
      userId,
      candidateType = "fresher",
      resumeText = "",
      skillScores = {},
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required for evaluation.",
      });
    }

    const validCandidateType = CANDIDATE_TRACKS.includes(candidateType) ? candidateType : "fresher";

    // ── 1. Resume Score (30%) ────────────────────────────────────────────────
    let resumeData = {
      rawText: resumeText.slice(0, 5000),
      technologies: [],
      projects: [],
      missingSkills: [],
      resumeScore: 40,
    };

    if (resumeText && resumeText.trim().length >= 20) {
      let entities = await extractEntitiesGroq(resumeText.trim());
      if (!entities) {
        entities = extractEntitiesRegex(resumeText.trim());
      }
      resumeData = {
        rawText: resumeText.trim().slice(0, 5000),
        technologies: entities.technologies,
        projects: entities.projects,
        missingSkills: entities.missingSkills,
        resumeScore: entities.resumeScore,
      };
    }

    // ── 2. Interview Score (40%) — live from Task 1 InterviewSession ────────
    const interviewMetrics = await fetchInterviewMetrics(userId);

    // ── 3. Skill Assessment Score (30%) ─────────────────────────────────────
    const technical = Math.min(100, Math.max(0, parseInt(skillScores.technical ?? 50, 10)));
    const domain = Math.min(100, Math.max(0, parseInt(skillScores.domain ?? 50, 10)));
    const aptitude = Math.min(100, Math.max(0, parseInt(skillScores.aptitude ?? 50, 10)));
    const hr = Math.min(100, Math.max(0, parseInt(skillScores.hr ?? 50, 10)));
    const skillScore = Math.round((technical + domain + aptitude + hr) / 4);

    const skillAssessment = { technical, domain, aptitude, hr, skillScore };

    // ── 4. Composite Score ──────────────────────────────────────────────────
    const compositeScore = computeCompositeScore(
      resumeData.resumeScore,
      interviewMetrics.interviewScore,
      skillScore
    );

    // ── 5. Classification ───────────────────────────────────────────────────
    const readinessClassification = classifyCandidate(compositeScore);

    // ── 6. Identify weak areas ──────────────────────────────────────────────
    const { weakTechnicalAreas, communicationGaps } = identifyWeakAreas(interviewMetrics, skillScores);

    const evaluation = {
      weakTechnicalAreas,
      communicationGaps,
      missingIndustrySkills: resumeData.missingSkills,
    };

    // ── 7. Generate personalized roadmap ────────────────────────────────────
    const personalizedRoadmap = await generateRoadmapGroq(
      validCandidateType,
      weakTechnicalAreas,
      resumeData.missingSkills,
      readinessClassification
    );

    // ── 8. Persist to database ──────────────────────────────────────────────
    let savedRecord = null;
    try {
      savedRecord = await PlacementReadiness.create({
        userId,
        candidateType: validCandidateType,
        resumeData,
        interviewData: interviewMetrics,
        skillAssessment,
        compositeScore,
        readinessClassification,
        evaluation,
        personalizedRoadmap,
      });
    } catch (dbErr) {
      console.error("[evaluatePlacementReadiness] DB save failed:", dbErr.message);
      // Continue — return result even if DB save fails
    }

    // ── 9. Push security audit log ──────────────────────────────────────────
    await pushSecurityLog(userId, "PLACEMENT_EVALUATION", {
      action: "full_readiness_evaluation",
      candidateType: validCandidateType,
      compositeScore,
      readinessClassification,
      resumeScore: resumeData.resumeScore,
      interviewScore: interviewMetrics.interviewScore,
      skillScore,
      recordId: savedRecord?._id?.toString() || "unsaved",
    });

    // ── 10. Return full evaluation payload ──────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Placement readiness evaluation completed.",
      data: {
        _id: savedRecord?._id?.toString() || `temp-${Date.now()}`,
        candidateType: validCandidateType,
        scores: {
          resumeScore: resumeData.resumeScore,
          interviewScore: interviewMetrics.interviewScore,
          technicalSkillScore: technical,
          communicationScore: Math.round(
            (interviewMetrics.avgCommunicationClarity + hr) / 2
          ),
        },
        compositeScore,
        readinessClassification,
        evaluation,
        personalizedRoadmap,
        interviewMetrics: {
          sessionCount: interviewMetrics.sessionCount,
          avgTechnicalAccuracy: interviewMetrics.avgTechnicalAccuracy,
          avgCommunicationClarity: interviewMetrics.avgCommunicationClarity,
          avgRoleRelevance: interviewMetrics.avgRoleRelevance,
        },
        resumeEntities: {
          technologies: resumeData.technologies,
          projects: resumeData.projects,
          missingSkills: resumeData.missingSkills,
        },
        timestamp: savedRecord?.createdAt || new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[evaluatePlacementReadiness] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Placement readiness evaluation failed due to a server error.",
      error: err.message,
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENDPOINT: GET /api/readiness/history/:userId
// Evaluation history for trend graphs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getEvaluationHistory(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId parameter is required.",
      });
    }

    let history = [];
    try {
      history = await PlacementReadiness.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select(
          "candidateType compositeScore readinessClassification " +
          "resumeData.resumeScore interviewData.interviewScore " +
          "skillAssessment.skillScore createdAt"
        )
        .lean();
    } catch (dbErr) {
      console.error("[getEvaluationHistory] DB query failed:", dbErr.message);
    }

    // Map to frontend-friendly format
    const formattedHistory = history.map((h) => ({
      _id: h._id,
      scores: {
        resumeScore: h.resumeData?.resumeScore || 0,
        interviewScore: h.interviewData?.interviewScore || 0,
        technicalSkillScore: h.skillAssessment?.skillScore || 0,
        communicationScore: 0,
      },
      compositeScore: h.compositeScore,
      readinessClassification: h.readinessClassification,
      candidateType: h.candidateType,
      timestamp: h.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedHistory,
      count: formattedHistory.length,
    });
  } catch (err) {
    console.error("[getEvaluationHistory] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch evaluation history.",
      error: err.message,
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENDPOINT: GET /api/readiness/assessments
// Platform-wide skill diagnostic aggregates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getSkillDiagnosticsAggregates(req, res) {
  try {
    let aggregates = null;

    try {
      const pipeline = [
        {
          $group: {
            _id: null,
            avgTechnical: { $avg: "$skillAssessment.technical" },
            avgDomain: { $avg: "$skillAssessment.domain" },
            avgAptitude: { $avg: "$skillAssessment.aptitude" },
            avgHR: { $avg: "$skillAssessment.hr" },
            avgComposite: { $avg: "$compositeScore" },
            totalEvaluations: { $sum: 1 },
            placementReadyCount: {
              $sum: { $cond: [{ $eq: ["$readinessClassification", "Placement Ready"] }, 1, 0] },
            },
            highPotentialCount: {
              $sum: { $cond: [{ $eq: ["$readinessClassification", "High Potential Candidate"] }, 1, 0] },
            },
            needsImprovementCount: {
              $sum: { $cond: [{ $eq: ["$readinessClassification", "Needs Improvement"] }, 1, 0] },
            },
          },
        },
      ];

      const result = await PlacementReadiness.aggregate(pipeline);
      if (result && result.length > 0) {
        aggregates = result[0];
      }
    } catch (dbErr) {
      console.error("[getSkillDiagnosticsAggregates] DB aggregation failed:", dbErr.message);
    }

    // Fallback defaults if no data
    if (!aggregates) {
      aggregates = {
        avgTechnical: 62,
        avgDomain: 58,
        avgAptitude: 65,
        avgHR: 60,
        avgComposite: 61,
        totalEvaluations: 0,
        placementReadyCount: 0,
        highPotentialCount: 0,
        needsImprovementCount: 0,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        categories: {
          Technical: Math.round(aggregates.avgTechnical || 62),
          Domain: Math.round(aggregates.avgDomain || 58),
          Aptitude: Math.round(aggregates.avgAptitude || 65),
          HR: Math.round(aggregates.avgHR || 60),
        },
        platformAverage: Math.round(aggregates.avgComposite || 61),
        totalEvaluations: aggregates.totalEvaluations || 0,
        distribution: {
          placementReady: aggregates.placementReadyCount || 0,
          highPotential: aggregates.highPotentialCount || 0,
          needsImprovement: aggregates.needsImprovementCount || 0,
        },
      },
    });
  } catch (err) {
    console.error("[getSkillDiagnosticsAggregates] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch skill diagnostics.",
      error: err.message,
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENDPOINT: POST /api/readiness/resume/upload
// Accepts multipart PDF binary, extracts text, runs entity extraction
// Called by frontend drag-drop PDF upload flow (multer middleware injects file)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function parsePdfFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF file uploaded. Send file as multipart/form-data field 'resume'.",
      });
    }

    // pdf-parse extracts text from the buffer (dynamic ESM-safe import using createRequire)
    let extractedText = "";
    try {
      const { createRequire } = await import("module");
      const require = createRequire(import.meta.url);
      const { PDFParse } = require("pdf-parse");
      const parser = new PDFParse({ data: req.file.buffer });
      const pdfData = await parser.getText();
      extractedText = (pdfData.text || "").trim();
    } catch (pdfErr) {
      console.error("[parsePdfFile] pdf-parse error:", pdfErr.message);
      return res.status(422).json({
        success: false,
        message: "Could not extract text from the uploaded PDF. Please ensure the PDF is text-based (not a scanned image).",
      });
    }

    if (!extractedText || extractedText.length < 20) {
      return res.status(422).json({
        success: false,
        message: "Extracted PDF text is too short or empty. The PDF may be image-scanned or password-protected.",
      });
    }

    // Run entity extraction (same pipeline as text endpoint)
    let entities = await extractEntitiesGroq(extractedText);
    if (!entities) {
      entities = extractEntitiesRegex(extractedText);
    }

    const userId = req.body?.userId || null;
    if (userId) {
      await pushSecurityLog(userId, "RESUME_PDF_PARSED", {
        action: "pdf_binary_entity_extraction",
        filename: req.file.originalname || "resume.pdf",
        textLength: extractedText.length,
        technologiesFound: entities.technologies.length,
        resumeScore: entities.resumeScore,
      });
    }

    return res.status(200).json({
      success: true,
      message: "PDF parsed and entities extracted successfully.",
      data: {
        extractedText: extractedText.slice(0, 8000),
        technologies: entities.technologies,
        projects: entities.projects,
        missingSkills: entities.missingSkills,
        resumeScore: entities.resumeScore,
        wordCount: extractedText.split(/\s+/).filter(Boolean).length,
      },
    });
  } catch (err) {
    console.error("[parsePdfFile] Error:", err);
    return res.status(500).json({
      success: false,
      message: "PDF parsing failed due to a server error.",
      error: err.message,
    });
  }
}
