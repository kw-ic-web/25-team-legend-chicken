const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const Lecture = require("../models/lectures");
const User = require("../models/user");

// ✅ 학생이 초대 링크로 강좌 참가
router.post(
  "/join-lecture/:lectureId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 학생 권한 확인
      if (user.user_type !== "student") {
        return res
          .status(403)
          .json({ message: "학생만 강좌에 참가할 수 있습니다." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 이미 등록된 학생인지 확인
      if (lecture.student_id_list.includes(user._id)) {
        return res
          .status(400)
          .json({ message: "이미 해당 강좌에 등록되어 있습니다." });
      }

      // 수강 인원 초과 확인
      if (lecture.student_id_list.length >= lecture.student_count) {
        return res
          .status(400)
          .json({ message: "수강 인원이 가득 찼습니다." });
      }

      // 학생 추가
      lecture.student_id_list.push(user._id);
      await lecture.save();

      res.status(200).json({
        message: "강좌에 성공적으로 참가했습니다.",
        lecture: {
          lecture_id: lecture.lecture_id,
          name: lecture.name,
          schedule: lecture.schedule,
          professor_name: lecture.professor_name,
          professor_email: lecture.professor_email,
        },
        current_count: lecture.student_id_list.length,
        max_count: lecture.student_count,
      });
    } catch (err) {
      console.error("강좌 참가 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 학생이 본인의 수강 강좌 목록 조회
router.get("/my-lectures", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // 학생 권한 확인
    if (user.user_type !== "student") {
      return res
        .status(403)
        .json({ message: "학생만 접근할 수 있습니다." });
    }

    // 학생이 수강 중인 강좌 조회
    const lectures = await Lecture.find({
      student_id_list: user._id,
    }).select(
      "lecture_id name schedule professor_name professor_email professor_phone lecture_description"
    );

    res.status(200).json({
      student_name: user.name,
      student_email: user.email,
      lecture_count: lectures.length,
      lectures: lectures,
    });
  } catch (err) {
    console.error("수강 강좌 조회 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ✅ 학생이 강좌에서 나가기
router.delete(
  "/leave-lecture/:lectureId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 학생 권한 확인
      if (user.user_type !== "student") {
        return res
          .status(403)
          .json({ message: "학생만 접근할 수 있습니다." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 등록되지 않은 강좌인지 확인
      if (!lecture.student_id_list.includes(user._id)) {
        return res
          .status(400)
          .json({ message: "해당 강좌에 등록되어 있지 않습니다." });
      }

      // 학생 제거
      lecture.student_id_list = lecture.student_id_list.filter(
        (id) => id.toString() !== user._id.toString()
      );
      await lecture.save();

      res.status(200).json({
        message: "강좌에서 성공적으로 나갔습니다.",
        lecture_name: lecture.name,
      });
    } catch (err) {
      console.error("강좌 나가기 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

module.exports = router;