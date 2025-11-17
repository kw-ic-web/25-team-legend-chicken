const express = require("express");
const router = express.Router();
const Lecture = require("../../models/lectures");
const User = require("../../models/user");
const { authenticateToken } = require("../../middleware/auth");

router.get(
  "/:lectureId/check_member",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 접근할 수 있습니다." });
      }

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌만 조회할 수 있습니다." });
      }

      const students = await User.find({
        _id: { $in: lecture.student_id_list },
        user_type: "student",
      }).select("name email phone");

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

router.post(
  "/:lectureId/invite_student",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      const { student_email } = req.body;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 학생을 초대할 수 있습니다." });
      }

      if (!student_email) {
        return res
          .status(400)
          .json({ message: "학생 이메일을 입력해주세요." });
      }

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌에만 학생을 초대할 수 있습니다." });
      }

      const student = await User.findOne({
        email: student_email,
        user_type: "student",
      });

      if (!student) {
        return res.status(404).json({
          message: "해당 이메일의 학생 계정을 찾을 수 없습니다.",
        });
      }

      if (lecture.student_id_list.includes(student._id)) {
        return res
          .status(400)
          .json({ message: "이미 해당 강좌에 등록된 학생입니다." });
      }

      if (lecture.student_id_list.length >= lecture.student_count) {
        return res
          .status(400)
          .json({ message: "수강 인원이 가득 찼습니다." });
      }

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

module.exports = router;

