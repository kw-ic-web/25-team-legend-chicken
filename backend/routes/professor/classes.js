const express = require("express");
const router = express.Router();
const Lecture = require("../../models/lectures");
const { authenticateToken } = require("../../middleware/auth");
const upload = require("../../config/upload");
const { toAbsoluteUrl, convertMaterialsToAbsolute, convertClassMaterialsToAbsolute, convertClassesMaterialsToAbsolute } = require("../../utils/urlUtils");

router.get(
  "/:lectureId/classes",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ 
          success: false,
          message: "강좌를 찾을 수 없습니다." 
        });
      }

      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res
          .status(403)
          .json({ 
            success: false,
            message: "해당 강좌에 접근할 수 없습니다." 
          });
      }

      const classesWithAbsoluteUrls = convertClassesMaterialsToAbsolute(req, lecture.classes);

      res.status(200).json({
        success: true,
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        classes: classesWithAbsoluteUrls,
      });
    } catch (err) {
      console.error("클래스 조회 오류:", err);
      res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

router.put(
  "/:lectureId/classes",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      
      // req.body 검증
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ 
          success: false,
          message: "요청 본문이 올바르지 않습니다." 
        });
      }

      const { classes } = req.body;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ 
            success: false,
            message: "교수만 클래스를 수정할 수 있습니다." 
          });
      }

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ 
          success: false,
          message: "강좌를 찾을 수 없습니다." 
        });
      }

      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ 
            success: false,
            message: "본인의 강좌만 수정할 수 있습니다." 
          });
      }

      if (!classes || !Array.isArray(classes)) {
        return res
          .status(400)
          .json({ 
            success: false,
            message: "클래스 데이터가 올바르지 않습니다." 
          });
      }

      const classIds = classes.map((cls) => cls.id);
      const uniqueIds = [...new Set(classIds)];
      if (classIds.length !== uniqueIds.length) {
        return res
          .status(400)
          .json({ 
            success: false,
            message: "클래스 ID가 중복됩니다." 
          });
      }

      lecture.classes = classes;
      await lecture.save();

      const classesWithAbsoluteUrls = convertClassesMaterialsToAbsolute(req, lecture.classes);

      res.status(200).json({
        success: true,
        message: "클래스가 성공적으로 수정되었습니다.",
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        classes: classesWithAbsoluteUrls,
      });
    } catch (err) {
      console.error("클래스 수정 오류:", err);
      res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

router.get(
  "/:lectureId/classes/:classId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res
          .status(403)
          .json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      const classData = lecture.classes.find(
        (cls) => cls.id === parseInt(classId)
      );
      
      if (!classData) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      const classWithAbsoluteUrls = convertClassMaterialsToAbsolute(req, classData);

      res.status(200).json({
        success: true,
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class: classWithAbsoluteUrls,
      });
    } catch (err) {
      console.error("클래스 정보 조회 오류:", err);
      res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

router.get(
  "/:lectureId/classes/:classId/pdf",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res
          .status(403)
          .json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      const classData = lecture.classes.find(
        (cls) => cls.id === parseInt(classId)
      );
      
      if (!classData) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      const pdfsWithAbsoluteUrls = convertMaterialsToAbsolute(req, classData.materials || []);

      res.status(200).json({
        success: true,
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class_id: parseInt(classId),
        class_title: classData.title,
        pdf_count: pdfsWithAbsoluteUrls.length,
        pdfs: pdfsWithAbsoluteUrls,
      });
    } catch (err) {
      console.error("PDF 목록 조회 오류:", err);
      res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

router.post(
  "/:lectureId/classes",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      
      // req.body 검증
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ 
          success: false,
          message: "요청 본문이 올바르지 않습니다." 
        });
      }

      const { title, description, date, materials } = req.body;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ 
            success: false,
            message: "교수만 클래스를 추가할 수 있습니다." 
          });
      }

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ 
          success: false,
          message: "강좌를 찾을 수 없습니다." 
        });
      }

      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ 
            success: false,
            message: "본인의 강좌에만 클래스를 추가할 수 있습니다." 
          });
      }

      if (!lecture.classes) {
        lecture.classes = [];
      }

      const existingIds = lecture.classes.map((cls) => cls.id);
      const nextClassId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

      const newClass = {
        id: nextClassId,
        title: title || `새 클래스 ${nextClassId}`,
        description: description || "",
        date: date ? new Date(date) : new Date(),
        materials: materials || [],
        isLiveActive: false,
        currentLiveId: null,
        lives: [],
      };

      lecture.classes.push(newClass);
      await lecture.save();

      // URL 변환
      const classWithAbsoluteUrls = convertClassMaterialsToAbsolute(req, newClass);

      res.status(201).json({
        success: true,
        message: "클래스가 성공적으로 추가되었습니다.",
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class: classWithAbsoluteUrls,
      });
    } catch (err) {
      console.error("클래스 추가 오류:", err);
      res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

router.delete(
  "/:lectureId/classes/:classId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 클래스를 삭제할 수 있습니다." });
      }

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌만 클래스를 삭제할 수 있습니다." });
      }

      if (!lecture.classes || !Array.isArray(lecture.classes)) {
        return res.status(404).json({ message: "클래스를 찾을 수 없습니다." });
      }

      const classIndex = lecture.classes.findIndex(
        (cls) => cls.id === parseInt(classId)
      );

      if (classIndex === -1) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      const deletedClass = lecture.classes[classIndex];
      lecture.classes.splice(classIndex, 1);
      await lecture.save();

      res.status(200).json({
        success: true,
        message: "클래스가 성공적으로 삭제되었습니다.",
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        deleted_class: deletedClass,
      });
    } catch (err) {
      console.error("클래스 삭제 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

router.post(
  "/:lectureId/classes/:classId/uploadpdf",
  authenticateToken,
  upload.single("pdf"),
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 PDF를 업로드할 수 있습니다." });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ message: "PDF 파일을 선택해주세요." });
      }

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌에만 PDF를 업로드할 수 있습니다." });
      }

      const classIndex = lecture.classes.findIndex(
        (cls) => cls.id === parseInt(classId)
      );
      if (classIndex === -1) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      const pdfUrl = `/uploads/pdfs/${req.file.filename}`;

      if (!lecture.classes[classIndex].materials) {
        lecture.classes[classIndex].materials = [];
      }
      lecture.classes[classIndex].materials.push(pdfUrl);

      await lecture.save();

      const absolutePdfUrl = toAbsoluteUrl(req, pdfUrl);
      const materialsWithAbsoluteUrls = convertMaterialsToAbsolute(req, lecture.classes[classIndex].materials);

      res.status(200).json({
        success: true,
        message: "PDF가 성공적으로 업로드되었습니다.",
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class_id: parseInt(classId),
        class_title: lecture.classes[classIndex].title,
        pdf_url: absolutePdfUrl,
        original_pdf_url: absolutePdfUrl,
        filename: req.file.filename,
        materials: materialsWithAbsoluteUrls,
      });
    } catch (err) {
      console.error("PDF 업로드 오류:", err);
      res.status(500).json({ 
        success: false,
        message: "서버 오류가 발생했습니다." 
      });
    }
  }
);

module.exports = router;

