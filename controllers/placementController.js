/**
 * placementController.js — Controller
 * AI Placement Readiness Engine
 *
 * evaluatePlacement: Accepts candidate scores, calls Groq LLM for evaluation,
 *                    persists results, and returns structured response.
 * getPlacementHistory: Returns historical evaluation snapshots for a user.
 */

const Groq = require("groq-sdk");
const PlacementReadiness = require("../models/PlacementReadiness");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Classification thresholds ────────────────────────────────────────────────
function classifyReadiness(scores) {
  const avg =
    (scores.resumeScore +
      scores.interviewScore +
      scores.technicalSkillScore +
      scores.communicationScore) /
    4;

  if (avg >= 75) return "Placement Ready";
  if (avg >= 50) return "High Potential Candidate";
  return "Needs Improvement";
}

// ─── Candidate-type system prompt fragment ────────────────────────────────────
function candidateGuidanceBlock(candidateType) {
  switch (candidateType) {
    case "fresher":
      return `
The candidate is a FRESHER (0–1 year experience).
- Focus roadmap on foundational skills: core CS concepts, basic DSA, beginner projects.
- Certifications should be entry-level (Google, Meta, AWS Cloud Practitioner).
- Interview topics should cover fundamentals: arrays, strings, OOP, SQL basics.
- Projects should be portfolio-builders: CRUD apps, basic ML pipelines, REST APIs.
- Communication gaps should suggest academic presentation skills and professional email etiquette.
- Keep advice actionable within a 3–6 month horizon.`;

    case "internship_seeker":
      return `
The candidate is an INTERNSHIP SEEKER (0–2 years, targeting internships).
- Provide execution timelines: "complete X within 2 weeks, Y within 1 month".
- Roadmap must include real open-source contribution ideas and hackathon strategies.
- Certifications should be mid-tier: AWS SAA, Google ACE, Meta React Developer.
- Interview topics: system design basics, behavioral STAR method, LeetCode medium problems.
- Projects should demonstrate deployment experience: cloud-hosted, CI/CD enabled, READMEs polished.
- Communication gaps should address async team collaboration, technical writing, and PR review etiquette.`;

    case "experienced":
      return `
The candidate is EXPERIENCED (2+ years).
- Provide high-scale architecture recommendations: microservices, distributed systems, event-driven patterns.
- Include leadership dimension: how to mentor, conduct code reviews, own delivery timelines.
- Certifications: AWS Solutions Architect Professional, CKA, Google Professional Cloud Architect, PMP.
- Interview topics: system design deep-dives (rate limiters, URL shorteners, distributed caches), leadership scenarios, architectural trade-offs.
- Projects should reflect senior scope: multi-tenant SaaS platforms, real-time data pipelines, infrastructure-as-code templates.
- Communication gaps should address executive stakeholder communication, writing technical RFCs, and cross-team alignment.`;

    default:
      return "";
  }
}

// ─── Main controller ──────────────────────────────────────────────────────────
async function evaluatePlacement(req, res) {
  try {
    const { userId, candidateType, scores } = req.body;

    // Input validation
    if (!userId || !candidateType || !scores) {
      return res.status(400).json({
        success: false,
        message: "userId, candidateType, and scores are required.",
      });
    }

    const requiredScoreFields = [
      "resumeScore",
      "interviewScore",
      "technicalSkillScore",
      "communicationScore",
    ];
    for (const field of requiredScoreFields) {
      if (scores[field] === undefined || scores[field] < 0 || scores[field] > 100) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a number between 0 and 100.`,
        });
      }
    }

    const validTypes = ["fresher", "internship_seeker", "experienced"];
    if (!validTypes.includes(candidateType)) {
      return res.status(400).json({
        success: false,
        message: `candidateType must be one of: ${validTypes.join(", ")}.`,
      });
    }

    // Pre-compute classification (also passed to LLM for consistency)
    const readinessClassification = classifyReadiness(scores);

    // ── Groq LLM call ─────────────────────────────────────────────────────────
    const systemPrompt = `
You are an expert AI Placement Readiness Evaluator for a career intelligence platform.
Your task is to analyze a candidate's performance scores and generate a structured JSON evaluation.

You MUST return ONLY valid JSON with NO markdown, NO code fences, NO prose — raw JSON only.

The JSON structure you must return is exactly:
{
  "evaluation": {
    "weakTechnicalAreas": ["string"],
    "communicationGaps": ["string"],
    "missingIndustrySkills": ["string"]
  },
  "personalizedRoadmap": {
    "technologies": ["string"],
    "projects": ["string"],
    "certifications": ["string"],
    "interviewTopics": ["string"]
  }
}

Rules:
- Each array must have 3–6 specific, actionable items. No vague filler phrases.
- weakTechnicalAreas: identify specific technical concepts the candidate likely struggles with based on technicalSkillScore.
- communicationGaps: identify specific communication deficiencies based on communicationScore.
- missingIndustrySkills: identify skills expected in today's job market that the candidate is likely missing.
- technologies: specific frameworks, tools, or languages to learn.
- projects: concrete project ideas with a short description (e.g. "Build a real-time chat app using Socket.io and Redis Pub/Sub").
- certifications: full certification names with issuing body.
- interviewTopics: specific DS/Algo topics, system design areas, or behavioral frameworks.

The candidate's pre-computed readiness classification is: "${readinessClassification}". Align your guidance to this level.

${candidateGuidanceBlock(candidateType)}
`.trim();

    const userMessage = `
Candidate profile:
- Type: ${candidateType}
- Resume Score: ${scores.resumeScore}/100
- Interview Score: ${scores.interviewScore}/100
- Technical Skill Score: ${scores.technicalSkillScore}/100
- Communication Score: ${scores.communicationScore}/100
- Overall Classification: ${readinessClassification}

Generate the evaluation and personalized roadmap JSON now.
`.trim();

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content?.trim();
    if (!rawContent) {
      return res.status(502).json({
        success: false,
        message: "LLM returned an empty response.",
      });
    }

    // Safe JSON parse — strip any accidental markdown fences
    let parsed;
    try {
      // Clean out any potential markdown code fences or text wrap safely
      let cleaned = rawContent;
      if (cleaned.includes("```")) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (match) {
          cleaned = match[1];
        }
      }
      
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      parsed = JSON.parse(cleaned.trim());
    } catch (err) {
      return res.status(502).json({
        success: false,
        message: "LLM response was not valid JSON.",
        raw: rawContent,
      });
    }

    const { evaluation, personalizedRoadmap } = parsed;

    if (!evaluation || !personalizedRoadmap) {
      return res.status(502).json({
        success: false,
        message: "LLM response missing required fields: evaluation or personalizedRoadmap.",
        raw: parsed,
      });
    }

    // ── Persist to MongoDB ─────────────────────────────────────────────────────
    const record = await PlacementReadiness.create({
      userId,
      candidateType,
      scores,
      evaluation,
      readinessClassification,
      personalizedRoadmap,
      timestamp: new Date(),
    });

    // ── Return full response ───────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      data: {
        _id: record._id,
        userId: record.userId,
        candidateType: record.candidateType,
        scores: record.scores,
        compositeScore: record.compositeScore,
        evaluation: record.evaluation,
        readinessClassification: record.readinessClassification,
        personalizedRoadmap: record.personalizedRoadmap,
        timestamp: record.timestamp,
      },
    });
  } catch (error) {
    console.error("[PlacementEvaluate] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during placement evaluation.",
      error: error.message,
    });
  }
}

// ─── GET: Fetch historical snapshots for a user ───────────────────────────────
async function getPlacementHistory(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required." });
    }

    const history = await PlacementReadiness.find({ userId })
      .sort({ timestamp: 1 })
      .select("scores compositeScore readinessClassification candidateType timestamp")
      .lean();

    // Attach virtual compositeScore manually (lean() bypasses virtuals)
    const enriched = history.map((doc) => ({
      ...doc,
      compositeScore: parseFloat(
        (
          (doc.scores.resumeScore +
            doc.scores.interviewScore +
            doc.scores.technicalSkillScore +
            doc.scores.communicationScore) /
          4
        ).toFixed(1)
      ),
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error("[PlacementHistory] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch placement history.",
      error: error.message,
    });
  }
}

module.exports = { evaluatePlacement, getPlacementHistory };
