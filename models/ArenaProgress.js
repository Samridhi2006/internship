const mongoose = require('mongoose');

const ArenaProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  streak: {
    type: Number,
    default: 22
  },
  completedChallengeIds: {
    type: [String],
    default: []
  },
  totalXP: {
    type: Number,
    default: 10920
  },
  winRate: {
    type: Number,
    default: 78
  },
  wins: {
    type: Number,
    default: 39
  },
  losses: {
    type: Number,
    default: 11
  },
  activeRank: {
    type: String,
    default: 'Circuit Wraith I'
  }
}, { timestamps: true });

module.exports = mongoose.models.ArenaProgress || mongoose.model('ArenaProgress', ArenaProgressSchema);
