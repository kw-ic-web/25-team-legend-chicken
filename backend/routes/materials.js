const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const Lecture = require("../models/lectures");
const WhiteboardPage = require("../models/whiteboardPage");
const uploadPdf = require("../config/upload");
const {
  splitPdfIntoPages,
  convertPdfPageToImage,
  toAbsolutePath,
  createPdfFromImage,
} = require("../utils/pdf");
const { extractTextFromImage } = require("../services/vision");
const { toAbsoluteUrl, convertMaterialsToAbsolute } = require("../utils/urlUtils");
const { computeSimilarity } = require("../utils/handwritingUtils");
const path = require("path");
const fs = require("fs-extra");

// 캡쳐된 이미지를 임시 저장할 디렉토리
const CAPTURE_DIR = path.join(__dirname, "../captures");
fs.ensureDirSync(CAPTURE_DIR);

/**
 * 강좌/클래스 접근 권한 확인
 */
async function canAccess(user, lectureId) {
  const lecture = await Lecture.findOne({ lecture_id: lectureId });
  if (!lecture) {
    return { ok: false, code: 404, msg: "강좌를 찾을 수 없습니다." };
  }
  const isProfessor =
    user.user_type === "professor" && String(lecture.professor_id) === String(user._id);
  const isStudent =
    user.user_type === "student" &&
    (lecture.student_id_list || []).some((id) => String(id) === String(user._id));
  if (!isProfessor && !isStudent) {
    return { ok: false, code: 403, msg: "해당 강좌에 접근할 수 없습니다." };
  }
  return { ok: true, lecture, isProfessor, isStudent };
}

/**
 * GET /api/lectures/:lectureId/classes/:classId/materials/pages
 * 통일된 교안 조회 API - 페이지별로 반환
 * 교수자/학생 모두 사용 가능
 */
router.get(
  "/lectures/:lectureId/classes/:classId/materials/pages",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId } = req.params;
      const { status = "finalized" } = req.query;

      const access = await canAccess(req.user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ 
          success: false,
          message: access.msg 
        });
      }

      const lecture = access.lecture;
      const classData = lecture.classes.find(
        (cls) => cls.id === parseInt(classId)
      );

      if (!classData) {
        return res.status(404).json({ 
          success: false,
          message: "해당 클래스를 찾을 수 없습니다." 
        });
      }

      // WhiteboardPage에서 페이지별 교안 조회
      const filter = {
        lecture_id: lectureId,
        class_id: String(classId),
      };
      if (status === "finalized" || status === "draft") {
        filter.status = status;
      }

      const pages = await WhiteboardPage.find(filter)
        .sort({ page_number: 1 })
        .lean();

      // materials 배열도 포함 (원본 PDF 정보)
      const materials = convertMaterialsToAbsolute(req, classData.materials || []);

      // 페이지별로 응답 구성
      const pagesWithUrls = pages.map((page) => ({
        page_number: page.page_number,
        image_path: toAbsoluteUrl(req, page.image_path),
        pdf_path: toAbsoluteUrl(req, page.pdf_path),
        text: page.text || "",
        status: page.status,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      }));

      return res.json({
        success: true,
        lecture_id: lectureId,
        lecture_name: lecture.name,
        class_id: parseInt(classId),
        class_title: classData.title,
        total_pages: pagesWithUrls.length,
        pages: pagesWithUrls,
        original_materials: materials, // 원본 PDF 정보 (호환성 유지)
      });
    } catch (err) {
      console.error("교안 페이지 조회 오류:", err);
      return res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

/**
 * GET /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber
 * 특정 페이지의 교안 조회
 */
router.get(
  "/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId, pageNumber } = req.params;
      const pageNum = parseInt(pageNumber);

      if (!Number.isFinite(pageNum) || pageNum < 1) {
        return res.status(400).json({ 
          success: false,
          message: "올바른 페이지 번호를 입력해주세요." 
        });
      }

      const access = await canAccess(req.user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ 
          success: false,
          message: access.msg 
        });
      }

      const page = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: pageNum,
      }).lean();

      if (!page) {
        return res.status(404).json({ 
          success: false,
          message: "해당 페이지를 찾을 수 없습니다." 
        });
      }

      return res.json({
        success: true,
        lecture_id: lectureId,
        class_id: parseInt(classId),
        page: {
          page_number: page.page_number,
          image_path: toAbsoluteUrl(req, page.image_path),
          pdf_path: toAbsoluteUrl(req, page.pdf_path),
          text: page.text || "",
          status: page.status,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        },
      });
    } catch (err) {
      console.error("교안 페이지 조회 오류:", err);
      return res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

/**
 * GET /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting
 * 특정 페이지의 필기 내역 조회 (강의 중간 필기 포함)
 */
router.get(
  "/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId, pageNumber } = req.params;
      const pageNum = parseInt(pageNumber);

      if (!Number.isFinite(pageNum) || pageNum < 1) {
        return res.status(400).json({ 
          success: false,
          message: "올바른 페이지 번호를 입력해주세요." 
        });
      }

      const access = await canAccess(req.user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ 
          success: false,
          message: access.msg 
        });
      }

      // 해당 페이지의 모든 버전 조회 (필기 내역)
      const pages = await WhiteboardPage.find({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: pageNum,
      })
        .sort({ updatedAt: 1 })
        .lean();

      // 현재 finalized된 페이지 찾기
      const finalizedPage = pages.find((p) => p.status === "finalized") || pages[pages.length - 1];

      // 필기 내역 히스토리
      const history = pages.map((page) => ({
        page_number: page.page_number,
        image_path: toAbsoluteUrl(req, page.image_path),
        pdf_path: toAbsoluteUrl(req, page.pdf_path),
        text: page.text || "",
        text_length: (page.text || "").length,
        status: page.status,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      }));

      return res.json({
        success: true,
        lecture_id: lectureId,
        class_id: parseInt(classId),
        page_number: pageNum,
        current_page: finalizedPage ? {
          page_number: finalizedPage.page_number,
          image_path: toAbsoluteUrl(req, finalizedPage.image_path),
          pdf_path: toAbsoluteUrl(req, finalizedPage.pdf_path),
          text: finalizedPage.text || "",
          status: finalizedPage.status,
          updatedAt: finalizedPage.updatedAt,
        } : null,
        history: history,
        total_versions: history.length,
      });
    } catch (err) {
      console.error("필기 내역 조회 오류:", err);
      return res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

/**
 * POST /api/lectures/:lectureId/classes/:classId/materials/upload
 * 통일된 PDF 업로드 API - 자동으로 페이지 분할 및 저장
 * 교수자만 가능
 */
router.post(
  "/lectures/:lectureId/classes/:classId/materials/upload",
  authenticateToken,
  uploadPdf.single("pdf"),
  async (req, res) => {
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

      const access = await canAccess(user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ 
          success: false,
          message: access.msg 
        });
      }

      if (!access.isProfessor) {
        return res.status(403).json({
          success: false,
          message: "본인의 강좌에만 PDF를 업로드할 수 있습니다.",
        });
      }

      const lecture = access.lecture;
      const idx = lecture.classes.findIndex((c) => Number(c.id) === Number(classId));
      if (idx < 0) {
        return res.status(404).json({ 
          success: false, 
          message: "해당 클래스를 찾을 수 없습니다." 
        });
      }

      // PDF를 페이지별로 분할
      const originalPdfUrl = `/uploads/pdfs/${req.file.filename}`;
      const originalFileName = req.file.originalname || req.file.filename;
      const splitted = await splitPdfIntoPages(req.file.path, { lectureId, classId });

      // materials에 원본 PDF 정보 추가
      if (!Array.isArray(lecture.classes[idx].materials)) {
        lecture.classes[idx].materials = [];
      }
      const materialObj = {
        url: originalPdfUrl,
        originalName: originalFileName
      };
      const exists = lecture.classes[idx].materials.some(m => {
        const url = typeof m === 'string' ? m : m.url;
        return url === originalPdfUrl;
      });
      if (!exists) {
        lecture.classes[idx].materials.push(materialObj);
      }
      await lecture.save();

      // 기존 페이지 번호 확인
      const lastPage = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: String(classId),
      }).sort({ page_number: -1 });
      const basePageNumber = lastPage ? lastPage.page_number : 0;

      // 각 페이지를 WhiteboardPage에 저장
      const createdPages = [];
      for (let i = 0; i < splitted.length; i++) {
        const page = splitted[i];
        const absolutePdfPath = toAbsolutePath(page.pdfPath);
        let text = "";
        let imagePath = page.pdfPath;

        try {
          // PDF를 이미지로 변환 및 OCR
          const imageAbsolutePath = await convertPdfPageToImage(absolutePdfPath);
          const path = require("path");
          const relativeImagePath = path.relative(process.cwd(), imageAbsolutePath).replace(/\\/g, "/");
          imagePath = relativeImagePath.startsWith("/") ? relativeImagePath : `/${relativeImagePath}`;
          
          const { text: ocrText } = await extractTextFromImage(imageAbsolutePath);
          text = ocrText || "";
        } catch (e) {
          console.error("[DEBUG] PDF 페이지 OCR 실패:", e?.message || e);
          text = "";
        }

        const created = await WhiteboardPage.create({
          lecture_id: lectureId,
          class_id: String(classId),
          page_number: basePageNumber + i + 1,
          image_path: imagePath,
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
        message: "PDF가 업로드되고 페이지별로 분할 저장되었습니다.",
        lecture_id: lectureId,
        class_name: lecture.name,
        class_id: Number(classId),
        class_title: lecture.classes[idx].title,
        total_pages: splitted.length,
        pages: createdPages,
        original_material: {
          url: toAbsoluteUrl(req, originalPdfUrl),
          originalName: originalFileName,
        },
      });
    } catch (error) {
      console.error("PDF 업로드 오류:", error);
      return res.status(500).json({
        success: false,
        message: "PDF 업로드 중 오류가 발생했습니다.",
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting
 * 페이지별 실시간 필기 저장 및 필기량 증가 확인
 * body: { image_data: string (base64), timestamp: number, pdf_url?: string }
 */
router.post(
  "/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/handwriting",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId, pageNumber } = req.params;
      const pageNum = parseInt(pageNumber);
      const user = req.user;

      if (user.user_type !== "professor") {
        return res.status(403).json({
          success: false,
          message: "교수만 필기를 저장할 수 있습니다.",
        });
      }

      if (!Number.isFinite(pageNum) || pageNum < 1) {
        return res.status(400).json({ 
          success: false,
          message: "올바른 페이지 번호를 입력해주세요." 
        });
      }

      const { image_data, timestamp, pdf_url } = req.body || {};

      if (!image_data || !timestamp) {
        return res.status(400).json({
          success: false,
          message: "image_data, timestamp는 필수입니다.",
        });
      }

      const access = await canAccess(user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ 
          success: false,
          message: access.msg 
        });
      }

      if (!access.isProfessor) {
        return res.status(403).json({
          success: false,
          message: "본인의 강좌에만 필기를 저장할 수 있습니다.",
        });
      }

      // base64 이미지를 파일로 저장
      const imageBuffer = Buffer.from(image_data, "base64");
      const fileName = `${lectureId}_${classId}_p${pageNum}_${timestamp}.jpeg`;
      const filePath = path.join(CAPTURE_DIR, fileName);
      await fs.writeFile(filePath, imageBuffer);

      // PDF URL이 있으면 PDF와 합치기 (향후 구현)
      let finalImagePath = filePath;
      // TODO: PDF 이미지와 필기 이미지 합치기 로직 추가

      // 이미지에서 텍스트 추출
      const { text } = await extractTextFromImage(finalImagePath);
      const normalizedText = (text || "").trim();
      const textLength = normalizedText.length;

      // 해당 페이지의 이전 필기 내역 조회
      const previousPages = await WhiteboardPage.find({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: pageNum,
      })
        .sort({ updatedAt: -1 })
        .limit(1)
        .lean();

      const previousPage = previousPages[0];
      let isWritingIncreased = false;
      let similarity = 1.0;

      if (!previousPage) {
        // 첫 번째 필기
        isWritingIncreased = true;
      } else {
        // 필기량 증가 확인
        const previousText = (previousPage.text || "").trim();
        const previousTextLength = previousText.length;

        similarity = computeSimilarity(previousText, normalizedText);
        const textLengthIncreased = textLength > previousTextLength;
        const significantContentChange = similarity < 0.7 && textLength >= previousTextLength * 0.8;
        const contentAdded = similarity < 0.75 && textLength >= previousTextLength * 0.7;
        
        isWritingIncreased = textLengthIncreased || significantContentChange || contentAdded;

        // 필기량이 증가하지 않았으면 저장하지 않음
        if (!isWritingIncreased) {
          // 임시 파일 삭제
          await fs.remove(filePath).catch(() => {});
          
          return res.status(200).json({
            success: true,
            message: "필기량이 증가하지 않아 저장하지 않습니다.",
            page_number: pageNum,
            is_writing_increased: false,
            previous_text_length: previousTextLength,
            current_text_length: textLength,
            similarity: similarity,
          });
        }
      }

      // PDF 생성
      const { pdfPath } = await createPdfFromImage(finalImagePath, {
        lectureId: lectureId,
        classId: String(classId),
        pageNumber: pageNum,
      });

      // WhiteboardPage에 저장 (draft 상태로 저장, 나중에 finalized 가능)
      const saved = await WhiteboardPage.create({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: pageNum,
        image_path: `/captures/${fileName}`,
        text: normalizedText,
        pdf_path: pdfPath,
        status: "draft", // 실시간 필기는 draft 상태
      });

      return res.status(201).json({
        success: true,
        message: "필기가 저장되었습니다.",
        page_number: pageNum,
        is_writing_increased: isWritingIncreased,
        previous_text_length: previousPage ? (previousPage.text || "").length : 0,
        current_text_length: textLength,
        similarity: similarity,
        saved_page: {
          page_number: saved.page_number,
          image_path: toAbsoluteUrl(req, saved.image_path),
          pdf_path: toAbsoluteUrl(req, saved.pdf_path),
          text_length: textLength,
          status: saved.status,
        },
      });
    } catch (error) {
      console.error("페이지별 필기 저장 오류:", error);
      return res.status(500).json({
        success: false,
        message: "필기 저장 중 오류가 발생했습니다.",
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/finalize
 * 페이지의 draft 필기를 finalized로 변경 (강의 종료 시 사용)
 */
router.put(
  "/lectures/:lectureId/classes/:classId/materials/pages/:pageNumber/finalize",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId, pageNumber } = req.params;
      const pageNum = parseInt(pageNumber);
      const user = req.user;

      if (user.user_type !== "professor") {
        return res.status(403).json({
          success: false,
          message: "교수만 필기를 최종화할 수 있습니다.",
        });
      }

      if (!Number.isFinite(pageNum) || pageNum < 1) {
        return res.status(400).json({ 
          success: false,
          message: "올바른 페이지 번호를 입력해주세요." 
        });
      }

      const access = await canAccess(user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ 
          success: false,
          message: access.msg 
        });
      }

      // 해당 페이지의 최신 draft를 finalized로 변경
      const draftPage = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: pageNum,
        status: "draft",
      }).sort({ updatedAt: -1 });

      if (!draftPage) {
        return res.status(404).json({ 
          success: false,
          message: "최종화할 draft 필기가 없습니다." 
        });
      }

      draftPage.status = "finalized";
      await draftPage.save();

      return res.json({
        success: true,
        message: "필기가 최종화되었습니다.",
        page_number: pageNum,
        page: {
          page_number: draftPage.page_number,
          image_path: toAbsoluteUrl(req, draftPage.image_path),
          pdf_path: toAbsoluteUrl(req, draftPage.pdf_path),
          text: draftPage.text,
          status: draftPage.status,
          updatedAt: draftPage.updatedAt,
        },
      });
    } catch (error) {
      console.error("필기 최종화 오류:", error);
      return res.status(500).json({
        success: false,
        message: "필기 최종화 중 오류가 발생했습니다.",
        error: error.message,
      });
    }
  }
);

module.exports = router;

