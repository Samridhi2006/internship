import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['recruiter', 'candidate'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const FeedbackParametersSchema = new mongoose.Schema({
  technicalDepth: { type: String, default: '' },
  problemSolving: { type: String, default: '' },
  communication: { type: String, default: '' },
  cultureFit: { type: String, default: '' }
}, { _id: false });

const EvaluationSchema = new mongoose.Schema({
  overallScore: { type: Number, min: 0, max: 100 },
  meetsExpectedStandards: { type: Boolean },
  hiringDecision: { type: String },
  feedbackParameters: { type: FeedbackParametersSchema, default: () => ({}) },
  detailedFeedback: { type: String }
}, { _id: false });

const RecruiterSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  companyName: {
    type: String,
    enum: ['Google', 'Amazon', 'Microsoft', 'TCS', 'Infosys', 'Startup'],
    required: true
  },
  jobRole: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  conversationHistory: {
    type: [MessageSchema],
    default: []
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 5
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  evaluation: {
    type: EvaluationSchema,
    default: null
  }
}, { timestamps: true });

export default mongoose.models.RecruiterSession || mongoose.model('RecruiterSession', RecruiterSessionSchema);
