const express = require("express");
const router = express.Router();
const { downloadFile } = require("../utils/gridfs");

/**
 * GET /api/files/:fileId
 * GridFS에서 파일 다운로드
 */
router.get("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ message: "파일 ID가 필요합니다." });
    }

    const { stream, metadata } = await downloadFile(fileId);

    // Content-Type 설정
    res.setHeader("Content-Type", metadata.contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(metadata.filename)}"`
    );
    res.setHeader("Content-Length", metadata.length);

    // 스트림을 응답으로 파이프
    stream.on("error", (error) => {
      console.error("파일 스트리밍 오류:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "파일 스트리밍 오류가 발생했습니다." });
      }
    });

    stream.pipe(res);
  } catch (error) {
    console.error("파일 다운로드 오류:", error);
    if (!res.headersSent) {
      if (error.message === "파일을 찾을 수 없습니다.") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: "파일 다운로드 중 오류가 발생했습니다." });
    }
  }
});

module.exports = router;

