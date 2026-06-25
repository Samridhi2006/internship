import mongoose from "mongoose";

const HistoryEntrySchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    answer: { type: String, default: null },
    score: { type: Number, min: 0, max: 10, default: 0 },
    evaluation: { type: String, default: "" },
    difficultyAtTime: { type: Number, min: 1, max: 5 },
    skipped: { type: Boolean, default: false },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const InterviewSessionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      trim: true,
      index: true,
    },
    currentDifficulty: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    askedQuestionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    history: {
      type: [HistoryEntrySchema],
      default: [],
    },
    lastAnswer: {
      type: String,
      default: null,
    },
    totalQuestions: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "interview_sessions",
  }
);

InterviewSessionSchema.virtual("questionsAnswered").get(function () {
  return this.history.length;
});

InterviewSessionSchema.virtual("averageScore").get(function () {
  if (!this.history.length) return 0;
  const total = this.history.reduce((sum, h) => sum + h.score, 0);
  return parseFloat((total / this.history.length).toFixed(2));
});

InterviewSessionSchema.virtual("totalSkipped").get(function () {
  return this.history.filter((h) => h.skipped).length;
});

InterviewSessionSchema.virtual("peakDifficulty").get(function () {
  if (!this.history.length) return 1;
  return Math.max(...this.history.map((h) => h.difficultyAtTime));
});

InterviewSessionSchema.set("toJSON", { virtuals: true });
InterviewSessionSchema.set("toObject", { virtuals: true });

const InterviewSession = mongoose.model("InterviewSession", InterviewSessionSchema);
export default InterviewSession;
