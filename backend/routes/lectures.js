const express = require("express");
const router = express.Router();
const Lecture = require("../models/Lecture");

// 강의 조회
router.get("/", async (req, res) => {
  try {
    const lectures = await Lecture.find(
      {},
      {
        _id: 1,
        title: 1,
        professor: 1,
        status: 1,
      }
    ).sort({ createdAt: -1 });

    const response = lectures.map((lec) => ({
      lectureId: String(lec._id),
      title: lec.title,
      professor: lec.professor,
      status: lec.status,
    }));

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 강의 생성
router.post("/", async (req, res) => {
  try {
    const { title, professor, status = "ongoing", description = "" } =
      req.body || {};
    if (!title || !professor) {
      return res
        .status(400)
        .json({ message: "title과 professor는 필수입니다." });
    }

    const created = await Lecture.create({
      title,
      professor,
      status,
      description,
    });

    res.status(201).json({
      lectureId: String(created._id),
      message: "강의가 생성되었습니다.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 강의 상세 조회
router.get("/:lectureId", async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
    }

    res.status(200).json({
      lectureId: String(lecture._id),
      title: lecture.title,
      professor: lecture.professor,
      status: lecture.status,
      description: lecture.description || "",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;


