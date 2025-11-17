// models/Question.js
const mongoose = require("mongoose");

const PositionSchema = new mongoose.Schema({
  x: { type: Number, min: 0, max: 1, required: true },
  y: { type: Number, min: 0, max: 1, required: true },
}, { _id: false });

const AuthorSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
}, { _id: false });

const MetadataSchema = new mongoose.Schema({
  source: { type: String, default: "pdf_viewer" },
  device: { type: String, default: "web" },
  language: { type: String, default: "ko" },
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  lecture_id: { type: String, required: true, index: true },
  class_id: { type: Number, required: true, index: true },
  live_id: { type: Number, default: null },     // 선택: 현재 라이브와 연결하고 싶으면 사용
  page: { type: Number, required: true },
  position: { type: PositionSchema, required: true },
  timestamp: { type: Date, required: true },    // 클라이언트 기준 타임스탬프
  type: { type: String, enum: ["question", "answer", "note"], default: "question" },
  author: { type: AuthorSchema, required: true },
  text: { type: String, required: true },
  answer: { type: String, default: null }, // GPT 자동 답변
  metadata: { type: MetadataSchema, default: () => ({}) },
  upvote_count: { type: Number, default: 0 },
  upvoted_by: [{ type: String }],
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

QuestionSchema.index({
  lecture_id: 1,
  class_id: 1,
  page: 1,
  created_at: -1,
});

module.exports =
  mongoose.models.Question || mongoose.model("Question", QuestionSchema);
