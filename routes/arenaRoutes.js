const express = require('express');
const router = express.Router();
const { fetchOrInitializeStatus, submitChallenge, getLeaderboard } = require('../controllers/arenaController');

router.post('/status', fetchOrInitializeStatus);
router.post('/submit', submitChallenge);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
