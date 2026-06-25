const ArenaProgress = require('../models/ArenaProgress');

// Predefined challenges configuration matching the frontend
const CHALLENGES = {
  c1: { xp: 480, category: 'Technical', difficulty: 'Elite', type: 'mcq', answer: 0 },
  c2: { xp: 220, category: 'HR', difficulty: 'Adept', type: 'text' },
  c3: { xp: 140, category: 'Aptitude', difficulty: 'Novice', type: 'mcq', answer: 0 },
  c4: { xp: 650, category: 'Domain', difficulty: 'Apex', type: 'text' },
  c5: { xp: 320, category: 'Technical', difficulty: 'Adept', type: 'text' },
  c6: { xp: 280, category: 'HR', difficulty: 'Elite', type: 'text' },
  c7: { xp: 180, category: 'Aptitude', difficulty: 'Adept', type: 'mcq', answer: 1 },
  c8: { xp: 420, category: 'Domain', difficulty: 'Elite', type: 'text' }
};

// Default AI peers to populate the competitive leaderboard
const DEFAULT_PEERS = [
  { name: 'Aryan Mehta', avatar: 'AM', xp: 12840, tier: 'Cyber Master I', streak: 31, color: '#ff3cac', isMock: true },
  { name: 'Riya Sharma', avatar: 'RS', xp: 12210, tier: 'Code Sentinel II', streak: 28, color: '#00e5ff', isMock: true },
  { name: 'Dev Kapoor', avatar: 'DK', xp: 11750, tier: 'Data Phantom III', streak: 19, color: '#a855f7', isMock: true },
  { name: 'Priya Nair', avatar: 'PN', xp: 10340, tier: 'Net Runner II', streak: 14, color: '#f472b6', isMock: true },
  { name: 'Karan Gupta', avatar: 'KG', xp: 9870, tier: 'Code Sentinel II', streak: 11, color: '#00e5ff', isMock: true },
  { name: 'Anjali Verma', avatar: 'AV', xp: 9210, tier: 'Data Phantom III', streak: 8, color: '#a855f7', isMock: true },
  { name: 'Rahul Singh', avatar: 'RS', xp: 8650, tier: 'Circuit Wraith I', streak: 16, color: '#22d3ee', isMock: true }
];

// Helper to determine rank/tier title based on XP
function calculateTier(xp) {
  if (xp >= 15000) return 'Cyber Master I';
  if (xp >= 12000) return 'Code Sentinel II';
  if (xp >= 11000) return 'Data Phantom III';
  if (xp >= 10000) return 'Circuit Wraith I';
  if (xp >= 8000) return 'Net Runner II';
  if (xp >= 5000) return 'Tech Prodigy';
  return 'Bronze';
}

// Fetch or initialize user progress state
exports.fetchOrInitializeStatus = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    let progress = await ArenaProgress.findOne({ userId });

    if (!progress) {
      // Create default progress values matching telemetry UI defaults
      progress = new ArenaProgress({
        userId,
        streak: 22,
        totalXP: 10920,
        winRate: 78,
        wins: 39,
        losses: 11,
        activeRank: 'Circuit Wraith I',
        completedChallengeIds: []
      });
      await progress.save();
    }

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error in fetchOrInitializeStatus:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Receive challenge response, run simulated sandbox compiling, and update stats
exports.submitChallenge = async (req, res) => {
  try {
    const { userId, challengeId, response } = req.body;

    if (!userId || !challengeId) {
      return res.status(400).json({ success: false, message: 'userId and challengeId are required' });
    }

    const challenge = CHALLENGES[challengeId];
    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Challenge configuration not found' });
    }

    let progress = await ArenaProgress.findOne({ userId });
    if (!progress) {
      progress = new ArenaProgress({
        userId,
        streak: 22,
        totalXP: 10920,
        winRate: 78,
        wins: 39,
        losses: 11,
        activeRank: 'Circuit Wraith I',
        completedChallengeIds: []
      });
    }

    // Check if challenge is already completed
    if (progress.completedChallengeIds.includes(challengeId)) {
      return res.status(400).json({ success: false, message: 'Challenge already completed' });
    }

    let isCorrect = false;
    let wordCount = 0;
    let compileLogs = [];

    if (challenge.type === 'mcq') {
      const selectedIndex = parseInt(response, 10);
      isCorrect = (selectedIndex === challenge.answer);
      compileLogs = isCorrect 
        ? ['Validation successful: MCQ choice is correct.'] 
        : ['Validation failed: MCQ choice is incorrect.'];
    } else {
      // Text response / code sandbox simulation
      const textResponse = String(response || '');
      wordCount = textResponse.trim().split(/\s+/).filter(Boolean).length;
      
      // Simulate compiler logs
      compileLogs.push('tcs_compiler: Compiling entry_point.cpp...');
      compileLogs.push('Checking dependency trees... OK');

      if (wordCount >= 10) {
        isCorrect = true;
        compileLogs.push('Test Case 1 / 3: Passed [Runtime: 14ms]');
        compileLogs.push('Test Case 2 / 3: Passed [Runtime: 11ms]');
        compileLogs.push('Test Case 3 / 3: Passed [Runtime: 9ms]');
        compileLogs.push('Success: 100% Test Cases Passed!');
      } else {
        isCorrect = false;
        compileLogs.push('Test Case 1 / 3: Failed [Syntax Error: Expected more technical detail]');
        compileLogs.push('Test Case 2 / 3: Skipped');
        compileLogs.push('Test Case 3 / 3: Skipped');
        compileLogs.push('Compilation Failure: Response is too short (Minimum 10 words required).');
      }
    }

    const earnedXP = isCorrect ? challenge.xp : Math.floor(challenge.xp * 0.2);

    // Update progress state
    if (isCorrect) {
      progress.completedChallengeIds.push(challengeId);
      progress.wins += 1;
      progress.streak += 1;
    } else {
      progress.losses += 1;
      // Option to reset streak on loss, but in mock games we can keep streak going or deduct
    }

    progress.totalXP += earnedXP;
    
    const totalMatches = progress.wins + progress.losses;
    progress.winRate = totalMatches > 0 ? Math.round((progress.wins / totalMatches) * 100) : 0;
    progress.activeRank = calculateTier(progress.totalXP);

    await progress.save();

    res.json({
      success: true,
      isCorrect,
      earnedXP,
      compileLogs,
      performance: {
        runtime: isCorrect ? `${Math.floor(Math.random() * 8) + 8}ms` : '0ms',
        wordCount,
        testPassRate: isCorrect ? '3/3 Passed' : '0/3 Passed'
      },
      progress
    });

  } catch (error) {
    console.error('Error in submitChallenge:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Fetch dynamic leaderboards sorted with live user ranks
exports.getLeaderboard = async (req, res) => {
  try {
    // Fetch all records from database
    const dbUsers = await ArenaProgress.find().lean();
    
    // Format db users for leaderboard list
    const formattedDbUsers = dbUsers.map(user => ({
      name: 'You (Samridhi T.)',
      avatar: 'ST',
      xp: user.totalXP,
      tier: user.activeRank,
      streak: user.streak,
      color: '#22d3ee',
      isUser: true
    }));

    // Merge DB users with our default AI contestants
    let leaderboard = [...formattedDbUsers];
    
    // Add default peers that are not duplicates
    DEFAULT_PEERS.forEach(peer => {
      // Simple check to make sure we don't duplicate
      if (!leaderboard.some(l => l.name === peer.name)) {
        leaderboard.push(peer);
      }
    });

    // If no users in DB yet, make sure the user is still in the leaderboard
    if (!leaderboard.some(l => l.isUser)) {
      leaderboard.push({
        name: 'You (Samridhi T.)',
        avatar: 'ST',
        xp: 10920,
        tier: 'Circuit Wraith I',
        streak: 22,
        color: '#22d3ee',
        isUser: true
      });
    }

    // Sort by XP descending
    leaderboard.sort((a, b) => b.xp - a.xp);

    // Assign rank and previous rank (prev is rank + or - a small random factor to show active changes)
    leaderboard = leaderboard.map((item, idx) => {
      const rank = idx + 1;
      let prev = rank;
      if (item.isUser) {
        // Mock a change in rank
        prev = rank + 3; 
      } else {
        // Small random historical ranks
        prev = Math.max(1, rank + (Math.random() > 0.5 ? 1 : -1));
      }
      return {
        id: idx,
        name: item.name,
        avatar: item.avatar,
        rank,
        prev,
        xp: item.xp,
        tier: item.tier,
        streak: item.streak,
        color: item.color,
        isUser: item.isUser || false
      };
    });

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
