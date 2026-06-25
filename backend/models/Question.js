import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Question text is required."],
      trim: true,
      unique: true,
    },
    difficulty: {
      type: Number,
      required: [true, "Difficulty level is required."],
      min: [1, "Minimum difficulty is 1."],
      max: [5, "Maximum difficulty is 5."],
      index: true,
    },
    topic: {
      type: String,
      trim: true,
      default: "General",
    },
    expectedKeywords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "questions",
  }
);

QuestionSchema.index({ difficulty: 1, _id: 1 });

const Question = mongoose.model("Question", QuestionSchema);
export default Question;
