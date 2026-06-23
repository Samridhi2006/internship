const express = require('express');
const router = express.Router();
const { startRecruiterSession, submitAnswer } = require('../controllers/recruiterController');

// ─── NEXT.JS FRONTEND COMPATIBLE ROUTES ───
// These match the fetch calls inside your app/recruiter/page.tsx file
router.post('/session/start', startRecruiterSession);
router.post('/session/chat', submitAnswer);

// ─── ANTIGRAVITY FALLBACK ROUTES ───
// These ensure absolute safety if your client routes get shortened
router.post('/start', startRecruiterSession);
router.post('/answer', submitAnswer);

module.exports = router;
