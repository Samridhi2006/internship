import { Challenge, UserProgress } from '../models/Arena.js';
import { evaluateStarResponse, generateChallenges as genChallenges } from '../services/groqService.js';
import { runTestSuite, buildTerminalTrace } from '../services/judgeService.js';
import { rankForXp, nextRankInfo, computeXpAward, applyStreakCompletion } from '../utils/xpEngine.js';
import { evaluateNewlyUnlockedBadges, BADGES } from '../config/badges.js';

// Fetch or initialize user progress state
export async function getStatus(req, res, next) {
  try {
    const userId = req.query.userId || req.body.userId;
    const displayName = req.query.displayName || req.body.displayName || 'Samridhi T.';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId parameter is required' });
    }

    let progress = await UserProgress.findOne({ userId });

    if (!progress) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const dayBeforeStr = new Date(Date.now() - 172800000).toISOString().split('T')[0];

      // Seed default values matching telemetry defaults
      progress = new UserProgress({
        userId,
        displayName,
        avatarSeed: 'ST',
        xp: 10920,
        rankName: 'Logic Warden',
        currentStreak: 22,
        longestStreak: 22,
        streakHistory: [
          { date: dayBeforeStr, completed: true, xpEarned: 220 },
          { date: yesterdayStr, completed: true, xpEarned: 150 },
          { date: todayStr, completed: false, xpEarned: 0 }
        ],
        wins: 39,
        losses: 11,
        completedChallengeIds: [],
        badgeVault: JSON.parse(JSON.stringify(BADGES))
      });
      await progress.save();
    }

    const rankInfo = nextRankInfo(progress.xp);
    const winRateVal = progress.winRate();

    // Send structure matching frontend HUDState
    res.json({
      xp: progress.xp,
      rankName: progress.rankName,
      nextRank: rankInfo.nextRank,
      xpToNext: rankInfo.xpToNext,
      progress: rankInfo.progress,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      streakHistory: progress.streakHistory,
      wins: progress.wins,
      losses: progress.losses,
      winRate: winRateVal,
      globalPosition: 4, // Default telemetry rank position
      positionDelta: 3,
      displayName: progress.displayName,
      badgeVault: progress.badgeVault,
      completedChallengeIds: progress.completedChallengeIds
    });

  } catch (error) {
    next(error);
  }
};

// List challenges by category, marking completed items for this user
export async function listChallenges(req, res, next) {
  try {
    const { category, userId } = req.query;
    if (!category) {
      return res.status(400).json({ success: false, error: 'category query parameter is required' });
    }

    let challenges = await Challenge.find({ category }).lean();

    // Auto-seed if DB is empty
    if (challenges.length === 0) {
      const generated = await generateChallenges(category);
      if (generated && generated.length > 0) {
        const saved = await Challenge.insertMany(generated);
        challenges = saved.map(c => c.toObject());
      }
    }

    if (userId) {
      const progress = await UserProgress.findOne({ userId });
      if (progress) {
        challenges.forEach(challenge => {
          challenge.isCompleted = progress.completedChallengeIds.includes(challenge._id.toString());
        });
      }
    }

    res.json({ success: true, challenges });
  } catch (error) {
    next(error);
  }
};

// Evaluate challenge submission and update user progress metrics
export async function submitSolution(req, res, next) {
  try {
    const { challengeId, userId, submissionType, payload, dryRun } = req.body;

    if (!challengeId || !userId || !submissionType || !payload) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: challengeId, userId, submissionType, payload' });
    }

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    let progress = await UserProgress.findOne({ userId });
    if (!progress) {
      progress = new UserProgress({
        userId,
        displayName: req.body.displayName || 'Samridhi T.',
        completedChallengeIds: [],
        badgeVault: JSON.parse(JSON.stringify(BADGES))
      });
    }

    const alreadyCompleted = progress.completedChallengeIds.includes(challengeId);

    let isCorrect = false;
    let terminalTrace = [];
    let xpAwarded = 0;

    if (submissionType === 'mcq') {
      const selectedIndex = Number(payload.selectedIndex);
      isCorrect = (selectedIndex === challenge.correctAnswerIndex);
      terminalTrace = [
        { type: 'cmd', text: `$ evaluate mcq --option=${selectedIndex}` },
        { type: isCorrect ? 'ok' : 'fail', text: isCorrect ? 'Verdict: CORRECT CHOICE.' : 'Verdict: INCORRECT CHOICE.' }
      ];
    } else if (submissionType === 'star') {
      const responseText = String(payload.responseText || '');
      const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length;

      if (wordCount < 10) {
        return res.status(400).json({ success: false, error: 'STAR Response is too short. Minimum 10 words required.' });
      }

      // LLM Grader Call
      const grading = await evaluateStarResponse(challenge.problemStatement, responseText);
      isCorrect = grading.meetsStandards;
      terminalTrace = [
        { type: 'cmd', text: `$ analyze star-framework --words=${wordCount}` },
        { type: 'info', text: `LLM Score: ${grading.score}/100` },
        { type: isCorrect ? 'ok' : 'warn', text: grading.explanation }
      ];
    } else if (submissionType === 'code') {
      const source = String(payload.source || '');
      // VM Compiler sandbox call
      const results = runTestSuite(source, challenge.testCases);
      isCorrect = results.every(r => r.passed);
      terminalTrace = buildTerminalTrace(results);
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported submissionType' });
    }

    if (dryRun) {
      return res.json({
        success: true,
        isCorrect,
        xpAwarded: 0,
        terminalTrace,
        newlyUnlockedBadges: [],
        currentRank: progress.rankName
      });
    }

    xpAwarded = computeXpAward(challenge, isCorrect);

    // Save metrics if correct
    if (isCorrect) {
      if (!alreadyCompleted) {
        progress.completedChallengeIds.push(challengeId);
        progress.wins += 1;
        applyStreakCompletion(progress, xpAwarded);
      } else {
        xpAwarded = 0; // +0 XP practice allocation
      }
    } else {
      progress.losses += 1;
    }

    progress.xp += xpAwarded;
    progress.rankName = rankForXp(progress.xp);

    // Evaluate badge unlock triggers
    const newlyUnlockedBadges = evaluateNewlyUnlockedBadges(progress, challenge, { isCorrect, alreadyCompleted });

    await progress.save();

    res.json({
      success: true,
      isCorrect,
      xpAwarded,
      terminalTrace,
      newlyUnlockedBadges,
      currentRank: progress.rankName
    });


  } catch (error) {
    next(error);
  }
};

// Get leaderboard rankings merging live DB contestants & default peers
export async function getLeaderboard(req, res, next) {
  try {
    const dbUsers = await UserProgress.find().lean();
    
    // Default mock peers matching visual tier specifications
    const MOCK_PEERS = [
      { userId: 'peer1', displayName: 'Aryan Mehta', avatarSeed: 'AM', xp: 12840, rankName: 'Cyber Master', currentStreak: 31, wins: 45, losses: 10, winRate: 81, badgeCount: 4 },
      { userId: 'peer2', displayName: 'Riya Sharma', avatarSeed: 'RS', xp: 12210, rankName: 'Cyber Master', currentStreak: 28, wins: 41, losses: 12, winRate: 77, badgeCount: 3 },
      { userId: 'peer3', displayName: 'Dev Kapoor', avatarSeed: 'DK', xp: 11750, rankName: 'Logic Warden', currentStreak: 19, wins: 38, losses: 15, winRate: 71, badgeCount: 5 },
      { userId: 'peer4', displayName: 'Priya Nair', avatarSeed: 'PN', xp: 10340, rankName: 'Logic Warden', currentStreak: 14, wins: 30, losses: 11, winRate: 73, badgeCount: 2 },
      { userId: 'peer5', displayName: 'Karan Gupta', avatarSeed: 'KG', xp: 9870, rankName: 'Code Sentinel', currentStreak: 11, wins: 28, losses: 14, winRate: 66, badgeCount: 3 },
      { userId: 'peer6', displayName: 'Anjali Verma', avatarSeed: 'AV', xp: 9210, rankName: 'Code Sentinel', currentStreak: 8, wins: 24, losses: 12, winRate: 66, badgeCount: 2 },
      { userId: 'peer7', displayName: 'Rahul Singh', avatarSeed: 'RS', xp: 8650, rankName: 'Code Sentinel', currentStreak: 16, wins: 22, losses: 16, winRate: 57, badgeCount: 1 }
    ];

    const contestants = dbUsers.map(user => ({
      userId: user.userId,
      displayName: user.displayName,
      avatarSeed: user.avatarSeed,
      xp: user.xp,
      rankName: user.rankName,
      currentStreak: user.currentStreak,
      wins: user.wins,
      losses: user.losses,
      winRate: Math.round((user.wins / ((user.wins + user.losses) || 1)) * 100),
      badgeCount: user.badgeVault ? user.badgeVault.filter(b => b.unlocked).length : 0,
      isUser: true
    }));

    // Merge databases
    const merged = [...contestants];
    MOCK_PEERS.forEach(peer => {
      if (!merged.some(u => u.displayName === peer.displayName)) {
        merged.push(peer);
      }
    });

    // Sort by XP
    merged.sort((a, b) => b.xp - a.xp);

    // Assign ranking positions
    const leaderboard = merged.map((user, index) => {
      const position = index + 1;
      // positionDelta tells user if they rose or fell rank standing
      const positionDelta = user.isUser ? 3 : (Math.random() > 0.6 ? 1 : 0);
      return {
        userId: user.userId,
        displayName: user.displayName,
        avatarSeed: user.avatarSeed,
        xp: user.xp,
        rankName: user.rankName,
        position,
        positionDelta,
        currentStreak: user.currentStreak,
        wins: user.wins,
        losses: user.losses,
        winRate: user.winRate,
        badgeCount: user.badgeCount,
        isUser: user.isUser || false
      };
    });

    res.json({ success: true, leaderboard });
  } catch (error) {
    next(error);
  }
};

// Manually trigger Groq challenge generator
export async function generateChallenges(req, res, next) {
  try {
    let category = req.body.category;
    if (!category && Array.isArray(req.body.categories) && req.body.categories.length > 0) {
      category = req.body.categories[0];
    }

    if (!category) {
      return res.status(400).json({ success: false, error: 'category or categories is required in body' });
    }

    const challenges = await genChallenges(category);
    if (challenges && challenges.length > 0) {
      const saved = await Challenge.insertMany(challenges);
      return res.json({ success: true, count: saved.length, createdCount: saved.length, challenges: saved });
    }

    res.status(500).json({ success: false, error: 'Challenge generation failed.' });
  } catch (error) {
    next(error);
  }
};
