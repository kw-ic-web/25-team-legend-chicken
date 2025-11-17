const express = require("express");
const router = express.Router();
const Lecture = require("../models/lectures");
const User = require("../models/user");
const { authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");
const upload = require("../config/upload");
const { uploadThumbnail } = require("../config/uploadImage");
const OpenAI = require("openai");
const Question = require("../models/Question"); // Question 모델 추가

// 강의 개설
router.post(
  "/lectures/create",
  authenticateToken,
  uploadThumbnail.single("thumbnail"),
  async (req, res) => {
    try {
      const user = req.user;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 강의를 개설할 수 있습니다." });
      }

      // lecture_id 자동 생성 (고유)
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
        classes, // 주차별 강의 목록
      } = req.body;

      // 썸네일 이미지 URL 설정
      let thumbnailUrl = "";
      if (req.file) {
        thumbnailUrl = `/uploads/images/${req.file.filename}`;
      }

      // references 파싱 (JSON 문자열인 경우)
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

      // classes 파싱 (JSON 문자열인 경우)
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
        classes: parsedClasses || [], // 주차별 강의 목록 (없으면 빈 배열)
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

// 강의 조회
router.get(
  "/lectures/search",
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

      // 각 강좌의 클래스별 라이브 상태 정리
      const formattedLectures = lectures.map(lecture => {
        const formattedClasses = lecture.classes.map(cls => {
          // lives 배열이 없으면 빈 배열로 초기화
          const lives = Array.isArray(cls.lives) ? cls.lives : [];
          
          // 기본 클래스 정보
          const classResponse = {
            id: cls.id,
            title: cls.title,
            description: cls.description || "",
            date: cls.date,
            materials: cls.materials || [],
            _id: cls._id,
          };

          // 라이브 상태에 따라 다른 값 반환
          if (cls.isLiveActive && cls.currentLiveId) {
            // 라이브 중
            classResponse.isLiveActive = true;
            classResponse.currentLiveId = cls.currentLiveId;
            classResponse.lives = lives.map(live => ({
              liveId: live.liveId,
              status: live.status,
              startedAt: live.startedAt,
              endedAt: live.endedAt || null,
            }));
          } else if (lives.length > 0) {
            // 라이브 끝남 (이전에 진행된 바 있음) - 클래스 3의 경우
            classResponse.isLiveActive = false;
            classResponse.currentLiveId = null;
            classResponse.lives = lives.map(live => ({
              liveId: live.liveId,
              status: live.status,
              startedAt: live.startedAt,
              endedAt: live.endedAt || null,
            }));
          } else {
            // 라이브 전 (한 번도 진행된 적 없음) - 클래스 4의 경우
            classResponse.isLiveActive = false;
            classResponse.currentLiveId = null;
            classResponse.lives = [];
          }

          return classResponse;
        });

        return {
          ...lecture.toObject(),
          classes: formattedClasses,
        };
      });

      res.status(200).json({ lectures: formattedLectures });
    } catch (err) {
      console.error("강의 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// 특정 강좌의 라이브 상태 조회
router.get(
  "/lectures/:lectureId/live-status",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 권한 확인
      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res.status(403).json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      // 각 클래스의 라이브 상태만 간단하게 반환
      const classesLiveStatus = lecture.classes.map(cls => {
        const lives = Array.isArray(cls.lives) ? cls.lives : [];
        
        const classStatus = {
          class_id: cls.id,
          class_title: cls.title,
        };

        // 라이브 상태에 따라 다른 값 반환
        if (cls.isLiveActive && cls.currentLiveId) {
          // 라이브 중
          classStatus.isLiveActive = true;
          classStatus.currentLiveId = cls.currentLiveId;
          classStatus.lives = lives.map(live => ({
            liveId: live.liveId,
            status: live.status,
            startedAt: live.startedAt,
            endedAt: live.endedAt || null,
          }));
        } else if (lives.length > 0) {
          // 라이브 끝남 (이전에 진행된 바 있음)
          classStatus.isLiveActive = false;
          classStatus.currentLiveId = null;
          classStatus.lives = lives.map(live => ({
            liveId: live.liveId,
            status: live.status,
            startedAt: live.startedAt,
            endedAt: live.endedAt || null,
          }));
        } else {
          // 라이브 전 (한 번도 진행된 적 없음)
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

// 강좌 멤버 조회 (수강 학생 목록 및 초대 링크)
router.get(
  "/lectures/:lectureId/check_member",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 접근할 수 있습니다." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 교수의 강좌인지 확인
      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌만 조회할 수 있습니다." });
      }

      // 학생 정보 조회
      const students = await User.find({
        _id: { $in: lecture.student_id_list },
        user_type: "student",
      }).select("name email phone");

      // 초대 링크 생성
      const inviteLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/join-lecture/${lectureId}`;

      res.status(200).json({
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        student_count: students.length,
        max_students: lecture.student_count,
        students: students.map((student) => ({
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
        })),
        invite_link: inviteLink,
      });
    } catch (err) {
      console.error("멤버 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 학생 초대 (이메일로 초대)
router.post(
  "/lectures/:lectureId/invite_student",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      const { student_email } = req.body;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 학생을 초대할 수 있습니다." });
      }

      // 이메일 필수 확인
      if (!student_email) {
        return res
          .status(400)
          .json({ message: "학생 이메일을 입력해주세요." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 교수의 강좌인지 확인
      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌에만 학생을 초대할 수 있습니다." });
      }

      // 학생 계정 조회
      const student = await User.findOne({
        email: student_email,
        user_type: "student",
      });

      if (!student) {
        return res.status(404).json({
          message: "해당 이메일의 학생 계정을 찾을 수 없습니다.",
        });
      }

      // 이미 등록된 학생인지 확인
      if (lecture.student_id_list.includes(student._id)) {
        return res
          .status(400)
          .json({ message: "이미 해당 강좌에 등록된 학생입니다." });
      }

      // 수강 인원 초과 확인
      if (lecture.student_id_list.length >= lecture.student_count) {
        return res
          .status(400)
          .json({ message: "수강 인원이 가득 찼습니다." });
      }

      // 학생 추가
      lecture.student_id_list.push(student._id);
      await lecture.save();

      res.status(200).json({
        message: "학생이 성공적으로 초대되었습니다.",
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
        },
        current_count: lecture.student_id_list.length,
        max_count: lecture.student_count,
      });
    } catch (err) {
      console.error("학생 초대 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 강좌의 클래스(주차별 강의) 수정
router.put(
  "/lectures/:lectureId/classes",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      const { classes } = req.body;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 클래스를 수정할 수 있습니다." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 교수의 강좌인지 확인
      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌만 수정할 수 있습니다." });
      }

      // 클래스 데이터 검증
      if (!classes || !Array.isArray(classes)) {
        return res
          .status(400)
          .json({ message: "클래스 데이터가 올바르지 않습니다." });
      }

      // 클래스 ID 중복 확인
      const classIds = classes.map((cls) => cls.id);
      const uniqueIds = [...new Set(classIds)];
      if (classIds.length !== uniqueIds.length) {
        return res
          .status(400)
          .json({ message: "클래스 ID가 중복됩니다." });
      }

      // 클래스 업데이트
      lecture.classes = classes;
      await lecture.save();

      res.status(200).json({
        message: "클래스가 성공적으로 수정되었습니다.",
        lecture_id: lecture.lecture_id,
        classes: lecture.classes,
      });
    } catch (err) {
      console.error("클래스 수정 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// 강좌의 클래스 목록 조회
router.get(
  "/lectures/:lectureId/classes",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 교수이거나 수강생인지 확인
      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res
          .status(403)
          .json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      res.status(200).json({
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        classes: lecture.classes,
      });
    } catch (err) {
      console.error("클래스 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 특정 클래스(주차별 강의) 정보 조회
router.get(
  "/lectures/:lectureId/classes/:classId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 교수이거나 수강생인지 확인
      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res
          .status(403)
          .json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      // 클래스 ID로 해당 클래스 찾기
      const classData = lecture.classes.find(
        (cls) => cls.id === parseInt(classId)
      );
      
      if (!classData) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      res.status(200).json({
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class: classData,
      });
    } catch (err) {
      console.error("클래스 정보 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 특정 클래스의 PDF 목록 조회
router.get(
  "/lectures/:lectureId/classes/:classId/pdf",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 교수이거나 수강생인지 확인
      const isProfessor = user.user_type === "professor" && 
        lecture.professor_id.toString() === user._id.toString();
      const isStudent = user.user_type === "student" && 
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res
          .status(403)
          .json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      // 클래스 ID로 해당 클래스 찾기
      const classData = lecture.classes.find(
        (cls) => cls.id === parseInt(classId)
      );
      
      if (!classData) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      res.status(200).json({
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class_id: parseInt(classId),
        class_title: classData.title,
        pdf_count: classData.materials ? classData.materials.length : 0,
        pdfs: classData.materials || [],
      });
    } catch (err) {
      console.error("PDF 목록 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// 강의 생성 (Class 생성)
router.post("/lecture/:lectureId/class/:classId/create", authenticateToken, async (req, res) => {});

// 강의 초대 페이지
router.get("/lecture/:lectureId/class/invite", authenticateToken, async (req, res) => {});

// PDF 업로드
router.post(
  "/lectures/:lectureId/classes/:classId/uploadpdf",
  authenticateToken,
  upload.single("pdf"),
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 PDF를 업로드할 수 있습니다." });
      }

      // 파일이 업로드되었는지 확인
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "PDF 파일을 선택해주세요." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 교수의 강좌인지 확인
      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌에만 PDF를 업로드할 수 있습니다." });
      }

      // 클래스 ID로 해당 클래스 찾기
      const classIndex = lecture.classes.findIndex(
        (cls) => cls.id === parseInt(classId)
      );
      if (classIndex === -1) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      // PDF URL 생성
      const pdfUrl = `/uploads/pdfs/${req.file.filename}`;

      // 클래스의 materials 배열에 PDF URL 추가
      if (!lecture.classes[classIndex].materials) {
        lecture.classes[classIndex].materials = [];
      }
      lecture.classes[classIndex].materials.push(pdfUrl);

      await lecture.save();

      res.status(200).json({
        message: "PDF가 성공적으로 업로드되었습니다.",
        lecture_id: lecture.lecture_id,
        class_id: parseInt(classId),
        class_title: lecture.classes[classIndex].title,
        pdf_url: pdfUrl,
        filename: req.file.filename,
        materials: lecture.classes[classIndex].materials,
      });
    } catch (err) {
      console.error("PDF 업로드 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ✅ 분석 리포트 생성 (GPT 활용)
router.get(
  "/lectures/:lectureId/classes/:classId/report",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 리포트를 생성할 수 있습니다." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 교수의 강좌인지 확인
      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌만 리포트를 생성할 수 있습니다." });
      }

      // 클래스 ID로 해당 클래스 찾기
      const classData = lecture.classes.find(
        (cls) => cls.id === parseInt(classId)
      );
      
      if (!classData) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      // 가상의 학생 질문 데이터 생성
      const mockQuestions = [
        {
          student_name: "김학생",
          question: `${classData.title}에 대해 제가 이해한 게 맞는지 확인하고 싶습니다.`,
          timestamp: new Date().toISOString(),
        },
        {
          student_name: "이학생",
          question: `${classData.title} 수업 내용을 다시 정리해주실 수 있나요?`,
          timestamp: new Date().toISOString(),
        },
        {
          student_name: "박학생",
          question: `${classData.description || classData.title}와 관련해서 추가 자료가 있을까요?`,
          timestamp: new Date().toISOString(),
        },
        {
          student_name: "최학생",
          question: `다음 주차 내용을 미리 예습하고 싶은데, 어떤 부분을 중점적으로 봐야 할까요?`,
          timestamp: new Date().toISOString(),
        },
      ];

      // OpenAI 클라이언트 초기화
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
      if (!apiKey) {
        return res.status(500).json({
          message: "OpenAI API 키가 설정되지 않았습니다. .env 파일에 OPENAI_API_KEY 또는 OPENAI_API를 설정해주세요.",
        });
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        timeout: 60000, // 60초 타임아웃 설정
        maxRetries: 2, // 최대 2번 재시도
      });

      // GPT에게 리포트 생성을 위한 프롬프트 작성
      const prompt = `당신은 강의 분석 전문가입니다. 아래 학생들의 질문을 분석하여 강의 리포트를 작성해주세요.

강의 정보:
- 강의명: ${lecture.name}
- 클래스 제목: ${classData.title}
- 클래스 설명: ${classData.description || "설명 없음"}
- 수강 인원: ${lecture.student_id_list.length}명

학생 질문:
${mockQuestions.map((q, idx) => `${idx + 1}. [${q.student_name}] ${q.question}`).join('\n')}

다음 형식으로 리포트를 작성해주세요:
1. 질문 분석 요약 (각 질문의 주요 내용과 패턴 분석)
2. 학습 이해도 평가 (전반적인 학생들의 이해도 수준)
3. 개선 제안 (교수자에게 제안할 수 있는 강의 개선 방안)
4. 다음 주차 준비 사항 (학생들의 질문 패턴을 바탕으로 한 다음 주차 수업 준비 권장사항)

한국어로 전문적이고 상세하게 작성해주세요.`;

      // GPT API 호출 (타임아웃 및 에러 처리 개선)
      let reportContent;
      let usage = null; // 토큰 사용량 저장
      try {
        console.log("📤 GPT API 호출 시작...");
        console.log(`📋 요청 모델: gpt-4o-mini`);
        console.log(`📊 요청 토큰 수 (예상): ${Math.ceil(prompt.length / 4)}`); // 대략적인 토큰 수 추정
        
        const completion = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "당신은 교육 전문가로서 학생 질문을 분석하고 강의 리포트를 작성하는 전문가입니다.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1500, // 토큰 수를 줄여서 응답 시간 단축
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("API 호출 타임아웃")), 55000)
          ),
        ]);

        // 토큰 사용량 확인
        usage = completion.usage;
        console.log("✅ GPT API 호출 성공!");
        console.log(`📊 토큰 사용량:`);
        console.log(`   - Prompt 토큰: ${usage.prompt_tokens}`);
        console.log(`   - Completion 토큰: ${usage.completion_tokens}`);
        console.log(`   - 총 토큰: ${usage.total_tokens}`);
        console.log(`   - 예상 비용: $${((usage.prompt_tokens * 0.00015) + (usage.completion_tokens * 0.0006)) / 1000} (대략적)`);

        reportContent = completion.choices[0].message.content;
      } catch (gptError) {
        // 타임아웃 또는 네트워크 오류 시 기본 리포트 생성
        console.error("❌ GPT API 호출 오류:", gptError.message || gptError);
        if (gptError.response) {
          console.error("   상세 정보:", gptError.response.data);
        }
        reportContent = `## 리포트 생성 중 오류 발생

GPT API 호출 중 문제가 발생하여 기본 리포트를 제공합니다.

### 질문 분석 요약
총 ${mockQuestions.length}개의 질문이 분석되었습니다. 학생들의 주요 관심사는 다음과 같습니다:
- ${classData.title}에 대한 이해도 확인 요청
- 수업 내용 재정리 요청
- 추가 학습 자료 요청
- 다음 주차 예습 관련 문의

### 학습 이해도 평가
현재 수강 인원: ${lecture.student_id_list.length}명
질문을 통해 확인된 학생들의 이해도 수준: 중상

### 개선 제안
1. 추가 자료 제공 권장
2. 실습 예제 보강
3. 다음 주차 내용 미리 안내

### 다음 주차 준비 사항
- 학생들의 질문 패턴을 고려한 추가 자료 준비
- 실습 예제 및 연습 문제 확대
- Q&A 세션 시간 확보

*주의: 이 리포트는 GPT API 호출 실패로 인해 기본 템플릿으로 생성되었습니다.`;
      }

      // 리포트 응답 구성
      const response = {
        message: "분석 리포트가 성공적으로 생성되었습니다.",
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class_id: parseInt(classId),
        class_title: classData.title,
        generated_at: new Date().toISOString(),
        analysis_period: {
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
        },
        student_count: lecture.student_id_list.length,
        questions_analyzed: mockQuestions.length,
        questions: mockQuestions,
        report: {
          summary: reportContent,
          sections: {
            question_analysis: "질문 분석 요약이 포함되어 있습니다.",
            understanding_level: "학습 이해도 평가가 포함되어 있습니다.",
            improvement_suggestions: "개선 제안이 포함되어 있습니다.",
            next_week_preparation: "다음 주차 준비 사항이 포함되어 있습니다.",
          },
        },
      };

      // 토큰 사용량이 있으면 응답에 포함
      if (usage) {
        response.usage = {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          estimated_cost: ((usage.prompt_tokens * 0.00015) + (usage.completion_tokens * 0.0006)) / 1000, // 대략적인 비용 (USD)
        };
      }

      res.status(200).json(response);
    } catch (err) {
      console.error("리포트 생성 오류:", err);
      
      // OpenAI API 오류 처리
      if (err instanceof OpenAI.APIError) {
        return res.status(500).json({
          message: "OpenAI API 오류가 발생했습니다.",
          error: err.message,
          details: err.status || "알 수 없는 오류",
        });
      }

      // 네트워크 오류 처리 (socket hang up 등)
      if (err.code === 'ECONNRESET' || err.message?.includes('hang up') || err.message?.includes('timeout')) {
        return res.status(504).json({
          message: "GPT API 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.",
          error: "Network timeout or connection reset",
        });
      }

      // 타임아웃 오류 처리
      if (err.message?.includes('timeout') || err.message?.includes('타임아웃')) {
        return res.status(504).json({
          message: "GPT API 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
          error: "Request timeout",
        });
      }

      res.status(500).json({
        message: "서버 오류가 발생했습니다.",
        error: err.message || "알 수 없는 오류",
      });
    }
  }
);
// ───────────────────────────────────────────────────────────
// 라이브: 시작 / 현재 / 종료 (3가지 종료 경로 지원)
// ───────────────────────────────────────────────────────────

// 공통 종료 로직 (문서 수정 + save() 방식)
async function endLiveCore(req, res, liveIdSource /* 'path' | 'current' | 'query' */) {
  const user = req.user;
  const { lectureId, classId } = req.params;
  const cid = Number(classId);

  if (user.user_type !== "professor") {
    return res.status(403).json({ message: "교수만 라이브를 종료할 수 있습니다." });
  }

  console.log("[END LIVE] method=%s url=%s", req.method, req.originalUrl);

  // 교수 본인 강좌 조회 (전체 문서 가져옴)
  const lec = await Lecture.findOne({ lecture_id: lectureId, professor_id: user._id });
  if (!lec) {
    return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
  }

  const idx = lec.classes.findIndex((c) => Number(c.id) === cid);
  if (idx < 0) {
    return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
  }

  const cls = lec.classes[idx];

  // liveId 결정
  let lid = null;
  if (liveIdSource === "path") {
    lid = Number(req.params.liveId);
  } else if (liveIdSource === "query") {
    lid = Number(req.query.liveId);
  } else if (liveIdSource === "current") {
    if (!cls.isLiveActive || !cls.currentLiveId) {
      return res.status(409).json({ message: "진행 중인 라이브가 없습니다." });
    }
    lid = Number(cls.currentLiveId);
  }

  if (!Number.isFinite(lid)) {
    return res.status(400).json({ message: "liveId가 올바르지 않습니다." });
  }

  // lives 배열에서 해당 세션 찾기
  if (!Array.isArray(cls.lives)) {
    cls.lives = [];
  }
  const live = cls.lives.find((l) => Number(l.liveId) === lid);
  if (!live) {
    return res.status(404).json({ message: "해당 라이브 세션을 찾을 수 없습니다." });
  }

  // 종료 처리
  const endedAt = new Date(); 
  live.status = "closed";
  live.endedAt = new Date();
  cls.isLiveActive = false;
  cls.currentLiveId = null;

  await lec.save();

  return res.status(200).json({
    message: "라이브가 종료되었습니다.",
    lecture_id: lec.lecture_id,
    class_id: cid,
    live_id: lid,
    started_at: live.startedAt, 
    ended_at: endedAt,
  });
}

// ▶ 라이브 시작 (문서 수정 + save() 방식)
router.post(
  "/lectures/:lectureId/classes/:classId/live/start",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;
      const cid = Number(classId);

      if (user.user_type !== "professor") {
        return res.status(403).json({ message: "교수만 라이브를 시작할 수 있습니다." });
      }

      // 교수 본인 강좌 전체 문서 가져오기
      const lec = await Lecture.findOne({ lecture_id: lectureId, professor_id: user._id });
      if (!lec) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const idx = lec.classes.findIndex((c) => Number(c.id) === cid);
      if (idx < 0) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      const cls = lec.classes[idx];

      if (cls.isLiveActive) {
        return res.status(409).json({ message: "이미 진행 중인 라이브가 있습니다." });
      }

      // liveSeq 증가 및 새 liveId 생성
      cls.liveSeq = (cls.liveSeq || 0) + 1;
      const newLiveId = cls.liveSeq;

      // lives 배열 초기화
      if (!Array.isArray(cls.lives)) {
        cls.lives = [];
      }

      const startedAt = new Date();

      cls.lives.push({
        liveId: newLiveId,
        status: "open",
        startedAt: new Date(),
      });

      cls.isLiveActive = true;
      cls.currentLiveId = newLiveId;

      await lec.save();

      return res.status(200).json({
        message: "라이브가 시작되었습니다.",
        lecture_id: lec.lecture_id,
        class_id: cid,
        live_id: newLiveId,
        started_at: startedAt,
        live_path: `/professor/lecture${lectureId}/class${cid}/live${newLiveId}`,
      });
    } catch (err) {
      console.error("라이브 시작 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

// ▶ 현재 라이브 조회
router.get(
  "/lectures/:lectureId/classes/:classId/live/current",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;
      const cid = Number(classId);

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const isProfessor =
        user.user_type === "professor" &&
        lecture.professor_id.toString() === user._id.toString();
      const isStudent =
        user.user_type === "student" &&
        lecture.student_id_list.includes(user._id);

      if (!isProfessor && !isStudent) {
        return res.status(403).json({ message: "해당 강좌에 접근할 수 없습니다." });
      }

      const cls = lecture.classes.find((c) => Number(c.id) === cid);
      if (!cls) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      if (!cls.isLiveActive || !cls.currentLiveId) {
        return res.json({ active: false });
      }

      // ✅ 여기서 currentLive를 "선언 + 할당"
      const currentLive = (cls.lives || []).find(
        (l) => Number(l.liveId) === Number(cls.currentLiveId)
      );

      return res.json({
        active: true,
        lecture_id: lecture.lecture_id,
        class_id: cid,
        live_id: cls.currentLiveId,
        started_at: currentLive ? currentLive.startedAt : null,
        live_path: `/professor/lecture${lectureId}/class${cid}/live${cls.currentLiveId}`,
      });
    } catch (err) {
      console.error("현재 라이브 조회 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);


// ▶ 라이브 종료 (A: 경로에 liveId 포함)
router.post(
  "/lectures/:lectureId/classes/:classId/live/:liveId/end",
  authenticateToken,
  async (req, res) => {
    try {
      await endLiveCore(req, res, "path");
    } catch (err) {
      console.error("라이브 종료(path) 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

// ▶ 라이브 종료 (B: 현재 진행 중 자동 종료)
router.post(
  "/lectures/:lectureId/classes/:classId/live/end",
  authenticateToken,
  async (req, res) => {
    try {
      await endLiveCore(req, res, "current");
    } catch (err) {
      console.error("라이브 종료(current) 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

// ▶ 라이브 종료 (C: 쿼리스트링 liveId로 종료)  예: /live/close?liveId=3
router.post(
  "/lectures/:lectureId/classes/:classId/live/close",
  authenticateToken,
  async (req, res) => {
    try {
      await endLiveCore(req, res, "query");
    } catch (err) {
      console.error("라이브 종료(query) 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

// ── [호환용 종료 라우트 별칭들] ─────────────────────────────
router.post(
  "/lecture/:lectureId/class/:classId/live/:liveId/end",
  authenticateToken,
  (req, res) => endLiveCore(req, res, "path")
);

router.post(
  "/lecture/:lectureId/class/:classId/live/end",
  authenticateToken,
  (req, res) => endLiveCore(req, res, "current")
);

router.post(
  "/lecture/:lectureId/class/:classId/live/close",
  authenticateToken,
  (req, res) => endLiveCore(req, res, "query")
);

// 강의 예약
router.post("/lecture/:lectureId/class/:classId/reservation", authenticateToken, async (req, res) => {});

// 한국어 불용어 사전
const STOPWORDS_KO = new Set([
  // 주차 관련
  "주차", "1주차", "2주차", "3주차", "4주차", "5주차", "6주차", "7주차", "8주차", "9주차", "10주차",
  "1주", "2주", "3주", "4주", "5주", "6주", "7주", "8주", "9주", "10주",
  // 시간 관련
  "이번", "다음", "이전", "오늘", "내일", "어제",
  // 강의 관련 일반어
  "수업", "강의", "과목", "교과목", "수업에", "강의에", "과목에",
  "질문", "답변", "답", "문의",
  // 지시대명사 및 의문사
  "이것", "그것", "저것", "이거", "그거", "저거",
  "어느", "어떤", "어디", "언제", "누구", "무엇", "무엇을",
  // 조사
  "에서", "에게", "으로", "로", "의", "을", "를", "이", "가", "은", "는", "에", "와", "과",
  "대한", "위한", "관한", "대해", "위해", "관해",
  // 일반 명사 (의미 없는 단어)
  "것", "거", "게", "건", "것을", "것이", "것은",
  // 접미사/어미
  "때문", "위해", "대해", "관해",
  "있습니다", "합니다", "됩니다", "입니다",
  // 접속사
  "그리고", "또한", "또", "그런데", "하지만", "그러나",
  // 기타 의미 없는 단어
  "하는", "하는데", "하는지", "하는것", "하는거",
  "되는", "되는데", "되는지",
  "있는", "있는데", "있는지",
  "하는", "하는데", "하는지",
]);

// 조사 제거 함수
function removeJosa(word) {
  // 조사 패턴 제거
  const josaPatterns = [
    /에$/g, /에서$/g, /에게$/g, /으로$/g, /로$/g,
    /의$/g, /을$/g, /를$/g, /이$/g, /가$/g, /은$/g, /는$/g,
    /와$/g, /과$/g, /도$/g, /만$/g, /까지$/g, /부터$/g,
    /처럼$/g, /같이$/g, /보다$/g, /마다$/g,
  ];
  
  let cleaned = word;
  for (const pattern of josaPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  
  return cleaned;
}

// 불용어 필터링 및 의미 있는 단어 추출
async function filterMeaningfulWord(word, wordFreq, allWords) {
  // 1. 조사 제거 후 체크
  const cleanedWord = removeJosa(word);
  
  // 2. 불용어 사전 체크 (원본 단어와 조사 제거한 단어 모두 체크)
  if (STOPWORDS_KO.has(word) || STOPWORDS_KO.has(cleanedWord)) {
    return false;
  }

  // 3. 숫자만 있는 경우 제외
  if (/^\d+$/.test(word) || /^\d+$/.test(cleanedWord)) {
    return false;
  }

  // 4. 한 글자 제외
  if (word.length < 2 || cleanedWord.length < 2) {
    return false;
  }

  // 5. 너무 짧은 단어 제외 (2글자 이하)
  if (cleanedWord.length < 2) {
    return false;
  }

  // 6. 조사만 있는 경우 제외
  if (word !== cleanedWord && cleanedWord.length === 0) {
    return false;
  }

  // 7. 최소 빈도수 체크 (1회 이상 등장한 단어만, 상위 후보이므로 이미 필터링됨)
  // 빈도수 체크는 상위 후보 선택 시 이미 적용되므로 여기서는 스킵

  // 8. GPT 기반 필터링 (선택적, API 키가 있을 때만)
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      // 조사 제거한 단어로 GPT 필터링
      const wordToCheck = cleanedWord.length > 0 ? cleanedWord : word;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "당신은 한국어 단어 분석 전문가입니다. 주어진 단어가 의미 있는 개념, 용어, 기술 용어, 학술 용어인지 판단합니다. 조사나 접미사가 붙은 단어는 제외합니다.",
          },
          {
            role: "user",
            content: `다음 단어가 의미 있는 개념이나 용어인지 판단해주세요: "${wordToCheck}"\n\n의미 있는 개념/용어면 "yes", 불용어나 의미 없는 단어면 "no"로만 답변해주세요.`,
          },
        ],
        max_tokens: 10,
        temperature: 0.3,
      });

      const response = completion.choices?.[0]?.message?.content?.trim().toLowerCase();
      if (response && (response.includes("no") || response.includes("아니"))) {
        return false;
      }
    } catch (error) {
      // GPT 필터링 실패 시 불용어 사전 기반으로만 필터링
      console.warn(`GPT 필터링 실패, 불용어 사전 기반으로 진행: ${error.message}`);
    }
  }

  return true;
}

// 클래스별 통계 계산 함수
async function calculateClassStatistics(questions, lecture, classId) {
  const classQuestions = questions.filter((q) => Number(q.class_id) === Number(classId));

  const totalQuestions = classQuestions.length;
  const totalUpvotes = classQuestions.reduce(
    (sum, q) => sum + Number(q.metadata?.likes || 0),
    0
  );

  const uniqueQuestionAuthors = new Set(
    classQuestions.map((q) => String(q.author?.id || "")).filter(Boolean)
  );
  const totalStudents = lecture.student_id_list?.length || 0;
  const participationRate = totalStudents > 0 
    ? (uniqueQuestionAuthors.size / totalStudents) * 100 
    : 0;

  // 가장 어려운 개념 계산
  const tokenizeKo = (text = "") => {
    return String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((w) => w.length >= 2);
  };

  const wordFreq = new Map();
  classQuestions.forEach((q) => {
    const words = tokenizeKo(q.text || "");
    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
  });

  // 불용어 필터링 적용 (상위 10개만 GPT 필터링으로 성능 최적화)
  const sortedByFreq = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]);
  const topCandidates = sortedByFreq.slice(0, 10); // 상위 10개 후보
  
  const filteredWords = [];
  for (const [word, freq] of topCandidates) {
    const isMeaningful = await filterMeaningfulWord(word, wordFreq, Array.from(wordFreq.keys()));
    if (isMeaningful) {
      // 조사 제거한 단어 사용
      const cleanedWord = removeJosa(word);
      const finalWord = cleanedWord.length >= 2 ? cleanedWord : word;
      filteredWords.push([finalWord, freq]);
    }
  }

  // 가장 빈도가 높은 단어 찾기
  const sortedWords = filteredWords
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1);
  
  const hardestConcept = sortedWords.length > 0 ? sortedWords[0][0] : "";

  return {
    class_id: Number(classId),
    total_questions: totalQuestions,
    total_upvotes: totalUpvotes,
    participation_rate: Math.round(participationRate * 100) / 100,
    participation_rate_percentage: `${Math.round(participationRate * 100) / 100}%`,
    students_who_asked: uniqueQuestionAuthors.size,
    total_students: totalStudents,
    hardest_concept: hardestConcept,
  };
}

// 강좌 통계 조회 (총 질문 수, 총 업보트 수, 참여 학생 비율, 가장 어려운 개념)
// 클래스 단위 통계도 포함
router.get(
  "/lectures/:lectureId/statistics",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      // 교수 권한 확인
      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 통계를 조회할 수 있습니다." });
      }

      // 강좌 조회
      const lecture = await Lecture.findOne({ 
        lecture_id: lectureId, 
        professor_id: user._id 
      });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      // 해당 강좌의 모든 질문 조회
      const questions = await Question.find({ lecture_id: lectureId }).lean();

      // 강좌 전체 통계 계산
      const totalQuestions = questions.length;
      const totalUpvotes = questions.reduce(
        (sum, q) => sum + Number(q.metadata?.likes || 0),
        0
      );

      const uniqueQuestionAuthors = new Set(
        questions.map((q) => String(q.author?.id || "")).filter(Boolean)
      );
      const totalStudents = lecture.student_id_list?.length || 0;
      const participationRate = totalStudents > 0 
        ? (uniqueQuestionAuthors.size / totalStudents) * 100 
        : 0;

      // 가장 어려운 개념 계산 (강좌 전체)
      const tokenizeKo = (text = "") => {
        return String(text)
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter(Boolean)
          .filter((w) => w.length >= 2);
      };

      const wordFreq = new Map();
      questions.forEach((q) => {
        const words = tokenizeKo(q.text || "");
        words.forEach((word) => {
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        });
      });

      // 불용어 필터링 적용 (상위 10개만 GPT 필터링으로 성능 최적화)
      const sortedByFreq = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]);
      const topCandidates = sortedByFreq.slice(0, 10); // 상위 10개 후보
      
      const filteredWords = [];
      for (const [word, freq] of topCandidates) {
        const isMeaningful = await filterMeaningfulWord(word, wordFreq, Array.from(wordFreq.keys()));
        if (isMeaningful) {
          // 조사 제거한 단어 사용
          const cleanedWord = removeJosa(word);
          const finalWord = cleanedWord.length >= 2 ? cleanedWord : word;
          filteredWords.push([finalWord, freq]);
        }
      }

      const sortedWords = filteredWords
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1);
      
      const hardestConcept = sortedWords.length > 0 ? sortedWords[0][0] : "";

      // 클래스별 통계 계산
      const classStatistics = [];
      if (lecture.classes && Array.isArray(lecture.classes)) {
        for (const cls of lecture.classes) {
          const classStat = await calculateClassStatistics(questions, lecture, cls.id);
          classStatistics.push(classStat);
        }
      }

      res.status(200).json({
        lecture_id: lectureId,
        lecture_name: lecture.name,
        statistics: {
          total_questions: totalQuestions,
          total_upvotes: totalUpvotes,
          participation_rate: Math.round(participationRate * 100) / 100,
          participation_rate_percentage: `${Math.round(participationRate * 100) / 100}%`,
          students_who_asked: uniqueQuestionAuthors.size,
          total_students: totalStudents,
          hardest_concept: hardestConcept,
        },
        class_statistics: classStatistics,
      });
    } catch (err) {
      console.error("강좌 통계 조회 오류:", err);
      res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

module.exports = router;
