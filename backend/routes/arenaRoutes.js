import express from 'express';
const router = express.Router();
import * as arenaController from '../controllers/arenaController.js';

router.post('/status', arenaController.getStatus);
router.get('/status', arenaController.getStatus); // support both GET/POST status
router.get('/challenges', arenaController.listChallenges);
router.post('/submit', arenaController.submitSolution);
router.get('/leaderboard', arenaController.getLeaderboard);
router.post('/generate', arenaController.generateChallenges);

export default router;
