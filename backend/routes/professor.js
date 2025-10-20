const express = require("express");
const router = express.Router();
const Lecture = require("../models/lectures");
const User = require("../models/user");
const { authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");

// 강의 개설
router.post(
  "/lectures/create",
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

// 강의 조회
router.get(
  "/lectures/search",
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

// ✅ 강좌 멤버 조회 (수강 학생 목록 및 초대 링크)
router.get(
  "/lecture/:lectureId/check_member",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 접근할 수 있습니다." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 교수의 강좌인지 확인
      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌만 조회할 수 있습니다." });
      }

      // 학생 정보 조회
      const students = await User.find({
        _id: { $in: lecture.student_id_list },
        user_type: "student",
      }).select("name email phone");

      // 초대 링크 생성
      const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/join-lecture/${lectureId}`;

      res.status(200).json({
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        student_count: students.length,
        max_students: lecture.student_count,
        students: students.map((student) => ({
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
        })),
        invite_link: inviteLink,
      });
    } catch (err) {
      console.error("멤버 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 학생 초대 (이메일로 초대)
router.post(
  "/lecture/:lectureId/invite_student",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      const { student_email } = req.body;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 학생을 초대할 수 있습니다." });
      }

      // 이메일 필수 확인
      if (!student_email) {
        return res
          .status(400)
          .json({ message: "학생 이메일을 입력해주세요." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 교수의 강좌인지 확인
      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌에만 학생을 초대할 수 있습니다." });
      }

      // 학생 계정 조회
      const student = await User.findOne({
        email: student_email,
        user_type: "student",
      });

      if (!student) {
        return res.status(404).json({
          message: "해당 이메일의 학생 계정을 찾을 수 없습니다.",
        });
      }

      // 이미 등록된 학생인지 확인
      if (lecture.student_id_list.includes(student._id)) {
        return res
          .status(400)
          .json({ message: "이미 해당 강좌에 등록된 학생입니다." });
      }

      // 수강 인원 초과 확인
      if (lecture.student_id_list.length >= lecture.student_count) {
        return res
          .status(400)
          .json({ message: "수강 인원이 가득 찼습니다." });
      }

      // 학생 추가
      lecture.student_id_list.push(student._id);
      await lecture.save();

      res.status(200).json({
        message: "학생이 성공적으로 초대되었습니다.",
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
        },
        current_count: lecture.student_id_list.length,
        max_count: lecture.student_count,
      });
    } catch (err) {
      console.error("학생 초대 오류:", err);
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
