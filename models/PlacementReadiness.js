/**
 * PlacementReadiness.js — Mongoose Model
 * AI Placement Readiness Engine
 *
 * Stores candidate evaluation data: scores, AI-generated evaluation,
 * readiness classification, and personalized roadmap.
 */

const mongoose = require("mongoose");

const { Schema, model, models } = mongoose;

const PlacementReadinessSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    candidateType: {
      type: String,
      enum: ["fresher", "internship_seeker", "experienced"],
      required: true,
    },

    scores: {
      resumeScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      interviewScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      technicalSkillScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      communicationScore: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
    },

    evaluation: {
      weakTechnicalAreas: {
        type: [String],
        default: [],
      },
      communicationGaps: {
        type: [String],
        default: [],
      },
      missingIndustrySkills: {
        type: [String],
        default: [],
      },
    },

    readinessClassification: {
      type: String,
      enum: ["Placement Ready", "Needs Improvement", "High Potential Candidate"],
      required: true,
    },

    personalizedRoadmap: {
      technologies: {
        type: [String],
        default: [],
      },
      projects: {
        type: [String],
        default: [],
      },
      certifications: {
        type: [String],
        default: [],
      },
      interviewTopics: {
        type: [String],
        default: [],
      },
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Composite index for fast per-user historical queries sorted by time
PlacementReadinessSchema.index({ userId: 1, timestamp: -1 });

// Virtual: compute aggregate composite score for charting
PlacementReadinessSchema.virtual("compositeScore").get(function () {
  const { resumeScore, interviewScore, technicalSkillScore, communicationScore } =
    this.scores;
  return parseFloat(
    ((resumeScore + interviewScore + technicalSkillScore + communicationScore) / 4).toFixed(1)
  );
});

PlacementReadinessSchema.set("toJSON", { virtuals: true });
PlacementReadinessSchema.set("toObject", { virtuals: true });

const PlacementReadiness =
  models.PlacementReadiness || model("PlacementReadiness", PlacementReadinessSchema);

module.exports = PlacementReadiness;
