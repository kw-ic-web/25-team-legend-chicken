require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Lecture = require("../models/lectures");
const User = require("../models/user");

const questions = [
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 1,
    "position": {"x": 0.15, "y": 0.20, "w": 120, "h": 50},
    "text": "Web Service Design and Practice 과목의 전체적인 목표가 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 2,
    "position": {"x": 0.10, "y": 0.25, "w": 100, "h": 60},
    "text": "웹 기반 서비스가 폭발적으로 증가하는 이유는 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 3,
    "position": {"x": 0.20, "y": 0.30, "w": 110, "h": 55},
    "text": "웹 관련 기술 스택이 Desktop application과 Mobile application에서도 활용되는 이유는 무엇인가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 3,
    "position": {"x": 0.15, "y": 0.50, "w": 105, "h": 45},
    "text": "REST API가 거의 모든 서비스의 백엔드로 활용되는 이유를 설명해주세요.",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 4,
    "position": {"x": 0.12, "y": 0.35, "w": 115, "h": 50},
    "text": "웹서비스의 종류에는 어떤 것들이 있나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 5,
    "position": {"x": 0.18, "y": 0.25, "w": 100, "h": 60},
    "text": "MVP(최소기능제품)을 구현하는 것이 중요한 이유는 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 5,
    "position": {"x": 0.10, "y": 0.45, "w": 120, "h": 55},
    "text": "본 과목의 선수과목으로 필요한 지식은 무엇인가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 5,
    "position": {"x": 0.15, "y": 0.60, "w": 110, "h": 50},
    "text": "구글 애널리틱스를 통해 사용자 분석을 실습하는 목적은 무엇인가요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 6,
    "position": {"x": 0.20, "y": 0.30, "w": 105, "h": 45},
    "text": "과거 강의평가에서 개선된 점은 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 7,
    "position": {"x": 0.12, "y": 0.25, "w": 100, "h": 50},
    "text": "Lecture note는 어디서 받을 수 있나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 8,
    "position": {"x": 0.15, "y": 0.40, "w": 115, "h": 55},
    "text": "Socket과 WebRTC는 언제 배우나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 8,
    "position": {"x": 0.10, "y": 0.55, "w": 110, "h": 50},
    "text": "JWT와 세션은 몇 주차에 배우나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 9,
    "position": {"x": 0.18, "y": 0.30, "w": 100, "h": 45},
    "text": "Blended Learning 방식이 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 9,
    "position": {"x": 0.12, "y": 0.50, "w": 120, "h": 55},
    "text": "녹화 강의를 반드시 수강해야 하는 이유는 무엇인가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 10,
    "position": {"x": 0.15, "y": 0.35, "w": 105, "h": 50},
    "text": "강의 관련 질문은 어느 채널로 해야 하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 11,
    "position": {"x": 0.20, "y": 0.25, "w": 110, "h": 60},
    "text": "출석 점수는 전체 성적의 몇 퍼센트인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 11,
    "position": {"x": 0.10, "y": 0.45, "w": 115, "h": 50},
    "text": "결석이 1/4 이상이면 어떻게 되나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 12,
    "position": {"x": 0.18, "y": 0.30, "w": 100, "h": 55},
    "text": "가족의 사망으로 인한 결석은 몇 일까지 인정되나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 12,
    "position": {"x": 0.12, "y": 0.50, "w": 120, "h": 45},
    "text": "감기나 치과 진료는 출석 인정이 되나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 13,
    "position": {"x": 0.15, "y": 0.35, "w": 110, "h": 50},
    "text": "예비군 훈련으로 인한 결석은 어떻게 처리되나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 13,
    "position": {"x": 0.20, "y": 0.55, "w": 105, "h": 45},
    "text": "조기취업으로 인한 결석은 어떻게 처리하나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 14,
    "position": {"x": 0.10, "y": 0.30, "w": 115, "h": 55},
    "text": "과제 점수는 전체 성적의 몇 퍼센트인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 14,
    "position": {"x": 0.18, "y": 0.50, "w": 100, "h": 50},
    "text": "과제는 총 몇 개가 있나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 15,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "실습참여도 점수는 어떻게 평가되나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 15,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "다른 학생에게 도움을 주면 가산점을 받을 수 있나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 16,
    "position": {"x": 0.20, "y": 0.30, "w": 105, "h": 55},
    "text": "기말 팀 프로젝트의 평가 기준은 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 16,
    "position": {"x": 0.10, "y": 0.50, "w": 115, "h": 50},
    "text": "팀 프로젝트에서 Socket이나 WebRTC를 필수로 사용해야 하나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 16,
    "position": {"x": 0.18, "y": 0.65, "w": 100, "h": 45},
    "text": "팀 편성은 어떻게 이루어지나요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 17,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "과제물 표절이나 컨닝 행위 시 처벌은 어떻게 되나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 17,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "지연 제출 시 감점은 어떻게 되나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 17,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "수업 중 휴대폰 사용이 태도 점수에 영향을 주나요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 3,
    "position": {"x": 0.12, "y": 0.34, "w": 100, "h": 60},
    "text": "웹 기술이 다양한 플랫폼에서 활용되는 예시를 더 설명해주세요.",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 5,
    "position": {"x": 0.15, "y": 0.35, "w": 115, "h": 55},
    "text": "Product-Market Fit을 판단하기 위한 방법은 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 8,
    "position": {"x": 0.10, "y": 0.30, "w": 120, "h": 50},
    "text": "데이터베이스 연동은 몇 주차에 배우나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 14,
    "position": {"x": 0.18, "y": 0.40, "w": 100, "h": 60},
    "text": "과거 Assignment 예시를 보면 어떤 기술들을 배우게 되나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 1,
    "page": 16,
    "position": {"x": 0.12, "y": 0.40, "w": 110, "h": 55},
    "text": "팀 프로젝트에서 Git 기반 코드 작성 기여도는 어떻게 평가되나요?",
    "section": "A"
  }
];

async function insertTestQuestions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB 연결 성공");

    const lecture = await Lecture.findOne({ lecture_id: "LEC-32AEBA14" });
    if (!lecture) {
      console.error("❌ 강좌를 찾을 수 없습니다.");
      process.exit(1);
    }

    const studentIds = lecture.student_id_list || [];
    if (studentIds.length === 0) {
      console.error("❌ 수강 학생이 없습니다.");
      process.exit(1);
    }

    console.log(`📚 강좌: ${lecture.name}`);
    console.log(`👥 수강 학생 수: ${studentIds.length}명`);

    const students = await User.find({
      _id: { $in: studentIds },
      user_type: "student",
    }).select("_id name email");

    if (students.length === 0) {
      console.error("❌ 학생 정보를 찾을 수 없습니다.");
      process.exit(1);
    }

    console.log(`✅ 학생 정보 조회 완료: ${students.length}명`);

    const insertedQuestions = [];

    for (const qData of questions) {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      
      const question = new Question({
        lecture_id: qData.lecture_id,
        class_id: qData.class_id,
        page: qData.page,
        position: qData.position,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        type: "question",
        author: {
          id: String(randomStudent._id),
          name: randomStudent.name || "익명",
          role: "student",
        },
        text: qData.text,
        metadata: {
          source: "test_script",
          device: "web",
          language: "ko",
        },
        live_id: null,
        upvote_count: Math.floor(Math.random() * 5),
        upvoted_by: [],
      });

      const saved = await question.save();
      insertedQuestions.push(saved);
      console.log(`✅ 질문 저장: "${qData.text.substring(0, 30)}..." (작성자: ${randomStudent.name})`);
    }

    console.log(`\n🎉 총 ${insertedQuestions.length}개의 질문이 성공적으로 저장되었습니다!`);
    
    await mongoose.connection.close();
    console.log("✅ MongoDB 연결 종료");
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

insertTestQuestions();

