const express = require("express");
const router = express.Router();
const Lecture = require("../models/lectures");
const User = require("../models/user");
const { authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");
const upload = require("../config/upload");
const { uploadThumbnail } = require("../config/uploadImage");
const OpenAI = require("openai");

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

      res.status(200).json({ lectures });
    } catch (err) {
      console.error("강의 조회 오류:", err);
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

// 강의 예약
router.post("/lecture/:lectureId/class/:classId/reservation", authenticateToken, async (req, res) => {});

module.exports = router;
