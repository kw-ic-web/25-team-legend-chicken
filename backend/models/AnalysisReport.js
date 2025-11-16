const mongoose = require("mongoose");

const KPIBundleSchema = new mongoose.Schema(
  {
    totalQuestions: { type: Number, default: 0 },
    totalCurious: { type: Number, default: 0 }, // '궁금해요' 합산 (metadata.likes)
    participationRate: { type: Number, default: 0 }, // 0~1
    hardestConcept: { type: String, default: "" },
  },
  { _id: false }
);

const TimelinePointSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    questions: { type: Number, default: 0 },
    curious: { type: Number, default: 0 },
  },
  { _id: false }
);

const QuestionMatrixItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    frequency: { type: Number, default: 1 },
    popularity: { type: Number, default: 0 }, // likes 합
    uniqueAuthors: { type: Number, default: 1 },
  },
  { _id: false }
);

const GraphSchema = new mongoose.Schema(
  {
    nodes: [{ id: String, label: String, weight: Number }],
    edges: [{ source: String, target: String, weight: Number }],
  },
  { _id: false }
);

const LeaderboardSchema = new mongoose.Schema(
  {
    topAskers: [{ userId: String, name: String, count: Number }],
    topVoters: [{ userId: String, name: String, likes: Number }],
  },
  { _id: false }
);

const GPTSectionSchema = new mongoose.Schema(
  {
    summary: { type: String, default: "" },
    sections: {
      type: Map,
      of: String,
      default: {},
    },
    usage: {
      prompt_tokens: Number,
      completion_tokens: Number,
      total_tokens: Number,
      estimated_cost: Number,
    },
  },
  { _id: false }
);

const AnalysisReportSchema = new mongoose.Schema(
  {
    lecture_id: { type: String, required: true, index: true },
    class_id: { type: Number, required: true, index: true },
    generated_at: { type: Date, default: Date.now },
    kpis: { type: KPIBundleSchema, default: () => ({}) },
    timeline: { type: [TimelinePointSchema], default: [] },
    questionMatrix: { type: [QuestionMatrixItemSchema], default: [] },
    conceptGraph: { type: GraphSchema, default: () => ({ nodes: [], edges: [] }) },
    leaderboard: { type: LeaderboardSchema, default: () => ({ topAskers: [], topVoters: [] }) },
    gpt: { type: GPTSectionSchema, default: () => ({}) },
  },
  { timestamps: true }
);

AnalysisReportSchema.index({ lecture_id: 1, class_id: 1, createdAt: -1 });

module.exports =
  mongoose.models.AnalysisReport || mongoose.model("AnalysisReport", AnalysisReportSchema);


