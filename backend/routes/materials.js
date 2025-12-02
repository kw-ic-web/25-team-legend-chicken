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
const { uploadToGridFS } = require("../middleware/uploadToGridFS");
const { uploadFile } = require("../utils/gridfs");
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
      console.log("[materials] GET 요청:", {
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        user: req.user?._id,
      });
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
      // 교안 및 질문 보기에서는 항상 original_pdf_path (원본 교안) 사용
      const pagesWithUrls = pages.map((page) => {
        // original_pdf_path가 없으면 같은 페이지 번호의 다른 상태 페이지에서 찾기
        let originalPdfPath = page.original_pdf_path;
        if (!originalPdfPath) {
          const samePageNumber = pages.find(
            (p) => p.page_number === page.page_number && p.original_pdf_path
          );
          originalPdfPath = samePageNumber?.original_pdf_path;
        }
        
        // 여전히 없으면 materials 배열에서 원본 PDF 찾기
        if (!originalPdfPath) {
          if (materials && materials.length > 0) {
            const firstMaterial = materials[0];
            const materialUrl = typeof firstMaterial === "string" 
              ? firstMaterial 
              : firstMaterial.url;
            // 전체 PDF URL 사용 (프론트엔드에서 페이지 번호 지정)
            originalPdfPath = materialUrl;
          }
        }
        
        // original_pdf_path를 절대 URL로 변환
        const absoluteOriginalPdfPath = originalPdfPath 
          ? toAbsoluteUrl(req, originalPdfPath) 
          : null;
        
        return {
          page_number: page.page_number,
          image_path: toAbsoluteUrl(req, page.image_path),
          pdf_path: toAbsoluteUrl(req, page.pdf_path), // 필기본 (필기본 다운로드용)
          original_pdf_path: absoluteOriginalPdfPath, // 원본 교안 (교안 및 질문 보기용)
          text: page.text || "",
          status: page.status,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        };
      });

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
  uploadToGridFS,
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

      // 원본 PDF를 GridFS에 저장 (이미 uploadToGridFS 미들웨어에서 저장됨)
      if (!req.file?.gridfsUrl) {
        console.error("[materials] GridFS URL이 설정되지 않았습니다. req.file:", {
          hasFile: !!req.file,
          gridfsId: req.file?.gridfsId,
          gridfsUrl: req.file?.gridfsUrl,
          filename: req.file?.filename,
          originalname: req.file?.originalname,
        });
        return res.status(500).json({
          success: false,
          message: "PDF 파일을 GridFS에 저장하는데 실패했습니다.",
        });
      }
      
      const originalPdfUrl = req.file.gridfsUrl; // GridFS URL만 사용
      const originalFileName = req.file.originalname || req.file.filename || "uploaded.pdf";
      
      console.log("[materials] PDF 업로드 시작:", {
        lectureId,
        classId,
        originalFileName,
        gridfsUrl: originalPdfUrl,
        gridfsId: req.file.gridfsId,
      });
      
      // PDF를 페이지별로 분할 (버퍼 사용)
      const pdfBuffer = req.file.buffer;
      const splitted = await splitPdfIntoPages(pdfBuffer, { lectureId, classId });

      // materials에 원본 PDF 정보 추가 (GridFS URL 사용)
      if (!Array.isArray(lecture.classes[idx].materials)) {
        lecture.classes[idx].materials = [];
      }
      const materialObj = {
        url: originalPdfUrl, // GridFS URL
        originalName: originalFileName
      };
      const exists = lecture.classes[idx].materials.some(m => {
        const url = typeof m === 'string' ? m : m.url;
        return url === originalPdfUrl;
      });
      if (!exists) {
        lecture.classes[idx].materials.push(materialObj);
        console.log("[materials] materials 배열에 추가:", materialObj);
      } else {
        console.log("[materials] 중복 PDF 무시:", originalPdfUrl);
      }
      await lecture.save();
      console.log("[materials] Lecture 저장 완료");

      // 기존 페이지 번호 확인
      const lastPage = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: String(classId),
      }).sort({ page_number: -1 });
      const basePageNumber = lastPage ? lastPage.page_number : 0;

      // 각 페이지를 WhiteboardPage에 저장 (GridFS에도 저장)
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

        // 분할된 PDF 페이지를 GridFS에 저장
        let pdfGridfsUrl = page.pdfPath; // 기본값은 파일 시스템 경로
        if (page.buffer) {
          try {
            const pdfGridfsId = await uploadFile(
              page.buffer,
              page.filename,
              "application/pdf",
              {
                lectureId,
                classId: String(classId),
                pageNumber: basePageNumber + i + 1,
                type: "split_pdf_page",
              }
            );
            pdfGridfsUrl = `/api/files/${pdfGridfsId}`;
          } catch (error) {
            console.error(`페이지 ${i + 1} GridFS 저장 실패:`, error);
            // GridFS 저장 실패 시 파일 시스템 경로 사용
          }
        }

        const created = await WhiteboardPage.create({
          lecture_id: lectureId,
          class_id: String(classId),
          page_number: basePageNumber + i + 1,
          image_path: imagePath,
          text: text,
          original_pdf_path: pdfGridfsUrl, // 원본 교안 PDF (GridFS URL)
          pdf_path: pdfGridfsUrl, // 초기에는 원본과 동일 (필기 후 필기+교안 합본으로 업데이트)
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

      // base64 이미지를 버퍼로 변환
      const imageBuffer = Buffer.from(image_data, "base64");
      const fileName = `${lectureId}_${classId}_p${pageNum}_${timestamp}.jpeg`;
      
      // OCR을 위해 임시 파일로 저장 (이미지 변환/OCR 라이브러리가 파일 경로 필요)
      const filePath = path.join(CAPTURE_DIR, fileName);
      await fs.writeFile(filePath, imageBuffer);
      
      // 이미지를 GridFS에 저장
      let imageGridfsUrl = null;
      try {
        const imageGridfsId = await uploadFile(
          imageBuffer,
          fileName,
          "image/jpeg",
          {
            lectureId,
            classId: String(classId),
            pageNumber: pageNum,
            timestamp,
            type: "handwriting_image",
          }
        );
        imageGridfsUrl = `/api/files/${imageGridfsId}`;
      } catch (error) {
        console.error("필기 이미지 GridFS 저장 실패:", error);
        // GridFS 저장 실패 시 파일 시스템 경로 사용
      }

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

      // 원본 PDF 찾기 (필기+교안 합본 생성 전에 필요)
      let originalPdfPath = null;
      const existingPage = await WhiteboardPage.findOne({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: pageNum,
        status: "finalized",
      });

      if (existingPage && existingPage.original_pdf_path) {
        originalPdfPath = existingPage.original_pdf_path;
      } else {
        // 같은 강의의 다른 페이지에서 원본 PDF 찾기
        const otherPage = await WhiteboardPage.findOne({
          lecture_id: lectureId,
          class_id: String(classId),
          original_pdf_path: { $exists: true, $ne: "" },
          status: "finalized",
        }).sort({ page_number: 1 });

        if (otherPage && otherPage.original_pdf_path) {
          originalPdfPath = otherPage.original_pdf_path;
        }
      }

      // 필기+교안 합본 PDF 생성 (원본 PDF가 있으면 합치기, 없으면 필기만)
      let pdfPath;
      if (originalPdfPath) {
        // 원본 PDF와 필기 이미지를 합치기
        try {
          const PDFLib = require("pdf-lib");
          const { downloadFile } = require("../utils/gridfs");
          const https = require("https");
          const http = require("http");
          
          // 원본 PDF 가져오기
          let originalPdfBytes;
          if (originalPdfPath.startsWith("/api/files/")) {
            // GridFS에서 가져오기
            const fileId = originalPdfPath.replace("/api/files/", "");
            const { stream } = await downloadFile(fileId);
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            originalPdfBytes = Buffer.concat(chunks);
          } else if (originalPdfPath.startsWith("http://") || originalPdfPath.startsWith("https://")) {
            // URL에서 다운로드
            const client = originalPdfPath.startsWith("https://") ? https : http;
            originalPdfBytes = await new Promise((resolve, reject) => {
              client.get(originalPdfPath, (res) => {
                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => resolve(Buffer.concat(chunks)));
                res.on("error", reject);
              }).on("error", reject);
            });
          } else {
            // 로컬 파일
            originalPdfBytes = await fs.readFile(toAbsolutePath(originalPdfPath));
          }
          
          // PDFLib로 원본 PDF 로드
          const srcDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
          const pages = srcDoc.getPages();
          
          // 해당 페이지 찾기 (페이지 번호는 1부터 시작)
          const targetPageIndex = pageNum - 1;
          if (targetPageIndex >= 0 && targetPageIndex < pages.length) {
            const targetPage = pages[targetPageIndex];
            const { width, height } = targetPage.getSize();
            
            // 필기 이미지를 PDF에 임베드
            const handwritingImageBytes = await fs.readFile(finalImagePath);
            const handwritingImage = await srcDoc.embedPng(handwritingImageBytes).catch(async () => {
              // PNG 실패 시 JPEG로 시도
              return await srcDoc.embedJpg(handwritingImageBytes);
            });
            
            // 필기 이미지를 페이지 크기에 맞게 조정하여 오버레이
            const imageDims = handwritingImage.scale(1);
            const scaleX = width / imageDims.width;
            const scaleY = height / imageDims.height;
            const scale = Math.min(scaleX, scaleY);
            
            targetPage.drawImage(handwritingImage, {
              x: 0,
              y: 0,
              width: imageDims.width * scale,
              height: imageDims.height * scale,
            });
          }
          
          // 합본 PDF 저장
          const combinedPdfBytes = await srcDoc.save();
          
          // GridFS에 저장
          const timestamp = Date.now();
          const filename = `whiteboard-${lectureId}-${classId}-p${pageNum}-${timestamp}.pdf`;
          const gridfsId = await uploadFile(combinedPdfBytes, filename, "application/pdf", {
            lectureId,
            classId: String(classId),
            pageNumber: pageNum,
            type: "annotated_pdf",
          });
          
          pdfPath = `/api/files/${gridfsId}`;
          console.log(`[materials] 원본 교안과 필기 합본 PDF 생성 완료: ${pdfPath}`);
        } catch (error) {
          console.error("[materials] 원본 교안과 필기 합치기 실패, 필기만 저장:", error);
          // 실패 시 필기만 PDF로 변환
          const result = await createPdfFromImage(finalImagePath, {
            lectureId: lectureId,
            classId: String(classId),
            pageNumber: pageNum,
            saveToGridFS: true,
          });
          pdfPath = result.pdfPath;
        }
      } else {
        // 원본 PDF가 없으면 필기만 PDF로 변환
        const result = await createPdfFromImage(finalImagePath, {
          lectureId: lectureId,
          classId: String(classId),
          pageNumber: pageNum,
          saveToGridFS: true,
        });
        pdfPath = result.pdfPath;
      }

      // WhiteboardPage에 저장 (draft 상태로 저장, 나중에 finalized 가능)
      // 이미지 경로: GridFS URL 우선, 없으면 파일 시스템 경로
      const imagePath = imageGridfsUrl || `/captures/${fileName}`;
      
      const saved = await WhiteboardPage.create({
        lecture_id: lectureId,
        class_id: String(classId),
        page_number: pageNum,
        image_path: imagePath,
        text: normalizedText,
        original_pdf_path: originalPdfPath || "",
        pdf_path: pdfPath, // 필기+교안 합본
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

      // original_pdf_path가 없으면 찾아서 설정
      if (!draftPage.original_pdf_path) {
        const existingFinalizedPage = await WhiteboardPage.findOne({
          lecture_id: lectureId,
          class_id: String(classId),
          page_number: pageNum,
          status: "finalized",
          original_pdf_path: { $exists: true, $ne: "" },
        });

        if (existingFinalizedPage && existingFinalizedPage.original_pdf_path) {
          draftPage.original_pdf_path = existingFinalizedPage.original_pdf_path;
        } else {
          // 같은 강의의 다른 페이지에서 원본 PDF 찾기
          const otherPage = await WhiteboardPage.findOne({
            lecture_id: lectureId,
            class_id: String(classId),
            original_pdf_path: { $exists: true, $ne: "" },
            status: "finalized",
          }).sort({ page_number: 1 });

          if (otherPage && otherPage.original_pdf_path) {
            draftPage.original_pdf_path = otherPage.original_pdf_path;
          }
        }
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

