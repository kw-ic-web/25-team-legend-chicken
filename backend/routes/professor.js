const express = require("express");
const router = express.Router();
const Lecture = require("../models/lectures");
const User = require("../models/user");
const { authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");
const upload = require("../config/upload");

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
        classes, // 주차별 강의 목록
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
        classes: classes || [], // 주차별 강의 목록 (없으면 빈 배열)
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

// 강좌 멤버 조회 (수강 학생 목록 및 초대 링크)
router.get(
  "/lectures/:lectureId/check_member",
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
  "/lectures/:lectureId/invite_student",
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

// ✅ 강좌의 클래스(주차별 강의) 수정
router.put(
  "/lectures/:lectureId/classes",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      const { classes } = req.body;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 클래스를 수정할 수 있습니다." });
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
          .json({ message: "본인의 강좌만 수정할 수 있습니다." });
      }

      // 클래스 데이터 검증
      if (!classes || !Array.isArray(classes)) {
        return res
          .status(400)
          .json({ message: "클래스 데이터가 올바르지 않습니다." });
      }

      // 클래스 ID 중복 확인
      const classIds = classes.map((cls) => cls.id);
      const uniqueIds = [...new Set(classIds)];
      if (classIds.length !== uniqueIds.length) {
        return res
          .status(400)
          .json({ message: "클래스 ID가 중복됩니다." });
      }

      // 클래스 업데이트
      lecture.classes = classes;
      await lecture.save();

      res.status(200).json({
        message: "클래스가 성공적으로 수정되었습니다.",
        lecture_id: lecture.lecture_id,
        classes: lecture.classes,
      });
    } catch (err) {
      console.error("클래스 수정 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// 강좌의 클래스 목록 조회
router.get(
  "/lectures/:lectureId/classes",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 교수이거나 수강생인지 확인
      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res
          .status(403)
          .json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      res.status(200).json({
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        classes: lecture.classes,
      });
    } catch (err) {
      console.error("클래스 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// 강의 생성 (Class 생성)
router.post("/lecture/:lectureId/class/:classId/create", authenticateToken, async (req, res) => {});

// 강의 초대 페이지
router.get("/lecture/:lectureId/class/invite", authenticateToken, async (req, res) => {});

// PDF 업로드
router.post(
  "/lectures/:lectureId/classes/:classId/uploadpdf",
  authenticateToken,
  upload.single("pdf"),
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 PDF를 업로드할 수 있습니다." });
      }

      // 파일이 업로드되었는지 확인
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "PDF 파일을 선택해주세요." });
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
          .json({ message: "본인의 강좌에만 PDF를 업로드할 수 있습니다." });
      }

      // 클래스 ID로 해당 클래스 찾기
      const classIndex = lecture.classes.findIndex(
        (cls) => cls.id === parseInt(classId)
      );
      if (classIndex === -1) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      // PDF URL 생성
      const pdfUrl = `/uploads/pdfs/${req.file.filename}`;

      // 클래스의 materials 배열에 PDF URL 추가
      if (!lecture.classes[classIndex].materials) {
        lecture.classes[classIndex].materials = [];
      }
      lecture.classes[classIndex].materials.push(pdfUrl);

      await lecture.save();

      res.status(200).json({
        message: "PDF가 성공적으로 업로드되었습니다.",
        lecture_id: lecture.lecture_id,
        class_id: parseInt(classId),
        class_title: lecture.classes[classIndex].title,
        pdf_url: pdfUrl,
        filename: req.file.filename,
        materials: lecture.classes[classIndex].materials,
      });
    } catch (err) {
      console.error("PDF 업로드 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// 강의 예약
router.post("/lecture/:lectureId/class/:classId/reservation", authenticateToken, async (req, res) => {});

module.exports = router;
