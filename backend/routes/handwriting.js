const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs-extra");
const { authenticateToken } = require("../middleware/auth");
const { analyzeHandwritingTest, detectHandwritingChanges, filterIncreasedWriting } = require("../services/handwritingDetection");
const WhiteboardPage = require("../models/whiteboardPage");
const { extractTextFromImage } = require("../services/vision");
const { createPdfFromImage } = require("../utils/pdf");

/**
 * POST /api/handwriting/analyze-test
 * handwriting_test 폴더의 이미지들을 분석하여 필기량 증가 감지
 * (테스트용, 추후 페이지 캡쳐 기능과 통합 예정)
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

    const testDir = path.join(__dirname, "../handwriting_test");
    
    if (!(await fs.pathExists(testDir))) {
      return res.status(404).json({
        success: false,
        message: "handwriting_test 폴더를 찾을 수 없습니다.",
      });
    }

    const filteredResults = await analyzeHandwritingTest(testDir);

    return res.status(200).json({
      success: true,
      message: "필기량 분석이 완료되었습니다.",
      total_images: 6,
      filtered_count: filteredResults.length,
      results: filteredResults.map((r) => ({
        index: r.index,
        file: r.file,
        text_length: r.textLength,
        text_preview: r.text.substring(0, 100) + (r.text.length > 100 ? "..." : ""),
        is_page_changed: r.isPageChanged,
      })),
      note: "페이지 캡쳐 기능은 추후 제작 예정입니다.",
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

