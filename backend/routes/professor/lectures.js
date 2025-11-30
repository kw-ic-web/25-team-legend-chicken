const express = require("express");
const router = express.Router();
const Lecture = require("../../models/lectures");
const { authenticateToken } = require("../../middleware/auth");
const crypto = require("crypto");
const { uploadThumbnail } = require("../../config/uploadImage");
const { uploadToGridFS } = require("../../middleware/uploadToGridFS");
const { convertClassesMaterialsToAbsolute } = require("../../utils/urlUtils");

router.post(
  "/create",
  authenticateToken,
  uploadThumbnail.single("thumbnail"),
  uploadToGridFS,
  async (req, res) => {
    try {
      const user = req.user;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 강의를 개설할 수 있습니다." });
      }

      const lecture_id =
        "LEC-" + crypto.randomBytes(4).toString("hex").toUpperCase();

      const {
        name,
        schedule,
        student_count,
        professor_name,
        professor_email,
        professor_phone,
        lecture_description,
        learning_method,
        target_audience,
        references,
        classes,
      } = req.body;

      let thumbnailUrl = "";
      if (req.file && req.file.gridfsUrl) {
        thumbnailUrl = req.file.gridfsUrl; // GridFS URL 사용
      }

      let parsedReferences = [];
      if (references) {
        try {
          parsedReferences = typeof references === "string" 
            ? JSON.parse(references) 
            : references;
        } catch (e) {
          parsedReferences = [];
        }
      }

      let parsedClasses = [];
      if (classes) {
        try {
          parsedClasses = typeof classes === "string" 
            ? JSON.parse(classes) 
            : classes;
        } catch (e) {
          parsedClasses = [];
        }
      }

      const lecture = new Lecture({
        lecture_id,
        name,
        schedule,
        student_count,
        professor_name,
        professor_email,
        professor_phone,
        lecture_description,
        learning_method,
        target_audience,
        references: parsedReferences,
        classes: parsedClasses || [],
        thumbnail: thumbnailUrl,
        professor_id: user._id,
        student_id_list: [],
      });

      await lecture.save();
      res
        .status(201)
        .json({ message: "강의가 성공적으로 개설되었습니다.", lecture });
    } catch (err) {
      console.error("강의 개설 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

router.get(
  "/search",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;

      let lectures = [];
      if (user.user_type === "professor") {
        lectures = await Lecture.find({ professor_id: user._id });
      } else if (user.user_type === "student") {
        lectures = await Lecture.find({ student_id_list: user._id });
      } else {
        return res.status(403).json({ message: "잘못된 회원 유형입니다." });
      }

      const formattedLectures = lectures.map(lecture => {
        const formattedClasses = lecture.classes.map(cls => {
          const lives = Array.isArray(cls.lives) ? cls.lives : [];
          
          const classResponse = {
            id: cls.id,
            title: cls.title,
            description: cls.description || "",
            date: cls.date,
            materials: cls.materials || [],
            _id: cls._id,
          };

          if (cls.isLiveActive && cls.currentLiveId) {
            classResponse.isLiveActive = true;
            classResponse.currentLiveId = cls.currentLiveId;
            classResponse.lives = lives.map(live => ({
              liveId: live.liveId,
              status: live.status,
              startedAt: live.startedAt,
              endedAt: live.endedAt || null,
            }));
          } else if (lives.length > 0) {
            classResponse.isLiveActive = false;
            classResponse.currentLiveId = null;
            classResponse.lives = lives.map(live => ({
              liveId: live.liveId,
              status: live.status,
              startedAt: live.startedAt,
              endedAt: live.endedAt || null,
            }));
          } else {
            classResponse.isLiveActive = false;
            classResponse.currentLiveId = null;
            classResponse.lives = [];
          }

          return classResponse;
        });

        return {
          ...lecture.toObject(),
          classes: convertClassesMaterialsToAbsolute(req, formattedClasses),
        };
      });

      res.status(200).json({ lectures: formattedLectures });
    } catch (err) {
      console.error("강의 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

router.get(
  "/:lectureId/live-status",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res.status(403).json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      const classesLiveStatus = lecture.classes.map(cls => {
        const lives = Array.isArray(cls.lives) ? cls.lives : [];
        
        const classStatus = {
          class_id: cls.id,
          class_title: cls.title,
        };

        if (cls.isLiveActive && cls.currentLiveId) {
          classStatus.isLiveActive = true;
          classStatus.currentLiveId = cls.currentLiveId;
          classStatus.lives = lives.map(live => ({
            liveId: live.liveId,
            status: live.status,
            startedAt: live.startedAt,
            endedAt: live.endedAt || null,
          }));
        } else if (lives.length > 0) {
          classStatus.isLiveActive = false;
          classStatus.currentLiveId = null;
          classStatus.lives = lives.map(live => ({
            liveId: live.liveId,
            status: live.status,
            startedAt: live.startedAt,
            endedAt: live.endedAt || null,
          }));
        } else {
          classStatus.isLiveActive = false;
          classStatus.currentLiveId = null;
          classStatus.lives = [];
        }

        return classStatus;
      });

      res.status(200).json({
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        classes: classesLiveStatus,
      });
    } catch (err) {
      console.error("라이브 상태 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

module.exports = router;

