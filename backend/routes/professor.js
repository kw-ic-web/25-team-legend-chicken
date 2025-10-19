const express = require("express");
const router = express.Router();
const Lecture = require("../models/lectures");
const User = require("../models/user");
const { authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");

// ✅ 강의 개설
router.post(
  "/professor/lectures/create",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 강의를 개설할 수 있습니다." });
      }

      // lecture_id 자동 생성 (고유)
      const lecture_id =
        "LEC-" + crypto.randomBytes(4).toString("hex").toUpperCase();

      const {
        name,
        schedule,
        student_count,
        professor_name,
        professor_email,
        professor_phone,
        lecture_description,
        learning_method,
        target_audience,
        references,
      } = req.body;

      const lecture = new Lecture({
        lecture_id,
        name,
        schedule,
        student_count,
        professor_name,
        professor_email,
        professor_phone,
        lecture_description,
        learning_method,
        target_audience,
        references,
        professor_id: user._id,
        student_id_list: [],
      });

      await lecture.save();
      res
        .status(201)
        .json({ message: "강의가 성공적으로 개설되었습니다.", lecture });
    } catch (err) {
      console.error("강의 개설 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 강의 조회
router.get(
  "/professor/lectures/search",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;

      let lectures = [];
      if (user.user_type === "professor") {
        lectures = await Lecture.find({ professor_id: user._id });
      } else if (user.user_type === "student") {
        lectures = await Lecture.find({ student_id_list: user._id });
      } else {
        return res.status(403).json({ message: "잘못된 회원 유형입니다." });
      }

      res.status(200).json({ lectures });
    } catch (err) {
      console.error("강의 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// 강의 생성 (Class 생성)
router.post("/lecture/:lectureId/class/:classId/create", authenticateToken, async (req, res) => {});

// 강의 초대 페이지
router.get("/lecture/:lectureId/class/invite", authenticateToken, async (req, res) => {});

// PDF 업로드
router.post("/lecture/:lectureId/class/:classId/uploadpdf", authenticateToken, async (req, res) => {});

// 강의 예약
router.post("/lecture/:lectureId/class/:classId/reservation", authenticateToken, async (req, res) => {});

module.exports = router;
