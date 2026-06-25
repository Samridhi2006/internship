import mongoose from 'mongoose';

const CATEGORIES = ['Technical', 'Domain', 'Aptitude', 'HR'];
const DIFFICULTIES = ['Novice', 'Adept', 'Elite', 'Apex'];
const RANKS = ['Initiate', 'Code Sentinel', 'Logic Warden', 'Cyber Master', 'Arena Grandmaster'];

const TestCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  hidden: { type: Boolean, default: false },
  explanation: { type: String }
}, { _id: false });

const ChallengeSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  category: { type: String, enum: CATEGORIES, required: true },
  difficulty: { type: String, enum: DIFFICULTIES, required: true },
  xpValue: { type: Number, required: true },
  problemStatement: { type: String, required: true },
  inputFormat: { type: String },
  outputFormat: { type: String },
  boilerplate: { type: String },
  constraints: [{ type: String }],
  testCases: [TestCaseSchema],
  mcqOptions: [{ type: String }],
  correctAnswerIndex: { type: Number },
  behavioralPrompt: { type: String }
}, { timestamps: true });

// Schema Methods
ChallengeSchema.methods.isMcq = function() {
  return this.category === 'Aptitude';
};

ChallengeSchema.methods.isStar = function() {
  return this.category === 'HR';
};

const StreakHistoryDaySchema = new mongoose.Schema({
  date: { type: String, required: true },
  completed: { type: Boolean, default: false },
  xpEarned: { type: Number, default: 0 }
}, { _id: false });

const BadgeProgressSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  tier: { type: String, required: true },
  icon: { type: String, required: true },
  unlocked: { type: Boolean, default: false },
  unlockedAt: { type: Date },
  progress: { type: Number, default: 0 }
}, { _id: false });

const UserProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  avatarSeed: { type: String, default: 'ST' },
  xp: { type: Number, default: 10920 },
  rankName: { type: String, enum: RANKS, default: 'Logic Warden' },
  currentStreak: { type: Number, default: 22 },
  longestStreak: { type: Number, default: 22 },
  streakHistory: { type: [StreakHistoryDaySchema], default: [] },
  wins: { type: Number, default: 39 },
  losses: { type: Number, default: 11 },
  completedChallengeIds: [{ type: String }],
  badgeVault: { type: [BadgeProgressSchema], default: [] }
}, { timestamps: true });

// Schema Methods
UserProgressSchema.methods.winRate = function() {
  const total = this.wins + this.losses;
  if (total === 0) return 0;
  return Math.round((this.wins / total) * 100);
};

const Challenge = mongoose.models.Challenge || mongoose.model('Challenge', ChallengeSchema);
const UserProgress = mongoose.models.UserProgress || mongoose.model('UserProgress', UserProgressSchema);

export {
  Challenge,
  UserProgress,
  CATEGORIES,
  DIFFICULTIES,
  RANKS
};
