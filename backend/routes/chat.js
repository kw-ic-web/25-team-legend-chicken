// routes/chat.js
const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage"); 
const Lecture = require("../models/lectures");
const { authenticateToken } = require("../middleware/auth");

// ───────── 공통 접근 권한 체크 ─────────
async function canAccess(user, lecture_id) {
  const lec = await Lecture.findOne({ lecture_id });
  if (!lec) return { ok: false, code: 404, msg: "강좌를 찾을 수 없습니다." };

  const isProfessor =
    user.user_type === "professor" && String(lec.professor_id) === String(user._id);
  const isStudent =
    user.user_type === "student" &&
    lec.student_id_list.some((id) => String(id) === String(user._id));

  if (!isProfessor && !isStudent) {
    return { ok: false, code: 403, msg: "해당 강좌에 접근할 수 없습니다." };
  }
  return { ok: true, lec, isProfessor, isStudent };
}

// ───────── 간단 스팸 방지(1초 1회) ─────────
const lastPostAt = new Map();
function rateLimitOnePerSecond(req, res, next) {
  const uid = String(req.user._id);
  const now = Date.now();
  const prev = lastPostAt.get(uid) || 0;
  if (now - prev < 1000) {
    return res.status(429).json({ message: "메시지 전송이 너무 빠릅니다." });
  }
  lastPostAt.set(uid, now);
  next();
}

// ───────── 메시지 전송 ─────────
// POST /api/chat/messages
// body: { lecture_id, class_id, live_id?, text, meta? }
router.post("/messages", authenticateToken, rateLimitOnePerSecond, async (req, res) => {
  try {
    const user = req.user;
    const { lecture_id, class_id, live_id = null, text, meta = {} } = req.body || {};

    if (!lecture_id || !class_id || !text || String(text).trim().length === 0) {
      return res.status(422).json({ message: "lecture_id, class_id, text는 필수입니다." });
    }

    const access = await canAccess(user, lecture_id);
    if (!access.ok) return res.status(access.code).json({ message: access.msg });

    const cls = access.lec.classes.find((c) => Number(c.id) === Number(class_id));
    if (!cls) return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });

    // ✅ sender는 서버가 확정(스푸핑 방지)
    const saved = await ChatMessage.create({
      lecture_id,
      class_id: Number(class_id),
      live_id: live_id === null ? null : Number(live_id),
      text: String(text).trim(),
      sender: {
        id: String(user._id),
        name: user.name || "사용자",
        role: user.user_type,
      },
      timestamp: new Date(),
      meta, // 필요시 모델에 추가해서 저장해도 됨
    });

    // 선택: socket.io 방송 (서버에 io 세팅 시에만)
    const io = req.app.get("io");
    if (io) {
      const room = `lec:${lecture_id}:cls:${class_id}:live:${live_id ?? "none"}`;
      io.to(room).emit("chat:message", {
        _id: saved._id,
        lecture_id,
        class_id: Number(class_id),
        live_id: saved.live_id,
        text: saved.text,
        sender: saved.sender,
        timestamp: saved.timestamp.toISOString(),
        created_at: saved.created_at,
      });
    }

    return res.status(201).json({ message: "sent", data: saved });
  } catch (err) {
    console.error("채팅 저장 오류:", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ───────── 메시지 조회(폴링) ─────────
// GET /api/chat/messages?lecture_id=...&class_id=...&live_id=...?&limit=50&before=ISO&since=ISO
router.get("/messages", authenticateToken, async (req, res) => {
  try {
    const { lecture_id, class_id, live_id, limit = 50, before, since } = req.query || {};
    if (!lecture_id || !class_id) {
      return res.status(422).json({ message: "lecture_id, class_id는 필수입니다." });
    }

    const access = await canAccess(req.user, lecture_id);
    if (!access.ok) return res.status(access.code).json({ message: access.msg });

    const q = {
      lecture_id,
      class_id: Number(class_id),
      ...(typeof live_id !== "undefined"
        ? { live_id: live_id === "" ? null : Number(live_id) }
        : {}), // live_id 미지정 시 채널 구분 없이 같은 클래스 전체를 보려면 이 줄 제거
    };

    const time = {};
    if (before) time.$lt = new Date(before);
    if (since)  time.$gt = new Date(since);
    if (Object.keys(time).length) q.created_at = time;

    const lim = Math.min(Number(limit) || 50, 200);
    const docs = await ChatMessage.find(q).sort({ created_at: -1 }).limit(lim).lean();

    // 프론트에서 시간순 렌더가 편하도록 오래된 → 최신으로 뒤집어서 반환
    return res.json({ count: docs.length, messages: docs.reverse() });
  } catch (err) {
    console.error("채팅 조회 오류:", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

// ───────── 메시지 삭제(작성자 or 담당교수) ─────────
// DELETE /api/chat/messages/:id
router.delete("/messages/:id", authenticateToken, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "메시지를 찾을 수 없습니다." });

    const access = await canAccess(req.user, msg.lecture_id);
    if (!access.ok) return res.status(access.code).json({ message: access.msg });

    const isOwner = String(msg.sender.id) === String(req.user._id);
    const isProf  = access.isProfessor;
    if (!isOwner && !isProf) {
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    await ChatMessage.deleteOne({ _id: msg._id });
    return res.json({ message: "deleted" });
  } catch (err) {
    console.error("채팅 삭제 오류:", err);
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;