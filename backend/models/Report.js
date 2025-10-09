const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  topQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  stats: {
    questionCount: Number,
    activeStudents: Number,
    wordCloud: [String],
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);


