// models/ChatMessage.js
const mongoose = require("mongoose");

const SenderSchema = new mongoose.Schema(
  {
    id:   { type: String, required: true }, // String(user._id)
    name: { type: String, required: true },
    role: { type: String, enum: ["student", "professor", "assistant", "guest"], default: "student" },
  },
  { _id: false }
);

const ChatMessageSchema = new mongoose.Schema(
  {
    lecture_id: { type: String, required: true, index: true },
    class_id:   { type: Number, required: true, index: true },
    live_id:    { type: Number, default: null }, // 라이브 사이드바 채널. null이면 로비/상시 채널
    text:       { type: String, required: true, trim: true },
    sender:     { type: SenderSchema, required: true },
    timestamp:  { type: Date, default: Date.now }, // 실제 전송시각(선택)
    like_count: { type: Number, default: 0 },
    liked_by: [{ type: String }],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// 조회 최적화: 같은 채널 내 시간순 정렬
ChatMessageSchema.index({
  lecture_id: 1,
  class_id: 1,
  live_id: 1,
  created_at: -1,
});

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
