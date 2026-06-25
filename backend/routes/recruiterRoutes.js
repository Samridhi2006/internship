import express from 'express';
import { startRecruiterSession, submitAnswer } from '../controllers/recruiterController.js';

const router = express.Router();

// ─── NEXT.JS FRONTEND COMPATIBLE ROUTES ───
// These match the fetch calls inside your app/recruiter/page.tsx file
router.post('/session/start', startRecruiterSession);
router.post('/session/chat', submitAnswer);

// ─── ANTIGRAVITY FALLBACK ROUTES ───
// These ensure absolute safety if your client routes get shortened
router.post('/start', startRecruiterSession);
router.post('/answer', submitAnswer);

export default router;
