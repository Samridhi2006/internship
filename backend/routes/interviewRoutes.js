import express from "express";
import { initSession, submitAnswer, getSession, evaluateResponse } from "../controllers/interviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply route guard authentication
router.use(protect);

router.post("/start", initSession);
router.post("/submit-answer", submitAnswer);
router.post("/evaluate", evaluateResponse);
router.get("/:sessionId", getSession);

export default router;
