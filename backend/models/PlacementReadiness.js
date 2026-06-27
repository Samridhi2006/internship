import mongoose from "mongoose";

/**
 * PlacementReadiness.js
 * Persistent Mongoose model for AI Placement Readiness evaluations.
 *
 * Stores per-user evaluation snapshots including resume analysis,
 * interview analytics, skill assessments, composite scores,
 * classification bands, and personalized learning roadmaps.
 */

const resumeDataSchema = new mongoose.Schema(
  {
    rawText: { type: String, default: "" },
    technologies: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    resumeScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const interviewDataSchema = new mongoose.Schema(
  {
    sessionCount: { type: Number, default: 0 },
    avgTechnicalAccuracy: { type: Number, default: 0, min: 0, max: 100 },
    avgCommunicationClarity: { type: Number, default: 0, min: 0, max: 100 },
    avgRoleRelevance: { type: Number, default: 0, min: 0, max: 100 },
    interviewScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false }
);

const skillAssessmentSchema = new mongoose.Schema(
  {
    technical: { type: Number, default: 50, min: 0, max: 100 },
    domain: { type: Number, default: 50, min: 0, max: 100 },
    aptitude: { type: Number, default: 50, min: 0, max: 100 },
    hr: { type: Number, default: 50, min: 0, max: 100 },
    skillScore: { type: Number, default: 50, min: 0, max: 100 },
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    weakTechnicalAreas: { type: [String], default: [] },
    communicationGaps: { type: [String], default: [] },
    missingIndustrySkills: { type: [String], default: [] },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    technologies: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    interviewTopics: { type: [String], default: [] },
  },
  { _id: false }
);

const placementReadinessSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    candidateType: {
      type: String,
      enum: ["fresher", "internship_seeker", "experienced"],
      default: "fresher",
    },
    resumeData: {
      type: resumeDataSchema,
      default: () => ({}),
    },
    interviewData: {
      type: interviewDataSchema,
      default: () => ({}),
    },
    skillAssessment: {
      type: skillAssessmentSchema,
      default: () => ({}),
    },
    compositeScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    readinessClassification: {
      type: String,
      enum: ["Placement Ready", "High Potential Candidate", "Needs Improvement"],
      default: "Needs Improvement",
    },
    evaluation: {
      type: evaluationSchema,
      default: () => ({}),
    },
    personalizedRoadmap: {
      type: roadmapSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "placement_readiness",
  }
);

placementReadinessSchema.index({ userId: 1, createdAt: -1 });

const PlacementReadiness =
  mongoose.models.PlacementReadiness ||
  mongoose.model("PlacementReadiness", placementReadinessSchema);

export default PlacementReadiness;
