/**
 * placementRoutes.js
 * Express router for the AI Placement Readiness Engine (Task 2).
 *
 * Mount: /api/readiness
 *
 * Routes:
 *   POST  /evaluate          — run full composite readiness evaluation
 *   GET   /history/:userId   — fetch user's evaluation history for trend graphs
 *   GET   /assessments       — platform-wide skill diagnostics aggregates
 *   POST  /resume            — parse resume text and extract entities
 */

import express from "express";
import {
  evaluatePlacementReadiness,
  getEvaluationHistory,
  getSkillDiagnosticsAggregates,
  parseResume,
} from "../controllers/placementController.js";

const router = express.Router();

// NOTE: These routes intentionally do not require JWT protect middleware
// so they remain functional with failsafe in-memory JWT sessions.
// In a production deployment, add: router.use(protect);

router.post("/evaluate", evaluatePlacementReadiness);
router.get("/history/:userId", getEvaluationHistory);
router.get("/assessments", getSkillDiagnosticsAggregates);
router.post("/resume", parseResume);

export default router;
