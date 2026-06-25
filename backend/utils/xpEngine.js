const RANKS = ['Initiate', 'Code Sentinel', 'Logic Warden', 'Cyber Master', 'Arena Grandmaster'];

const RANK_THRESHOLDS = {
  'Initiate': 0,
  'Code Sentinel': 3000,
  'Logic Warden': 8000,
  'Cyber Master': 12000,
  'Arena Grandmaster': 20000
};

function rankForXp(xp) {
  if (xp < 3000) return 'Initiate';
  if (xp < 8000) return 'Code Sentinel';
  if (xp < 12000) return 'Logic Warden';
  if (xp < 20000) return 'Cyber Master';
  return 'Arena Grandmaster';
}

function nextRankInfo(xp) {
  const current = rankForXp(xp);
  const currentIndex = RANKS.indexOf(current);
  
  if (currentIndex === RANKS.length - 1) {
    return {
      nextRank: null,
      xpToNext: 0,
      progress: 1.0
    };
  }

  const nextRank = RANKS[currentIndex + 1];
  const nextThreshold = RANK_THRESHOLDS[nextRank];
  const currentThreshold = RANK_THRESHOLDS[current];
  
  const range = nextThreshold - currentThreshold;
  const progressInRange = xp - currentThreshold;
  const progress = Math.min(Math.max(progressInRange / range, 0), 1.0);
  const xpToNext = nextThreshold - xp;

  return {
    nextRank,
    xpToNext,
    progress
  };
}

function computeXpAward(challenge, isCorrect) {
  if (!isCorrect) {
    // 20% partial credit
    return Math.floor(challenge.xpValue * 0.2);
  }
  return challenge.xpValue;
}

function applyStreakCompletion(progress, xpEarned) {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Initialize history if empty
  if (!progress.streakHistory) {
    progress.streakHistory = [];
  }

  // Find if today already has an entry
  let todayEntry = progress.streakHistory.find(d => d.date === todayStr);

  if (todayEntry) {
    if (!todayEntry.completed) {
      todayEntry.completed = true;
      todayEntry.xpEarned = xpEarned;
      updateStreakCount(progress, todayStr, yesterdayStr);
    } else {
      todayEntry.xpEarned += xpEarned;
    }
  } else {
    todayEntry = { date: todayStr, completed: true, xpEarned: xpEarned };
    progress.streakHistory.push(todayEntry);
    updateStreakCount(progress, todayStr, yesterdayStr);
  }

  // Sort and keep only the last 7 days for frontend sparkbar telemetry
  progress.streakHistory.sort((a, b) => a.date.localeCompare(b.date));
  if (progress.streakHistory.length > 7) {
    progress.streakHistory = progress.streakHistory.slice(-7);
  }
}

function updateStreakCount(progress, todayStr, yesterdayStr) {
  const completedDates = progress.streakHistory
    .filter(d => d.completed)
    .map(d => d.date);

  const wasYesterdayCompleted = completedDates.includes(yesterdayStr);

  if (wasYesterdayCompleted) {
    progress.currentStreak += 1;
  } else {
    // If yesterday wasn't completed and today is completed, streak is reset to 1
    progress.currentStreak = 1;
  }

  if (progress.currentStreak > progress.longestStreak) {
    progress.longestStreak = progress.currentStreak;
  }
}

export {
  rankForXp,
  nextRankInfo,
  computeXpAward,
  applyStreakCompletion
};
