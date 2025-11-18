const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const Lecture = require("../models/lectures");
const User = require("../models/user");
const Question = require("../models/Question");

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

// ✅ 학생이 라이브 방송에 참여하기 위한 정보 조회
router.get("/participate", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { lectureId, classId } = req.query;

    // 학생 권한 확인
    if (user.user_type !== "student") {
      return res
        .status(403)
        .json({ message: "학생만 접근할 수 있습니다." });
    }

    // 필수 파라미터 확인
    if (!lectureId || !classId) {
      return res.status(400).json({
        message: "lectureId와 classId가 필요합니다.",
      });
    }

    const cid = Number(classId);
    if (!Number.isFinite(cid)) {
      return res.status(400).json({ message: "classId는 숫자여야 합니다." });
    }

    // 강좌 조회
    const lecture = await Lecture.findOne({ lecture_id: lectureId });
    if (!lecture) {
      return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
    }

    // 학생이 해당 강좌에 등록되어 있는지 확인
    if (!lecture.student_id_list.includes(user._id)) {
      return res.status(403).json({
        message: "해당 강좌에 등록되어 있지 않습니다.",
      });
    }

    // 클래스 조회
    const cls = lecture.classes.find((c) => Number(c.id) === cid);
    if (!cls) {
      return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
    }

    // 현재 활성 라이브 정보 확인
    const isLiveActive = cls.isLiveActive === true;
    const currentLiveId = cls.currentLiveId || null;
    const currentLive = currentLiveId
      ? (cls.lives || []).find((l) => Number(l.liveId) === Number(currentLiveId))
      : null;

    return res.status(200).json({
      lecture_id: lecture.lecture_id,
      lecture_name: lecture.name,
      class_id: cid,
      class_title: cls.title,
      is_live_active: isLiveActive,
      live_id: currentLiveId,
      started_at: currentLive ? currentLive.startedAt : null,
      live_path: isLiveActive && currentLiveId
        ? `/student/participate?lectureId=${lectureId}&classId=${cid}`
        : null,
    });
  } catch (err) {
    console.error("학생 라이브 참여 정보 조회 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ✅ 학생이 본인이 작성한 질문 목록 조회
router.get("/my-questions", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { lectureId, classId, limit = 50 } = req.query;

    // 학생 권한 확인
    if (user.user_type !== "student") {
      return res
        .status(403)
        .json({ message: "학생만 접근할 수 있습니다." });
    }

    const userId = String(user._id);

    // 필터 조건 구성
    const filter = {
      "author.id": userId, // 본인이 작성한 질문만
    };

    // 선택적 필터: lectureId
    if (lectureId) {
      filter.lecture_id = lectureId;
      
      // lectureId가 있으면 해당 강좌에 등록되어 있는지 확인
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }
      
      if (!lecture.student_id_list.includes(user._id)) {
        return res.status(403).json({
          message: "해당 강좌에 등록되어 있지 않습니다.",
        });
      }
    }

    // 선택적 필터: classId
    if (classId) {
      const cid = Number(classId);
      if (!Number.isFinite(cid)) {
        return res.status(400).json({ message: "classId는 숫자여야 합니다." });
      }
      filter.class_id = cid;
    }

    // 질문 조회
    const questions = await Question.find(filter)
      .sort({ created_at: -1, createdAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .lean();

    // 강좌 정보 매핑 (lectureId가 없는 경우 여러 강좌의 질문이 있을 수 있음)
    const lectureIds = [...new Set(questions.map((q) => q.lecture_id))];
    const lectures = await Lecture.find({
      lecture_id: { $in: lectureIds },
    }).lean();

    const lectureMap = new Map(
      lectures.map((lec) => [lec.lecture_id, lec])
    );

    // 응답 데이터 구성
    const questionsWithLectureInfo = questions.map((q) => {
      const lecture = lectureMap.get(q.lecture_id);
      return {
        _id: q._id,
        lecture_id: q.lecture_id,
        lecture_name: lecture?.name || null,
        class_id: q.class_id,
        page: q.page,
        section: q.section || null,
        position: q.position,
        timestamp: q.timestamp,
        type: q.type,
        author: q.author,
        text: q.text,
        answer: q.answer || null,
        upvote_count: q.upvote_count || 0,
        metadata: q.metadata || {},
        live_id: q.live_id || null,
        created_at: q.created_at || q.createdAt,
        updated_at: q.updated_at || q.updatedAt,
      };
    });

    return res.status(200).json({
      student_id: userId,
      student_name: user.name || user.username || "익명",
      total_count: questionsWithLectureInfo.length,
      questions: questionsWithLectureInfo,
    });
  } catch (err) {
    console.error("학생 질문 목록 조회 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;