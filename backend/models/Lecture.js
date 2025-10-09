const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  professor: { type: String, required: true },
  status: {
    type: String,
    enum: ["ongoing", "upcoming", "finished"],
    default: "ongoing",
  },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Lecture", lectureSchema);


