/**
 * placementRoutes.js — Express Router
 * AI Placement Readiness Engine
 *
 * Mounts the two placement controller endpoints:
 *   POST /api/placement/evaluate
 *   GET  /api/placement/history/:userId
 */

const express = require("express");
const router = express.Router();

const {
  evaluatePlacement,
  getPlacementHistory,
} = require("../controllers/placementController");

// POST /api/placement/evaluate
router.post("/evaluate", evaluatePlacement);

// GET /api/placement/history/:userId
router.get("/history/:userId", getPlacementHistory);

module.exports = router;
