const BADGES = [
  { id: 'b1', name: 'Consistency King', description: 'Maintain a 30-day active streak', tier: 'Gold', icon: 'flame', progress: 0.73, unlocked: false, unlockedAt: null },
  { id: 'b2', name: 'STAR Method Master', description: 'Submit 20 perfect STAR responses', tier: 'Gold', icon: 'star', progress: 0.15, unlocked: false, unlockedAt: null },
  { id: 'b3', name: 'System Overlord', description: 'Ace 10 system design challenges', tier: 'Gold', icon: 'shield', progress: 0.4, unlocked: false, unlockedAt: null },
  { id: 'b4', name: 'Apex Predator', description: 'Rank #1 globally for 7 consecutive days', tier: 'Platinum', icon: 'crown', progress: 0, unlocked: false, unlockedAt: null },
  { id: 'b5', name: 'Code Phantom', description: 'Solve 50 elite-tier coding challenges', tier: 'Silver', icon: 'sword', progress: 0.12, unlocked: false, unlockedAt: null },
  { id: 'b6', name: 'Neural Architect', description: 'Complete all ML domain challenges', tier: 'Silver', icon: 'blueprint', progress: 0, unlocked: false, unlockedAt: null },
  { id: 'b7', name: 'Speed Demon', description: 'Finish 5 challenges in under 2 minutes', tier: 'Bronze', icon: 'target', progress: 1.0, unlocked: true, unlockedAt: new Date().toISOString() },
  { id: 'b8', name: 'Iron Will', description: 'Return after a 7-day absence and win', tier: 'Bronze', icon: 'gem', progress: 0, unlocked: false, unlockedAt: null },
  { id: 'b9', name: 'The Untouchable', description: 'Win 20 peer challenges without a loss', tier: 'Platinum', icon: 'trophy', progress: 0.25, unlocked: false, unlockedAt: null },
];

function evaluateNewlyUnlockedBadges(progress, challenge, evaluationResult) {
  const newlyUnlocked = [];
  
  if (!progress.badgeVault || progress.badgeVault.length === 0) {
    progress.badgeVault = JSON.parse(JSON.stringify(BADGES));
  }

  progress.badgeVault.forEach((badge) => {
    if (badge.unlocked) return;

    if (badge.id === 'b1') {
      badge.progress = Math.min(progress.currentStreak / 30, 1);
      if (badge.progress >= 1) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        newlyUnlocked.push(badge);
      }
    }

    if (badge.id === 'b2') {
      const hrCount = progress.completedChallengeIds ? progress.completedChallengeIds.filter(id => id.includes('c2') || id.includes('c6')).length : 0;
      badge.progress = Math.min(hrCount / 20, 1);
      if (badge.progress >= 1) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        newlyUnlocked.push(badge);
      }
    }

    if (badge.id === 'b3') {
      const techCount = progress.completedChallengeIds ? progress.completedChallengeIds.filter(id => id.includes('c1') || id.includes('c5')).length : 0;
      badge.progress = Math.min(techCount / 10, 1);
      if (badge.progress >= 1) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        newlyUnlocked.push(badge);
      }
    }

    if (badge.id === 'b5') {
      const totalCount = progress.completedChallengeIds ? progress.completedChallengeIds.length : 0;
      badge.progress = Math.min(totalCount / 50, 1);
      if (badge.progress >= 1) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        newlyUnlocked.push(badge);
      }
    }

    if (badge.id === 'b9') {
      badge.progress = Math.min(progress.wins / 20, 1);
      if (badge.progress >= 1 && progress.losses === 0) {
        badge.unlocked = true;
        badge.unlockedAt = new Date().toISOString();
        newlyUnlocked.push(badge);
      }
    }
  });

  return newlyUnlocked;
}

export { BADGES, evaluateNewlyUnlockedBadges };
