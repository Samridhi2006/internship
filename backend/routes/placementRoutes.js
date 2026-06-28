/**
 * placementRoutes.js
 * Express router for the AI Placement Readiness Engine (Task 2).
 *
 * Mount: /api/readiness  (also aliased to /api/placement in server.js)
 *
 * Routes:
 *   POST  /evaluate              — run full composite readiness evaluation
 *   GET   /history/:userId       — fetch user's evaluation history for trend graphs
 *   GET   /assessments           — platform-wide skill diagnostics aggregates
 *   POST  /resume                — parse resume TEXT and extract entities
 *   POST  /resume/upload         — parse resume PDF BINARY (multipart/form-data)
 */

import express from "express";
import multer from "multer";
import {
  evaluatePlacementReadiness,
  getEvaluationHistory,
  getSkillDiagnosticsAggregates,
  parseResume,
  parsePdfFile,
} from "../controllers/placementController.js";

const router = express.Router();

// Multer: store PDF in memory buffer (max 10 MB), PDF only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted for binary resume upload."), false);
    }
  },
});

// NOTE: These routes intentionally do not require JWT protect middleware
// so they remain functional with failsafe in-memory JWT sessions.

router.post("/evaluate", evaluatePlacementReadiness);
router.get("/history/:userId", getEvaluationHistory);
router.get("/assessments", getSkillDiagnosticsAggregates);
router.post("/resume", parseResume);                                 // text-based
router.post("/resume/upload", upload.single("resume"), parsePdfFile); // binary PDF

// Handle multer errors cleanly
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes("PDF")) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

export default router;
