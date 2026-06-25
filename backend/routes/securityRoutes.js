import express from "express";
import { getActiveSessions, revokeSession, revokeAllOtherSessions, getSecurityLogs, getSecuritySummary } from "../controllers/securityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/sessions", getActiveSessions);
router.delete("/sessions/:sessionId", revokeSession);
router.delete("/sessions/other", revokeAllOtherSessions);
router.get("/logs", getSecurityLogs);
router.get("/summary", getSecuritySummary);

export default router;
