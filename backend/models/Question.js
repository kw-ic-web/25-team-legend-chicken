const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  page: Number, // 교안 페이지 위치
  isAnonymous: { type: Boolean, default: true },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  aiAnswer: String,
  instructorAnswer: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Question", questionSchema);


