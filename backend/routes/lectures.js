const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");

// Class 내 PDF 조회
router.get("/lecture/:lectureId/class/:classId/pdf", authenticateToken, async (req, res) => {});

// 강의 페이지
router.get("/lecture/:lectureId/class/:classId", authenticateToken, async (req, res) => {});

// 실시간 강의 페이지 (webRTC 연결은 추가 예정)
router.get("/lecture/:lectureId/class/:classId/live/:liveId", authenticateToken, async (req, res) => {});

module.exports = router;

