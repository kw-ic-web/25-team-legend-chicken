const express = require("express");
const fs = require("fs-extra");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { uploadWhiteboardSnapshot } = require("../config/uploadImage");
const WhiteboardPage = require("../models/whiteboardPage");
const { extractTextFromImage } = require("../services/vision");
const { createPdfFromImage, toAbsolutePath } = require("../utils/pdf");

const tokenize = (text = "") =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9가-힣]/g, ""))
    .filter(Boolean);

const computeSimilarity = (a = "", b = "") => {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1;
  }

  const intersection = [...tokensA].filter((token) => tokensB.has(token));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.length / union.size;
};

const shouldFinalize = (prevText = "", nextText = "") => {
  if (!prevText) return false;
  const similarity = computeSimilarity(prevText, nextText);
  const shortened = nextText.length < prevText.length * 0.4;
  const nextIsAlmostEmpty = nextText.trim().length < 10;

  return similarity < 0.45 || shortened || nextIsAlmostEmpty;
};

const buildPublicPath = (filename) => `/uploads/whiteboard/${filename}`;

router.post(
  "/lectures/:lectureId/classes/:classId/whiteboard/snapshot",
  authenticateToken,
  uploadWhiteboardSnapshot.single("snapshot"),
  async (req, res) => {
    try {
      const { lectureId, classId } = req.params;
      const user = req.user;

      if (user.user_type !== "professor") {
        return res.status(403).json({
          success: false,
          message: "교수만 화이트보드 스냅샷을 업로드할 수 있습니다.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "snapshot 필드에 이미지를 업로드해주세요.",
        });
      }

      const snapshotPath = req.file.path;
      const absoluteSnapshotPath = toAbsolutePath(buildPublicPath(req.file.filename));
      const publicImagePath = buildPublicPath(req.file.filename);

      const { text } = await extractTextFromImage(absoluteSnapshotPath);
      const normalizedText = text || "";

      const draftPage = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: classId,
        status: "draft",
      }).sort({ page_number: -1 });

      const lastPage = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: classId,
      }).sort({ page_number: -1 });

      if (!draftPage) {
        const pageNumber = lastPage ? lastPage.page_number + 1 : 1;

        const created = await WhiteboardPage.create({
          lecture_id: lectureId,
          class_id: classId,
          page_number: pageNumber,
          image_path: publicImagePath,
          text: normalizedText,
          status: "draft",
        });

        return res.status(201).json({
          success: true,
          action: "draft_created",
          page: {
            page_number: created.page_number,
            image_path: created.image_path,
            text: created.text,
            status: created.status,
          },
        });
      }

      if (shouldFinalize(draftPage.text, normalizedText)) {
        const absoluteImagePath = toAbsolutePath(draftPage.image_path);
        const { pdfPath } = await createPdfFromImage(absoluteImagePath, {
          lectureId,
          classId,
          pageNumber: draftPage.page_number,
        });

        draftPage.pdf_path = pdfPath;
        draftPage.status = "finalized";
        await draftPage.save();

        const nextPageNumber = draftPage.page_number + 1;

        const newDraft = await WhiteboardPage.create({
          lecture_id: lectureId,
          class_id: classId,
          page_number: nextPageNumber,
          image_path: publicImagePath,
          text: normalizedText,
          status: "draft",
        });

        return res.json({
          success: true,
          action: "finalized_and_new_draft",
          finalized_page: {
            page_number: draftPage.page_number,
            pdf_path: draftPage.pdf_path,
          },
          draft_page: {
            page_number: newDraft.page_number,
            image_path: newDraft.image_path,
            text: newDraft.text,
          },
        });
      }

      const oldImagePath = toAbsolutePath(draftPage.image_path);
      if (oldImagePath && oldImagePath !== absoluteSnapshotPath) {
        await fs.remove(oldImagePath).catch(() => {});
      }

      draftPage.image_path = publicImagePath;
      draftPage.text = normalizedText;
      await draftPage.save();

      return res.json({
        success: true,
        action: "draft_updated",
        page: {
          page_number: draftPage.page_number,
          image_path: draftPage.image_path,
          text: draftPage.text,
        },
      });
    } catch (error) {
      console.error("화이트보드 스냅샷 처리 오류:", error);
      return res.status(500).json({
        success: false,
        message: "화이트보드 스냅샷을 처리하는 중 오류가 발생했습니다.",
      });
    }
  }
);

module.exports = router;

