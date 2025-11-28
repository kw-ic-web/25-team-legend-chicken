const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs-extra");
const https = require("https");
const http = require("http");
const { authenticateToken } = require("../middleware/auth");
const { analyzeHandwritingTest, detectHandwritingChanges, filterIncreasedWriting } = require("../services/handwritingDetection");
const WhiteboardPage = require("../models/whiteboardPage");
const { extractTextFromImage } = require("../services/vision");
const { createPdfFromImage, convertPdfPageToImage } = require("../utils/pdf");

// 캡쳐된 이미지를 임시 저장할 디렉토리
const CAPTURE_DIR = path.join(__dirname, "../captures");

// 페이지별 이미지 저장을 위한 맵 (lecture_id + class_id -> page_number -> images[])
const pageImageMap = new Map();

/**
 * POST /api/handwriting/analyze-test
 * base64 이미지를 받아서 분석하고 페이지별로 필터링하여 저장
 * body: { image_data: string (base64), timestamp: number, lecture_id: string, class_id: number, page_number?: number }
 */
router.post("/analyze-test", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (user.user_type !== "professor") {
      return res.status(403).json({
        success: false,
        message: "교수만 필기 분석을 수행할 수 있습니다.",
      });
    }

    const { image_data, timestamp, lecture_id, class_id, page_number, pdf_url } = req.body || {};

    if (!image_data || !timestamp || !lecture_id || class_id === undefined) {
      return res.status(400).json({
        success: false,
        message: "image_data, timestamp, lecture_id, class_id는 필수입니다.",
      });
    }

    // 캡쳐 디렉토리 생성
    await fs.ensureDir(CAPTURE_DIR);

    // base64 이미지를 파일로 저장 (필기만 포함)
    const imageBuffer = Buffer.from(image_data, "base64");
    const fileName = `${lecture_id}_${class_id}_${timestamp}.jpeg`;
    const filePath = path.join(CAPTURE_DIR, fileName);
    await fs.writeFile(filePath, imageBuffer);

    // PDF URL이 있으면 PDF를 다운로드하고 필기와 합치기
    let finalImagePath = filePath;
    if (pdf_url) {
      try {
        // PDF 다운로드
        const pdfBuffer = await new Promise((resolve, reject) => {
          const url = new URL(pdf_url);
          const client = url.protocol === "https:" ? https : http;
          client.get(url, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
          }).on("error", reject);
        });

        // PDF를 임시 파일로 저장
        const pdfTempPath = path.join(CAPTURE_DIR, `temp_${timestamp}.pdf`);
        await fs.writeFile(pdfTempPath, pdfBuffer);

        // PDF를 이미지로 변환 (첫 페이지만)
        const pdfImagePath = await convertPdfPageToImage(pdfTempPath);

        // PDF 이미지와 필기 이미지를 합치기
        // (실제로는 canvas나 이미지 처리 라이브러리가 필요하지만, 일단 필기만 저장)
        // TODO: PDF 이미지와 필기 이미지를 합치는 로직 추가 필요
        finalImagePath = filePath; // 일단 필기만 사용
        
        // 임시 파일 정리
        await fs.remove(pdfTempPath);
        await fs.remove(pdfImagePath).catch(() => {}); // 이미지 파일이 없을 수 있음
      } catch (error) {
        console.error("PDF 다운로드/변환 실패:", error);
        // PDF 처리 실패 시 필기만 저장
        finalImagePath = filePath;
      }
    }

    // 이미지에서 텍스트 추출
    const { text } = await extractTextFromImage(finalImagePath);
    const normalizedText = (text || "").trim();
    const textLength = normalizedText.length;

    // 페이지 번호 결정 (요청에 없으면 1로 기본값)
    const detectedPageNumber = page_number || 1;

    // 페이지별 이미지 맵에 추가
    const mapKey = `${lecture_id}_${class_id}`;
    if (!pageImageMap.has(mapKey)) {
      pageImageMap.set(mapKey, new Map());
    }
    const pageMap = pageImageMap.get(mapKey);
    if (!pageMap.has(detectedPageNumber)) {
      pageMap.set(detectedPageNumber, []);
    }
    const pageImages = pageMap.get(detectedPageNumber);
    
    // 시간순서대로 추가
    pageImages.push({
      timestamp,
      filePath,
      fileName,
      text: normalizedText,
      textLength,
    });
    
    // 시간순 정렬
    pageImages.sort((a, b) => a.timestamp - b.timestamp);

    // 페이지별로 p1-1, p1-2 형식으로 저장
    const pageIndex = pageImages.length; // 현재 페이지에서 몇 번째 이미지인지
    const savedFileName = `p${detectedPageNumber}-${pageIndex}.jpeg`;
    const savedFilePath = path.join(CAPTURE_DIR, savedFileName);
    
    // 최종 이미지 파일 복사 (PDF+필기 또는 필기만)
    await fs.copy(finalImagePath, savedFilePath);

    // PDF 생성
    const { pdfPath } = await createPdfFromImage(savedFilePath, {
      lectureId: lecture_id,
      classId: String(class_id),
      pageNumber: detectedPageNumber,
    });

    // WhiteboardPage에 저장
    const saved = await WhiteboardPage.create({
      lecture_id,
      class_id: String(class_id),
      page_number: detectedPageNumber,
      image_path: `/captures/${savedFileName}`,
      text: normalizedText,
      pdf_path: pdfPath,
      status: "finalized",
    });

    return res.status(200).json({
      success: true,
      message: "필기 분석 및 저장이 완료되었습니다.",
      page_number: detectedPageNumber,
      file_name: savedFileName,
      text_length: textLength,
      saved_page: {
        page_number: saved.page_number,
        image_path: saved.image_path,
        pdf_path: saved.pdf_path,
        text_length: textLength,
      },
    });
  } catch (error) {
    console.error("필기 분석 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

/**
 * POST /api/handwriting/save
 * 필기량이 증가한 이미지들을 화이트보드 페이지로 저장
 * body: { lecture_id, class_id, image_files: [{index, file_path}] }
 */
router.post("/save", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { lecture_id, class_id, image_files } = req.body || {};

    if (user.user_type !== "professor") {
      return res.status(403).json({
        success: false,
        message: "교수만 필기를 저장할 수 있습니다.",
      });
    }

    if (!lecture_id || !class_id || !Array.isArray(image_files) || image_files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "lecture_id, class_id, image_files는 필수입니다.",
      });
    }

    const lastPage = await WhiteboardPage.findOne({
      lecture_id,
      class_id: String(class_id),
    }).sort({ page_number: -1 });

    let currentPageNumber = lastPage ? lastPage.page_number + 1 : 1;
    const savedPages = [];

    for (const imgFile of image_files) {
      const { index, file_path } = imgFile;

      if (!(await fs.pathExists(file_path))) {
        console.warn(`이미지 파일을 찾을 수 없습니다: ${file_path}`);
        continue;
      }

      const { text } = await extractTextFromImage(file_path);
      const normalizedText = (text || "").trim();

      const { pdfPath } = await createPdfFromImage(file_path, {
        lectureId: lecture_id,
        classId: String(class_id),
        pageNumber: currentPageNumber,
      });

      const saved = await WhiteboardPage.create({
        lecture_id,
        class_id: String(class_id),
        page_number: currentPageNumber,
        image_path: file_path,
        text: normalizedText,
        pdf_path: pdfPath,
        status: "finalized",
      });

      savedPages.push({
        page_number: saved.page_number,
        image_path: saved.image_path,
        pdf_path: saved.pdf_path,
        text_length: normalizedText.length,
      });

      currentPageNumber++;
    }

    return res.status(201).json({
      success: true,
      message: `${savedPages.length}개의 필기 페이지가 저장되었습니다.`,
      lecture_id,
      class_id,
      saved_pages: savedPages,
      note: "페이지 캡쳐 기능은 추후 제작 예정입니다.",
    });
  } catch (error) {
    console.error("필기 저장 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

/**
 * POST /api/handwriting/detect-and-save
 * handwriting_test 폴더의 이미지를 분석하고 필기량이 증가한 것만 자동으로 저장
 * body: { lecture_id, class_id }
 */
router.post("/detect-and-save", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const { lecture_id, class_id } = body;

    if (user.user_type !== "professor") {
      return res.status(403).json({
        success: false,
        message: "교수만 필기 분석 및 저장을 수행할 수 있습니다.",
      });
    }

    if (!lecture_id || !class_id) {
      console.log("요청 본문:", JSON.stringify(body, null, 2));
      return res.status(400).json({
        success: false,
        message: "lecture_id, class_id는 필수입니다.",
        received: {
          lecture_id: lecture_id || null,
          class_id: class_id || null,
        },
      });
    }

    const testDir = path.join(__dirname, "../handwriting_test");
    
    if (!(await fs.pathExists(testDir))) {
      return res.status(404).json({
        success: false,
        message: "handwriting_test 폴더를 찾을 수 없습니다.",
      });
    }

    const imageFiles = ["0.jpeg", "1.jpeg", "2.jpeg", "3.jpeg", "4.jpeg", "5.jpeg"];
    const allResults = await detectHandwritingChanges(testDir, imageFiles);
    const filteredResults = filterIncreasedWriting(allResults);

    if (filteredResults.length === 0) {
      return res.status(200).json({
        success: true,
        message: "필기량이 증가한 이미지가 없습니다.",
        analysis: {
          total_images: allResults.length,
          filtered_count: 0,
          all_results: allResults.map((r) => ({
            index: r.index,
            file: r.file,
            text_length: r.textLength,
            text_preview: r.text.substring(0, 100) + (r.text.length > 100 ? "..." : ""),
            is_writing_increased: r.isWritingIncreased,
            is_page_changed: r.isPageChanged,
          })),
        },
      });
    }

    const lastPage = await WhiteboardPage.findOne({
      lecture_id,
      class_id: String(class_id),
    }).sort({ page_number: -1 });

    let currentPageNumber = lastPage ? lastPage.page_number + 1 : 1;
    const savedPages = [];

    for (const result of filteredResults) {
      const imagePath = path.join(testDir, result.file);

      if (!(await fs.pathExists(imagePath))) {
        console.warn(`이미지 파일을 찾을 수 없습니다: ${imagePath}`);
        continue;
      }

      const { pdfPath } = await createPdfFromImage(imagePath, {
        lectureId: lecture_id,
        classId: String(class_id),
        pageNumber: currentPageNumber,
      });

      const publicImagePath = `/handwriting_test/${result.file}`;

      const saved = await WhiteboardPage.create({
        lecture_id,
        class_id: String(class_id),
        page_number: currentPageNumber,
        image_path: publicImagePath,
        text: result.text,
        pdf_path: pdfPath,
        status: "finalized",
      });

      savedPages.push({
        page_number: saved.page_number,
        image_path: saved.image_path,
        pdf_path: saved.pdf_path,
        text_length: result.textLength,
        original_index: result.index,
        original_file: result.file,
      });

      currentPageNumber++;
    }

    return res.status(201).json({
      success: true,
      message: `${savedPages.length}개의 필기 페이지가 저장되었습니다.`,
      lecture_id,
      class_id,
      analysis: {
        total_images: allResults.length,
        filtered_count: filteredResults.length,
        all_results: allResults.map((r) => ({
          index: r.index,
          file: r.file,
          text_length: r.textLength,
          text_preview: r.text.substring(0, 100) + (r.text.length > 100 ? "..." : ""),
          is_writing_increased: r.isWritingIncreased,
          is_page_changed: r.isPageChanged,
        })),
      },
      saved_pages: savedPages,
      note: "페이지 캡쳐 기능은 추후 제작 예정입니다.",
    });
  } catch (error) {
    console.error("필기 감지 및 저장 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

module.exports = router;

