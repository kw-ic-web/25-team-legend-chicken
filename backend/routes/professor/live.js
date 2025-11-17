const express = require("express");
const router = express.Router();
const Lecture = require("../../models/lectures");
const { authenticateToken } = require("../../middleware/auth");

async function endLiveCore(req, res, liveIdSource) {
  const user = req.user;
  const { lectureId, classId } = req.params;
  const cid = Number(classId);

  if (user.user_type !== "professor") {
    return res.status(403).json({ message: "교수만 라이브를 종료할 수 있습니다." });
  }

  const lec = await Lecture.findOne({ lecture_id: lectureId, professor_id: user._id });
  if (!lec) {
    return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
  }

  const idx = lec.classes.findIndex((c) => Number(c.id) === cid);
  if (idx < 0) {
    return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
  }

  const cls = lec.classes[idx];

  let lid = null;
  if (liveIdSource === "path") {
    lid = Number(req.params.liveId);
  } else if (liveIdSource === "query") {
    lid = Number(req.query.liveId);
  } else if (liveIdSource === "current") {
    if (!cls.isLiveActive || !cls.currentLiveId) {
      return res.status(409).json({ message: "진행 중인 라이브가 없습니다." });
    }
    lid = Number(cls.currentLiveId);
  }

  if (!Number.isFinite(lid)) {
    return res.status(400).json({ message: "liveId가 올바르지 않습니다." });
  }

  if (!Array.isArray(cls.lives)) {
    cls.lives = [];
  }
  const live = cls.lives.find((l) => Number(l.liveId) === lid);
  if (!live) {
    return res.status(404).json({ message: "해당 라이브 세션을 찾을 수 없습니다." });
  }

  const endedAt = new Date(); 
  live.status = "closed";
  live.endedAt = new Date();
  cls.isLiveActive = false;
  cls.currentLiveId = null;

  await lec.save();

  const io = req.app.get("io");
  if (io) {
    const baseRoom = `lec:${lectureId}:cls:${cid}`;
    const liveRoom = `${baseRoom}:live:${lid}`;
    
    io.to(baseRoom).emit("live:ended", {
      lecture_id: lectureId,
      class_id: cid,
      live_id: lid,
      started_at: live.startedAt,
      ended_at: endedAt,
      professor: {
        id: String(user._id),
        name: user.name || "교수",
      },
    });
  }

  return res.status(200).json({
    message: "라이브가 종료되었습니다.",
    lecture_id: lec.lecture_id,
    class_id: cid,
    live_id: lid,
    started_at: live.startedAt, 
    ended_at: endedAt,
  });
}

router.post(
  "/:lectureId/classes/:classId/live/start",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;
      const cid = Number(classId);

      if (user.user_type !== "professor") {
        return res.status(403).json({ message: "교수만 라이브를 시작할 수 있습니다." });
      }

      const lec = await Lecture.findOne({ lecture_id: lectureId, professor_id: user._id });
      if (!lec) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const idx = lec.classes.findIndex((c) => Number(c.id) === cid);
      if (idx < 0) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      const cls = lec.classes[idx];

      if (cls.isLiveActive) {
        return res.status(409).json({ message: "이미 진행 중인 라이브가 있습니다." });
      }

      cls.liveSeq = (cls.liveSeq || 0) + 1;
      const newLiveId = cls.liveSeq;

      if (!Array.isArray(cls.lives)) {
        cls.lives = [];
      }

      const startedAt = new Date();

      cls.lives.push({
        liveId: newLiveId,
        status: "open",
        startedAt: new Date(),
      });

      cls.isLiveActive = true;
      cls.currentLiveId = newLiveId;

      await lec.save();

      const io = req.app.get("io");
      if (io) {
        const baseRoom = `lec:${lectureId}:cls:${cid}`;
        const liveRoom = `${baseRoom}:live:${newLiveId}`;
        
        io.to(baseRoom).emit("live:started", {
          lecture_id: lectureId,
          class_id: cid,
          live_id: newLiveId,
          started_at: startedAt,
          live_path: `/professor/lecture${lectureId}/class${cid}/live${newLiveId}`,
          professor: {
            id: String(user._id),
            name: user.name || "교수",
          },
        });
      }

      return res.status(200).json({
        message: "라이브가 시작되었습니다.",
        lecture_id: lec.lecture_id,
        class_id: cid,
        live_id: newLiveId,
        started_at: startedAt,
        live_path: `/professor/lecture${lectureId}/class${cid}/live${newLiveId}`,
      });
    } catch (err) {
      console.error("라이브 시작 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

router.get(
  "/:lectureId/classes/:classId/live/current",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;
      const cid = Number(classId);

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const isProfessor =
        user.user_type === "professor" &&
        lecture.professor_id.toString() === user._id.toString();
      const isStudent =
        user.user_type === "student" &&
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res.status(403).json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      const cls = lecture.classes.find((c) => Number(c.id) === cid);
      if (!cls) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      if (!cls.isLiveActive || !cls.currentLiveId) {
        return res.json({ active: false });
      }

      const currentLive = (cls.lives || []).find(
        (l) => Number(l.liveId) === Number(cls.currentLiveId)
      );

      return res.json({
        active: true,
        lecture_id: lecture.lecture_id,
        class_id: cid,
        live_id: cls.currentLiveId,
        started_at: currentLive ? currentLive.startedAt : null,
        live_path: `/professor/lecture${lectureId}/class${cid}/live${cls.currentLiveId}`,
      });
    } catch (err) {
      console.error("현재 라이브 조회 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

router.post(
  "/:lectureId/classes/:classId/live/:liveId/end",
  authenticateToken,
  async (req, res) => {
    try {
      await endLiveCore(req, res, "path");
    } catch (err) {
      console.error("라이브 종료(path) 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

router.post(
  "/:lectureId/classes/:classId/live/end",
  authenticateToken,
  async (req, res) => {
    try {
      await endLiveCore(req, res, "current");
    } catch (err) {
      console.error("라이브 종료(current) 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

router.post(
  "/:lectureId/classes/:classId/live/close",
  authenticateToken,
  async (req, res) => {
    try {
      await endLiveCore(req, res, "query");
    } catch (err) {
      console.error("라이브 종료(query) 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

router.post(
  "/lecture/:lectureId/class/:classId/live/:liveId/end",
  authenticateToken,
  (req, res) => endLiveCore(req, res, "path")
);

router.post(
  "/lecture/:lectureId/class/:classId/live/end",
  authenticateToken,
  (req, res) => endLiveCore(req, res, "current")
);

router.post(
  "/lecture/:lectureId/class/:classId/live/close",
  authenticateToken,
  (req, res) => endLiveCore(req, res, "query")
);

module.exports = router;

