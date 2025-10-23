const mongoose = require("mongoose");

const ReferenceSchema = new mongoose.Schema({
  title: { type: String },
  author: { type: String },
  publisher: { type: String },
});

const ClassSchema = new mongoose.Schema({
  id: { type: Number, required: true }, // 1, 2, 3, ...
  title: { type: String, required: true }, // "파이썬 기초", "반복문", "제어문"
  description: { type: String },
  date: { type: Date },
  materials: [{ type: String }], // 강의 자료 URL들
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

  // 내부 관리용
  professor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  student_id_list: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

module.exports = mongoose.models.Lecture || mongoose.model("Lecture", LectureSchema);
