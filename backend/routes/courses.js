const express = require("express");
const router = express.Router();
const Course = require("../models/Course");

// 강의 개설
router.post("/", async (req, res) => {
  try {
    const { title, description, instructorId, schedule } = req.body;
    const newCourse = new Course({
      title,
      description,
      instructor: instructorId,
      schedule,
    });
    await newCourse.save();
    res.json({ success: true, course: newCourse });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;


