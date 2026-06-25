import Groq from "groq-sdk";
import { UAParser } from "ua-parser-js";
import Question from "../models/Question.js";
import InterviewSession from "../models/InterviewSession.js";
import User from "../models/User.js";

let groqInstance = null;
function getGroq() {
  if (!groqInstance) {
    groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY || "mock-key" });
  }
  return groqInstance;
}

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const SCORE_THRESHOLD_UP = 7;
const SCORE_THRESHOLD_DOWN = 4;
const DEFAULT_TOTAL_QUESTIONS = 10;

const clampDifficulty = (value) =>
  Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, value));

const computeNextDifficulty = (currentDifficulty, score) => {
  if (score >= SCORE_THRESHOLD_UP) {
    return clampDifficulty(currentDifficulty + 1);
  }
  if (score <= SCORE_THRESHOLD_DOWN) {
    return clampDifficulty(currentDifficulty - 1);
  }
  return currentDifficulty;
};

function parseUserAgent(userAgentString) {
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();
  let deviceType = "desktop";
  if (result.device.type === "mobile") deviceType = "mobile";
  else if (result.device.type === "tablet") deviceType = "tablet";
  const os = result.os.name ? `${result.os.name}${result.os.version ? " " + result.os.version : ""}` : "Unknown OS";
  const browser = result.browser.name ? `${result.browser.name}${result.browser.major ? " " + result.browser.major : ""}` : "Unknown Browser";
  return { deviceType, os, browser, userAgent: userAgentString };
}

function extractIpAddress(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.connection?.remoteAddress || req.socket?.remoteAddress || "0.0.0.0";
}

const fetchQuestion = async (difficulty, askedIds) => {
  let question = await Question.findOne({
    difficulty,
    _id: { $nin: askedIds },
  });

  if (question) return question;

  const fallbackOrder = [];
  for (let delta = 1; delta <= MAX_DIFFICULTY; delta++) {
    if (difficulty + delta <= MAX_DIFFICULTY) fallbackOrder.push(difficulty + delta);
    if (difficulty - delta >= MIN_DIFFICULTY) fallbackOrder.push(difficulty - delta);
  }

  for (const fallbackDiff of fallbackOrder) {
    question = await Question.findOne({
      difficulty: fallbackDiff,
      _id: { $nin: askedIds },
    });
    if (question) return question;
  }

  return null;
};

const evaluateAnswerWithGroq = async (questionText, candidateAnswer) => {
  if (!process.env.GROQ_API_KEY) {
    // Graceful mock evaluation if no Groq API Key is configured
    const mockScore = candidateAnswer.length > 50 ? 8 : 5;
    return {
      score: mockScore,
      evaluation: `[Mock AI] Answer evaluated with length ${candidateAnswer.length}. Assessed score: ${mockScore}/10.`
    };
  }

  const systemPrompt = `
You are a strict technical interview evaluator. Your ONLY job is to evaluate a candidate's answer.

Rules:
1. Respond ONLY with a valid JSON object — no markdown, no code fences, no preamble.
2. The JSON must contain exactly two keys:
   - "score": an integer from 0 to 10
   - "evaluation": a 1-3 sentence constructive feedback string
3. Scoring guide:
   - 9-10: Exceptional. Complete, concise, uses correct terminology.
   - 7-8:  Good. Mostly correct with minor omissions.
   - 5-6:  Average. Partially correct but missing key concepts.
   - 3-4:  Below average. Shows basic awareness but major gaps.
   - 1-2:  Poor. Largely incorrect or irrelevant.
   - 0:    No answer, gibberish, or off-topic entirely.
4. Never deviate from the JSON format. Any other output format will cause a system error.

Example output:
{"score": 7, "evaluation": "The candidate correctly identified the concept but missed discussing time complexity trade-offs."}
`.trim();

  const userPrompt = `
Question: ${questionText}

Candidate's Answer: ${candidateAnswer}

Evaluate the answer and return only the JSON object.
`.trim();

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 256,
      response_format: { type: "json_object" },
    });

    const rawText = completion?.choices?.[0]?.message?.content || "";
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    const score = Math.min(10, Math.max(0, parseInt(parsed.score ?? 5, 10)));
    const evaluation =
      typeof parsed.evaluation === "string" && parsed.evaluation.trim()
        ? parsed.evaluation.trim()
        : "No evaluation provided.";

    return { score, evaluation };
  } catch (error) {
    console.error("[Groq Evaluation Error]:", error);
    return { score: 5, evaluation: "Could not retrieve AI evaluation due to server connection issues. Default score assigned." };
  }
};

export const initSession = async (req, res) => {
  try {
    const { candidateId, totalQuestions } = req.body;
    const userId = req.user.sub;

    const questionCount =
      Number.isInteger(totalQuestions) && totalQuestions >= 1 && totalQuestions <= 30
        ? totalQuestions
        : DEFAULT_TOTAL_QUESTIONS;

    const session = await InterviewSession.create({
      candidateId: candidateId || "anonymous",
      currentDifficulty: 1,
      totalQuestions: questionCount,
      askedQuestionIds: [],
      history: [],
      lastAnswer: null,
      status: "active",
    });

    const firstQuestion = await fetchQuestion(1, []);
    if (!firstQuestion) {
      await InterviewSession.findByIdAndDelete(session._id);
      return res.status(503).json({
        success: false,
        message: "No questions available in the database. Please seed question data first.",
      });
    }

    session.askedQuestionIds.push(firstQuestion._id);
    await session.save();

    // Log INTERVIEW_STARTED event in user's security log
    const user = await User.findById(userId);
    if (user) {
      user.securityLogs.push({
        timestamp: new Date(),
        eventType: "INTERVIEW_STARTED",
        ipAddress: extractIpAddress(req),
        deviceDetails: parseUserAgent(req.headers["user-agent"] || ""),
        status: "SUCCESS",
        metadata: { sessionId: session._id, totalQuestions: session.totalQuestions },
      });
      await user.save();
    }

    return res.status(201).json({
      success: true,
      message: "Interview session started.",
      data: {
        sessionId: session._id,
        currentDifficulty: session.currentDifficulty,
        questionNumber: 1,
        totalQuestions: session.totalQuestions,
        question: {
          id: firstQuestion._id,
          text: firstQuestion.text,
          topic: firstQuestion.topic,
          difficulty: firstQuestion.difficulty,
        },
      },
    });
  } catch (error) {
    console.error("[initSession] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start interview session.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, answer, skipped = false } = req.body;
    const userId = req.user.sub;

    if (!sessionId || !questionId) {
      return res.status(400).json({ success: false, message: "sessionId and questionId are required." });
    }
    if (!skipped && (typeof answer !== "string" || !answer.trim())) {
      return res.status(400).json({
        success: false,
        message: "An answer is required unless the question is skipped.",
      });
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }
    if (session.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "This interview session has already been completed.",
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    if (!skipped && answer.trim()) {
      const normalised = answer.trim().toLowerCase();
      const lastNormalised = session.lastAnswer?.trim().toLowerCase() ?? null;
      if (lastNormalised && normalised === lastNormalised) {
        return res.status(422).json({
          success: false,
          message: "Duplicate response detected. You cannot submit the same answer consecutively.",
          code: "REPEAT_ANSWER",
        });
      }
    }

    let score = 0;
    let evaluation = "Question skipped. No points awarded.";
    let nextDifficulty;

    if (skipped) {
      score = 0;
      nextDifficulty = clampDifficulty(session.currentDifficulty - 1);
    } else {
      const groqResult = await evaluateAnswerWithGroq(question.text, answer.trim());
      score = groqResult.score;
      evaluation = groqResult.evaluation;
      nextDifficulty = computeNextDifficulty(session.currentDifficulty, score);
    }

    const historyEntry = {
      questionText: question.text,
      questionId: question._id,
      answer: skipped ? null : answer.trim(),
      score,
      evaluation,
      difficultyAtTime: session.currentDifficulty,
      skipped,
      completedAt: new Date(),
    };

    session.history.push(historyEntry);
    session.currentDifficulty = nextDifficulty;
    if (!skipped) {
      session.lastAnswer = answer.trim();
    }

    const user = await User.findById(userId);

    // Log progress event
    if (user) {
      user.securityLogs.push({
        timestamp: new Date(),
        eventType: "INTERVIEW_PROGRESS",
        ipAddress: extractIpAddress(req),
        deviceDetails: parseUserAgent(req.headers["user-agent"] || ""),
        status: skipped ? "WARNING" : "SUCCESS",
        metadata: {
          sessionId: session._id,
          questionTopic: question.topic,
          score,
          skipped,
          difficultyAtTime: historyEntry.difficultyAtTime,
          newDifficulty: nextDifficulty,
        },
      });
      await user.save();
    }

    const questionsAnswered = session.history.length;
    const isComplete = questionsAnswered >= session.totalQuestions;

    if (isComplete) {
      session.status = "completed";
      await session.save();

      const totalSkipped = session.history.filter((h) => h.skipped).length;
      const avgScore =
        session.history.reduce((sum, h) => sum + h.score, 0) / session.history.length;
      const peakDifficulty = Math.max(...session.history.map((h) => h.difficultyAtTime));

      if (user) {
        user.securityLogs.push({
          timestamp: new Date(),
          eventType: "INTERVIEW_COMPLETED",
          ipAddress: extractIpAddress(req),
          deviceDetails: parseUserAgent(req.headers["user-agent"] || ""),
          status: "SUCCESS",
          metadata: {
            sessionId: session._id,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
          },
        });
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Interview complete.",
        data: {
          sessionId: session._id,
          status: "completed",
          analytics: {
            totalQuestions: session.totalQuestions,
            questionsAnswered,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
            finalDifficulty: session.currentDifficulty,
          },
          history: session.history,
        },
      });
    }

    const nextQuestion = await fetchQuestion(nextDifficulty, session.askedQuestionIds);

    if (!nextQuestion) {
      session.status = "completed";
      await session.save();

      const totalSkipped = session.history.filter((h) => h.skipped).length;
      const avgScore =
        session.history.reduce((sum, h) => sum + h.score, 0) / session.history.length;
      const peakDifficulty = Math.max(...session.history.map((h) => h.difficultyAtTime));

      if (user) {
        user.securityLogs.push({
          timestamp: new Date(),
          eventType: "INTERVIEW_COMPLETED",
          ipAddress: extractIpAddress(req),
          deviceDetails: parseUserAgent(req.headers["user-agent"] || ""),
          status: "SUCCESS",
          metadata: {
            sessionId: session._id,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
          },
        });
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Interview complete. No more unique questions available.",
        data: {
          sessionId: session._id,
          status: "completed",
          analytics: {
            totalQuestions: session.totalQuestions,
            questionsAnswered,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
            finalDifficulty: session.currentDifficulty,
          },
          history: session.history,
        },
      });
    }

    session.askedQuestionIds.push(nextQuestion._id);
    await session.save();

    return res.status(200).json({
      success: true,
      message: skipped ? "Question skipped." : "Answer submitted successfully.",
      data: {
        sessionId: session._id,
        status: "active",
        result: {
          score,
          evaluation,
          skipped,
          previousDifficulty: historyEntry.difficultyAtTime,
          newDifficulty: nextDifficulty,
        },
        question: {
          id: nextQuestion._id,
          text: nextQuestion.text,
          topic: nextQuestion.topic,
          difficulty: nextQuestion.difficulty,
        },
        progress: {
          questionNumber: questionsAnswered + 1,
          totalQuestions: session.totalQuestions,
        },
      },
    });
  } catch (error) {
    console.error("[submitAnswer] Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred while processing your answer.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    let currentQuestion = null;
    if (session.status === "active" && session.askedQuestionIds.length) {
      const lastAskedId = session.askedQuestionIds[session.askedQuestionIds.length - 1];
      currentQuestion = await Question.findById(lastAskedId).lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        currentDifficulty: session.currentDifficulty,
        questionsAnswered: session.history.length,
        totalQuestions: session.totalQuestions,
        history: session.history,
        currentQuestion: currentQuestion
          ? {
              id: currentQuestion._id,
              text: currentQuestion.text,
              topic: currentQuestion.topic,
              difficulty: currentQuestion.difficulty,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[getSession] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve session.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const evaluateAnswerDetailed = async (questionText, expectedKeywords, topic, candidateAnswer) => {
  if (!process.env.GROQ_API_KEY) {
    const trimmed = candidateAnswer.trim();
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    
    let technicalAccuracy = 40;
    if (expectedKeywords && expectedKeywords.length > 0) {
      const matches = expectedKeywords.filter(k => 
        trimmed.toLowerCase().includes(k.toLowerCase())
      ).length;
      technicalAccuracy = Math.round((matches / expectedKeywords.length) * 100);
      technicalAccuracy = Math.min(100, technicalAccuracy + Math.min(20, Math.round(wordCount / 3)));
    } else {
      technicalAccuracy = wordCount >= 30 ? 85 : wordCount >= 15 ? 70 : 50;
    }
    
    let communicationClarity = 40;
    if (wordCount >= 45) communicationClarity = 90;
    else if (wordCount >= 25) communicationClarity = 80;
    else if (wordCount >= 12) communicationClarity = 65;
    else if (wordCount >= 5) communicationClarity = 50;
    
    if (/^[A-Z]/.test(trimmed)) communicationClarity += 5;
    if (/\.$/.test(trimmed)) communicationClarity += 5;
    communicationClarity = Math.min(100, communicationClarity);
    
    const cleanTopic = (topic || "General").toLowerCase();
    const topicWords = cleanTopic.split(/[\s/]+/).filter(w => w.length > 3);
    let relevanceScore = 70;
    if (topicWords.length > 0) {
      const topicMatches = topicWords.filter(w => trimmed.toLowerCase().includes(w)).length;
      relevanceScore = Math.min(100, 60 + Math.round((topicMatches / topicWords.length) * 40));
    }
    const questionWords = questionText.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 10);
    const qMatches = questionWords.filter(w => trimmed.toLowerCase().includes(w)).length;
    if (questionWords.length > 0) {
      relevanceScore = Math.min(100, relevanceScore + Math.round((qMatches / questionWords.length) * 15));
    }
    
    const avgScore = Math.round((technicalAccuracy + communicationClarity + relevanceScore) / 3);
    const scoreVal = parseFloat((avgScore / 10).toFixed(1));
    
    let feedback = "";
    let achievementTags = [];
    
    if (scoreVal >= 8) {
      feedback = "Outstanding response! You demonstrated strong technical depth, precise terminology, and exceptionally clear articulation.";
      achievementTags = ["Technical Depth", "Clear Explainer"];
    } else if (scoreVal >= 6) {
      feedback = "Good response. The main concepts are covered correctly, but you could enhance the score by explaining the underlying architecture and providing specific examples.";
      achievementTags = ["Solid Foundation", "Clear Articulation"];
    } else if (scoreVal >= 4) {
      feedback = "Partial understanding shown. The answer addresses the topic but is missing key technical details and formal vocabulary.";
      achievementTags = ["Needs Detail", "Developing"];
    } else {
      feedback = "The answer is incomplete or incorrect. Review the fundamental concepts, explore practical examples, and try structuring your next response.";
      achievementTags = ["Needs Review"];
    }
    
    return {
      technicalAccuracy,
      communicationClarity,
      roleRelevance: relevanceScore,
      feedback,
      achievementTags,
    };
  }

  const systemPrompt = `
You are an advanced AI technical interview evaluator. Analyze the candidate's answer to the given question.
Evaluate the following performance parameters on a scale of 0 to 100:
1. "technicalAccuracy": How technically accurate and correct is the answer?
2. "communicationClarity": How clear, concise, and professional is the communication?
3. "roleRelevance": How relevant is the response to the specified topic/industry role?

Also provide:
- "feedback": A constructive 2-3 sentence review of the answer.
- "achievementTags": An array of 1-3 short tags (e.g., "OOP Expert", "Clean Explainer", "Needs Detail") representing their performance.

You MUST respond strictly in valid JSON format with NO markdown, NO code fences, and NO preamble.

Example JSON output:
{
  "technicalAccuracy": 85,
  "communicationClarity": 90,
  "roleRelevance": 80,
  "feedback": "The candidate has a solid grasp of block scoping and hoisting. Excellent explanation of let vs var.",
  "achievementTags": ["Scoping Master", "Clear Explainer"]
}
`.trim();

  const userPrompt = `
Question: ${questionText}
Expected Keywords: ${expectedKeywords.join(", ")}
Topic: ${topic}
Candidate Answer: ${candidateAnswer}

Evaluate the response and return only the JSON object.
`.trim();

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 384,
      response_format: { type: "json_object" },
    });

    const rawText = completion?.choices?.[0]?.message?.content || "";
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return {
      technicalAccuracy: Math.min(100, Math.max(0, parseInt(parsed.technicalAccuracy ?? 70, 10))),
      communicationClarity: Math.min(100, Math.max(0, parseInt(parsed.communicationClarity ?? 70, 10))),
      roleRelevance: Math.min(100, Math.max(0, parseInt(parsed.roleRelevance ?? 70, 10))),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Evaluation complete.",
      achievementTags: Array.isArray(parsed.achievementTags) ? parsed.achievementTags : ["Evaluation Done"],
    };
  } catch (error) {
    console.error("[Groq Detailed Evaluation Error]:", error);
    return {
      technicalAccuracy: 60,
      communicationClarity: 60,
      roleRelevance: 60,
      feedback: "Answer evaluated via fallback grader due to connection limits.",
      achievementTags: ["Fallback Evaluated"],
    };
  }
};

export const evaluateResponse = async (req, res) => {
  try {
    const { sessionId, questionId, answer, skipped = false } = req.body;
    const userId = req.user.sub;

    if (!sessionId || !questionId) {
      return res.status(400).json({ success: false, message: "sessionId and questionId are required." });
    }
    if (!skipped && (typeof answer !== "string" || !answer.trim())) {
      return res.status(400).json({
        success: false,
        message: "An answer is required unless the question is skipped.",
      });
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }
    if (session.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "This interview session has already been completed.",
      });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    if (!skipped && answer.trim()) {
      const normalised = answer.trim().toLowerCase();
      const lastNormalised = session.lastAnswer?.trim().toLowerCase() ?? null;
      if (lastNormalised && normalised === lastNormalised) {
        return res.status(422).json({
          success: false,
          message: "Duplicate response detected. You cannot submit the same answer consecutively.",
          code: "REPEAT_ANSWER",
        });
      }
    }

    let techScore = 0;
    let commScore = 0;
    let relevanceScore = 0;
    let score = 0;
    let feedback = "Question skipped. No points awarded.";
    let achievementTags = ["Skipped"];
    let nextDifficulty;

    if (skipped) {
      score = 0;
      nextDifficulty = clampDifficulty(session.currentDifficulty - 1);
    } else {
      const evalResult = await evaluateAnswerDetailed(
        question.text,
        question.expectedKeywords || [],
        question.topic || "General",
        answer.trim()
      );
      
      techScore = evalResult.technicalAccuracy;
      commScore = evalResult.communicationClarity;
      relevanceScore = evalResult.roleRelevance;
      feedback = evalResult.feedback;
      achievementTags = evalResult.achievementTags;
      
      score = parseFloat(((techScore + commScore + relevanceScore) / 30).toFixed(1));
      nextDifficulty = computeNextDifficulty(session.currentDifficulty, score);
    }

    const historyEntry = {
      questionText: question.text,
      questionId: question._id,
      answer: skipped ? null : answer.trim(),
      score,
      evaluation: feedback,
      difficultyAtTime: session.currentDifficulty,
      skipped,
      completedAt: new Date(),
      metrics: {
        technicalAccuracy: techScore,
        communicationClarity: commScore,
        roleRelevance: relevanceScore,
        achievementTags,
      }
    };

    session.history.push(historyEntry);
    session.currentDifficulty = nextDifficulty;
    if (!skipped) {
      session.lastAnswer = answer.trim();
    }

    const user = await User.findById(userId);

    if (user) {
      const xpEarned = Math.round(score * 10);
      user.xp = (user.xp || 0) + xpEarned;
      
      user.securityLogs.push({
        timestamp: new Date(),
        eventType: "INTERVIEW_EVALUATION",
        ipAddress: extractIpAddress(req),
        deviceDetails: parseUserAgent(req.headers["user-agent"] || ""),
        status: skipped ? "WARNING" : "SUCCESS",
        metadata: {
          sessionId: session._id,
          questionId: question._id,
          score,
          technicalAccuracy: techScore,
          communicationClarity: commScore,
          roleRelevance: relevanceScore,
          xpEarned,
        },
      });
      await user.save();
    }

    const questionsAnswered = session.history.length;
    const isComplete = questionsAnswered >= session.totalQuestions;

    if (isComplete) {
      session.status = "completed";
      await session.save();

      const totalSkipped = session.history.filter((h) => h.skipped).length;
      const avgScore =
        session.history.reduce((sum, h) => sum + h.score, 0) / session.history.length;
      const peakDifficulty = Math.max(...session.history.map((h) => h.difficultyAtTime));

      const nonSkippedHistory = session.history.filter((h) => !h.skipped);
      const avgTech = nonSkippedHistory.length > 0
        ? Math.round(nonSkippedHistory.reduce((sum, h) => sum + (h.metrics?.technicalAccuracy || 0), 0) / nonSkippedHistory.length)
        : 0;
      const avgComm = nonSkippedHistory.length > 0
        ? Math.round(nonSkippedHistory.reduce((sum, h) => sum + (h.metrics?.communicationClarity || 0), 0) / nonSkippedHistory.length)
        : 0;
      const avgRelevance = nonSkippedHistory.length > 0
        ? Math.round(nonSkippedHistory.reduce((sum, h) => sum + (h.metrics?.roleRelevance || 0), 0) / nonSkippedHistory.length)
        : 0;

      if (user) {
        user.completedInterviews = (user.completedInterviews || 0) + 1;
        user.leaderboardStanding = Math.max(1, (user.leaderboardStanding || 1000) - Math.round(avgScore * 5));
        
        user.securityLogs.push({
          timestamp: new Date(),
          eventType: "INTERVIEW_COMPLETED",
          ipAddress: extractIpAddress(req),
          deviceDetails: parseUserAgent(req.headers["user-agent"] || ""),
          status: "SUCCESS",
          metadata: {
            sessionId: session._id,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
          },
        });
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Interview complete.",
        data: {
          sessionId: session._id,
          status: "completed",
          analytics: {
            totalQuestions: session.totalQuestions,
            questionsAnswered,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
            finalDifficulty: session.currentDifficulty,
            averageTechnicalAccuracy: avgTech,
            averageCommunicationClarity: avgComm,
            averageRoleRelevance: avgRelevance,
          },
          history: session.history,
        },
      });
    }

    const nextQuestion = await fetchQuestion(nextDifficulty, session.askedQuestionIds);

    if (!nextQuestion) {
      session.status = "completed";
      await session.save();

      const totalSkipped = session.history.filter((h) => h.skipped).length;
      const avgScore =
        session.history.reduce((sum, h) => sum + h.score, 0) / session.history.length;
      const peakDifficulty = Math.max(...session.history.map((h) => h.difficultyAtTime));

      const nonSkippedHistory = session.history.filter((h) => !h.skipped);
      const avgTech = nonSkippedHistory.length > 0
        ? Math.round(nonSkippedHistory.reduce((sum, h) => sum + (h.metrics?.technicalAccuracy || 0), 0) / nonSkippedHistory.length)
        : 0;
      const avgComm = nonSkippedHistory.length > 0
        ? Math.round(nonSkippedHistory.reduce((sum, h) => sum + (h.metrics?.communicationClarity || 0), 0) / nonSkippedHistory.length)
        : 0;
      const avgRelevance = nonSkippedHistory.length > 0
        ? Math.round(nonSkippedHistory.reduce((sum, h) => sum + (h.metrics?.roleRelevance || 0), 0) / nonSkippedHistory.length)
        : 0;

      if (user) {
        user.completedInterviews = (user.completedInterviews || 0) + 1;
        user.leaderboardStanding = Math.max(1, (user.leaderboardStanding || 1000) - Math.round(avgScore * 5));
        await user.save();
      }

      return res.status(200).json({
        success: true,
        message: "Interview complete. No more unique questions available.",
        data: {
          sessionId: session._id,
          status: "completed",
          analytics: {
            totalQuestions: session.totalQuestions,
            questionsAnswered,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
            finalDifficulty: session.currentDifficulty,
            averageTechnicalAccuracy: avgTech,
            averageCommunicationClarity: avgComm,
            averageRoleRelevance: avgRelevance,
          },
          history: session.history,
        },
      });
    }

    session.askedQuestionIds.push(nextQuestion._id);
    await session.save();

    return res.status(200).json({
      success: true,
      message: skipped ? "Question skipped." : "Answer evaluated successfully.",
      data: {
        sessionId: session._id,
        status: "active",
        result: {
          score,
          evaluation: feedback,
          technicalAccuracy: techScore,
          communicationClarity: commScore,
          roleRelevance: relevanceScore,
          achievementTags,
          skipped,
          previousDifficulty: historyEntry.difficultyAtTime,
          newDifficulty: nextDifficulty,
        },
        question: {
          id: nextQuestion._id,
          text: nextQuestion.text,
          topic: nextQuestion.topic,
          difficulty: nextQuestion.difficulty,
        },
        progress: {
          questionNumber: questionsAnswered + 1,
          totalQuestions: session.totalQuestions,
        },
      },
    });
  } catch (error) {
    console.error("[evaluateResponse] Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred during evaluation.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
