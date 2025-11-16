const mongoose = require("mongoose");

const ReferenceSchema = new mongoose.Schema({
  title: { type: String },
  author: { type: String },
  publisher: { type: String },
});

const ClassSchema = new mongoose.Schema({
  id: { type: Number, required: true }, // 주차 번호
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date },
  materials: [{ type: String }],

  // 현재 진행 중인 라이브 여부
  isLiveActive: { type: Boolean, default: false },

  // 현재 진행중인 라이브 ID (없으면 null)
  currentLiveId: { type: Number, default: null },

  // 라이브 세션 기록
  lives: [
    {
      liveId: { type: Number, required: true },       // 1, 2, 3 ...
      startedAt: { type: Date, required: true },      // 라이브 시작 시간
      endedAt: { type: Date, default: null },         // 종료 시각 (없으면 진행중)
      status: { type: String, enum: ["open", "closed"], default: "open" },
    },
  ],
});

const LectureSchema = new mongoose.Schema({
  lecture_id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  schedule: { type: String, required: true }, // ex: "월,수 9-11"
  student_count: { type: Number, required: true },
  professor_name: { type: String, required: true },
  professor_email: { type: String, required: true },
  professor_phone: { type: String, required: true },
  lecture_description: { type: String },
  learning_method: { type: String },
  target_audience: { type: String },
  references: [ReferenceSchema],
  classes: [ClassSchema], // 주차별 강의 목록
  thumbnail: { type: String, default: "" }, // 강의 썸네일 이미지 URL

  // 내부 관리용
  professor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  student_id_list: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.models.Lecture || mongoose.model("Lecture", LectureSchema);
