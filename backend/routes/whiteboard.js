const express = require("express");
const fs = require("fs-extra");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { uploadWhiteboardSnapshot } = require("../config/uploadImage");
const uploadPdf = require("../config/upload");
const WhiteboardPage = require("../models/whiteboardPage");
const { extractTextFromImage } = require("../services/vision");
const {
  createPdfFromImage,
  toAbsolutePath,
  splitPdfIntoPages,
  extractTextFromPdf,
  convertPdfPageToImage,
} = require("../utils/pdf");
const Lecture = require("../models/lectures");
const { toAbsoluteUrl } = require("../utils/urlUtils");

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

async function canAccess(user, lecture_id) {
  const lec = await Lecture.findOne({ lecture_id });
  if (!lec) return { ok: false, code: 404, msg: "강좌를 찾을 수 없습니다." };
  const isProfessor =
    user.user_type === "professor" && String(lec.professor_id) === String(user._id);
  const isStudent =
    user.user_type === "student" &&
    (lec.student_id_list || []).some((id) => String(id) === String(user._id));
  if (!isProfessor && !isStudent) {
    return { ok: false, code: 403, msg: "해당 강좌에 접근할 수 없습니다." };
  }
  return { ok: true, lec, isProfessor, isStudent };
}

async function handleUploadPdfSplit(req, res) {
  try {
    const { lectureId, classId } = req.params;
    const user = req.user;

    if (user.user_type !== "professor") {
      return res.status(403).json({
        success: false,
        message: "교수만 PDF를 업로드할 수 있습니다.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "pdf 필드에 PDF 파일을 업로드해주세요.",
      });
    }

    const lecture = await Lecture.findOne({ lecture_id: lectureId, professor_id: user._id });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "강좌를 찾을 수 없습니다." });
    }

    const idx = lecture.classes.findIndex((c) => Number(c.id) === Number(classId));
    if (idx < 0) {
      return res.status(404).json({ success: false, message: "해당 클래스를 찾을 수 없습니다." });
    }

    const originalPdfUrl = `/uploads/pdfs/${req.file.filename}`;
    const splitted = await splitPdfIntoPages(req.file.path, { lectureId, classId });
    if (!Array.isArray(lecture.classes[idx].materials)) {
      lecture.classes[idx].materials = [];
    }
    if (!lecture.classes[idx].materials.includes(originalPdfUrl)) {
      lecture.classes[idx].materials.push(originalPdfUrl);
    }
    await lecture.save();

    const lastPage = await WhiteboardPage.findOne({
      lecture_id: lectureId,
      class_id: String(classId),
    }).sort({ page_number: -1 });
    const basePageNumber = lastPage ? lastPage.page_number : 0;

    const createdPages = [];

    for (let i = 0; i < splitted.length; i++) {
      const page = splitted[i];
      const absolutePdfPath = toAbsolutePath(page.pdfPath);
      let text = "";
      try {
        const imageAbsolutePath = await convertPdfPageToImage(absolutePdfPath);
        const { text: ocrText } = await extractTextFromImage(imageAbsolutePath);
        text = ocrText || "";
      } catch (e) {
        console.error("PDF 페이지 OCR 실패, 빈 텍스트로 진행:", e?.message || e);
        text = "";
      }

      const created = await WhiteboardPage.create({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: basePageNumber + i + 1,
        image_path: page.pdfPath,
        text: text,
        pdf_path: page.pdfPath,
        status: "finalized",
      });

      createdPages.push({
        page_number: created.page_number,
        image_path: toAbsoluteUrl(req, created.image_path),
        pdf_path: toAbsoluteUrl(req, created.pdf_path),
        text: created.text,
        status: created.status,
      });
    }

    return res.status(201).json({
      success: true,
      message: "PDF가 업로드되었고, 내부적으로 페이지별 분할 저장되었습니다.",
      lecture_id: lecture.lecture_id,
      lecture_name: lecture.name,
      class_id: Number(classId),
      class_title: lecture.classes[idx].title,
      total_pages: splitted.length,
      pages: createdPages,
      materials_count: lecture.classes[idx].materials.length,
      original_pdf_url: toAbsoluteUrl(req, originalPdfUrl),
      pdf_url: toAbsoluteUrl(req, originalPdfUrl), // 호환성을 위해 유지
    });
  } catch (error) {
    console.error("PDF 분할 업로드 오류:", error);
    return res.status(500).json({
      success: false,
      message: "PDF를 분할 저장하는 중 오류가 발생했습니다.",
    });
  }
}

router.post(
  "/lectures/:lectureId/classes/:classId/whiteboard/upload-pdf",
  authenticateToken,
  uploadPdf.single("pdf"),
  handleUploadPdfSplit
);

router.post(
  "/professor/lectures/:lectureId/classes/:classId/whiteboard/upload-pdf",
  authenticateToken,
  uploadPdf.single("pdf"),
  handleUploadPdfSplit
);

router.get(
  "/lectures/:lectureId/classes/:classId/whiteboard/pages",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId } = req.params;
      const { status = "finalized" } = req.query;
      const access = await canAccess(req.user, lectureId);
      if (!access.ok) return res.status(access.code).json({ message: access.msg });

      const filter = {
        lecture_id: lectureId,
        class_id: String(classId),
      };
      if (status === "finalized" || status === "draft") {
        filter.status = status;
      }

      const pages = await WhiteboardPage.find(filter)
        .sort({ page_number: 1 })
        .select("page_number image_path pdf_path text status createdAt updatedAt")
        .lean();

      return res.json({
        lecture_id: lectureId,
        class_id: Number(classId),
        count: pages.length,
        pages,
      });
    } catch (err) {
      console.error("화이트보드 페이지 목록 조회 오류:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

router.get(
  "/lectures/:lectureId/classes/:classId/whiteboard/pages/latest",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId } = req.params;
      const access = await canAccess(req.user, lectureId);
      if (!access.ok) return res.status(access.code).json({ message: access.msg });

      const page = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: String(classId),
        status: "finalized",
      })
        .sort({ page_number: -1 })
        .select("page_number image_path pdf_path text status createdAt updatedAt")
        .lean();

      if (!page) {
        return res.status(404).json({ message: "최신 finalized 페이지가 없습니다." });
      }

      return res.json({
        lecture_id: lectureId,
        class_id: Number(classId),
        page,
      });
    } catch (err) {
      console.error("최신 화이트보드 페이지 조회 오류:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

module.exports = router;

