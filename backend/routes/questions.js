const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Lecture = require("../models/lectures");
const { authenticateToken } = require("../middleware/auth");
const mongoose = require("mongoose");

// 권한 체크: 강좌/클래스 접근 가능?
async function canAccess(user, lecture_id) {
  // lecture_id가 ObjectId일 수도, 커스텀 문자열일 수도 있는 상황 모두 대응
  let lec = await Lecture.findOne({ lecture_id });
  if (!lec) {
    if (mongoose.Types.ObjectId.isValid(String(lecture_id))) {
      lec = await Lecture.findById(lecture_id);
    }
  }
  if (!lec) return { ok: false, code: 404, msg: "강좌를 찾을 수 없습니다." };

  const uid = String(user._id || user.id || "");
  const profId = lec.professor_id ? String(lec.professor_id) : "";
  const studentIds = Array.isArray(lec.student_id_list)
    ? lec.student_id_list.map(String)
    : [];

  const isProfessor = user.user_type === "professor" && profId === uid;
  const isStudent = user.user_type === "student" && studentIds.includes(uid);

  if (!isProfessor && !isStudent) {
    return { ok: false, code: 403, msg: "해당 강좌에 접근할 수 없습니다." };
  }
  return { ok: true, lec };
}

// 질문 생성
router.post("/", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const {
      lecture_id,
      class_id,
      page,
      section,
      position,
      timestamp,
      type = "question",
      author,
      text,
      metadata,
    } = req.body;

    // 필수값 체크
    if (!lecture_id || !class_id || !page || !position || !text) {
      return res
        .status(400)
        .json({ message: "필수 필드가 누락되었습니다." });
    }

    // 접근 권한 확인
    const access = await canAccess(user, lecture_id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.msg });
    }

    // 클래스 존재 확인
    const cls = Array.isArray(access.lec.classes)
      ? access.lec.classes.find((c) => Number(c.id) === Number(class_id))
      : null;
    if (!cls) {
      return res
        .status(404)
        .json({ message: "해당 클래스를 찾을 수 없습니다." });
    }

    // 🔥 현재 라이브 상태에 따라 live_id 자동 설정
    let liveId = null;
    if (cls.isLiveActive && cls.currentLiveId) {
      liveId = Number(cls.currentLiveId);
    }

    // author를 명시 안 한 경우, 토큰 사용자에서 기본값 구성
    const authorSafe =
      author && typeof author === "object"
        ? author
        : {
            id: String(user._id || user.id || ""),
            name: user.name || user.username || "익명",
            role: user.user_type || "student",
          };

    // 질문 생성
    const q = await Question.create({
      lecture_id,
      class_id: Number(class_id),
      page,
      // section은 점차 없앨 예정이면 여기서 null로만 두고, 스키마에서 삭제해도 됨
      section: section || null,
      position,
      timestamp: new Date(timestamp || Date.now()),
      type,
      author: authorSafe,
      text,
      metadata: metadata || {},
      live_id: liveId, // ✅ 현재 라이브면 번호, 아니면 null
    });

    // 실시간 알림 송출
    const io = req.app.get("io");
    if (io) {
      const room = `lec:${lecture_id}:cls:${class_id}`;
      io.to(room).emit("question:new", q.toObject());
    }

    return res
      .status(201)
      .json({ message: "질문이 저장되었습니다.", question: q });
  } catch (err) {
    console.error("질문 저장 오류:", err);
    return res
      .status(500)
      .json({ message: "서버 오류가 발생했습니다.", error: err.message });
  }
});

// 질문 조회 (필터: lecture_id, class_id, page)
router.get("/list", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { lecture_id, class_id, page, limit = 50 } = req.query;

    if (!lecture_id || !class_id) {
      return res
        .status(400)
        .json({ message: "lecture_id, class_id는 필수입니다." });
    }

    const access = await canAccess(user, lecture_id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.msg });
    }

    const filter = {
      lecture_id,
      class_id: Number(class_id),
    };
    if (page) filter.page = Number(page);

    // createdAt(타임스탬프 자동필드)와 created_at(커스텀) 양쪽 정렬 대응
    const data = await Question.find(filter)
      .sort({ createdAt: -1, created_at: -1 })
      .limit(Math.min(Number(limit) || 50, 200));

    return res.json({ questions: data });
  } catch (err) {
    console.error("질문 조회 오류:", err);
    return res
      .status(500)
      .json({ message: "서버 오류가 발생했습니다.", error: err.message });
  }
});

module.exports = router;
