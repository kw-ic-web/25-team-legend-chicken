require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Lecture = require("../models/lectures");
const User = require("../models/user");

const questions = [
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 19,
    "position": {"x": 0.15, "y": 0.20, "w": 120, "h": 50},
    "text": "개발 환경 설정에서 어떤 도구들을 사용하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 20,
    "position": {"x": 0.10, "y": 0.25, "w": 100, "h": 60},
    "text": "개발 환경 설정의 주요 내용은 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 21,
    "position": {"x": 0.20, "y": 0.30, "w": 110, "h": 55},
    "text": "개발 도구는 어떤 것을 선택해도 되나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 22,
    "position": {"x": 0.15, "y": 0.50, "w": 105, "h": 45},
    "text": "GitHub Classroom은 어떻게 활용하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 23,
    "position": {"x": 0.12, "y": 0.35, "w": 115, "h": 50},
    "text": "과제 assignment 생성 시 private repository가 자동으로 생성되나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 24,
    "position": {"x": 0.18, "y": 0.25, "w": 100, "h": 60},
    "text": "서버 설정을 위한 옵션에는 어떤 것들이 있나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 24,
    "position": {"x": 0.10, "y": 0.45, "w": 120, "h": 55},
    "text": "AWS Learner Lab은 무엇인가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 25,
    "position": {"x": 0.15, "y": 0.60, "w": 110, "h": 50},
    "text": "AWS Academy는 어떤 목적으로 제공되나요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 26,
    "position": {"x": 0.20, "y": 0.30, "w": 105, "h": 45},
    "text": "AWS Academy Learner Lab에서 제공되는 크레딧은 얼마인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 27,
    "position": {"x": 0.12, "y": 0.25, "w": 100, "h": 50},
    "text": "AWS Academy 초대는 어떤 이메일로 받나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 28,
    "position": {"x": 0.15, "y": 0.40, "w": 115, "h": 55},
    "text": "Canvas 계정이 없으면 어떻게 하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 29,
    "position": {"x": 0.10, "y": 0.55, "w": 110, "h": 50},
    "text": "강의실 메인 화면 주소를 bookmark 해두는 것이 좋은가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 30,
    "position": {"x": 0.18, "y": 0.30, "w": 100, "h": 45},
    "text": "모듈 지식 확인에서 몇 점 이상 받아야 하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 31,
    "position": {"x": 0.12, "y": 0.50, "w": 120, "h": 55},
    "text": "Learner Lab 최초 접속 시 약관동의가 필요한가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 32,
    "position": {"x": 0.15, "y": 0.35, "w": 105, "h": 50},
    "text": "Learner Lab 최초 설정 시 대기시간이 얼마나 걸리나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 33,
    "position": {"x": 0.20, "y": 0.25, "w": 110, "h": 60},
    "text": "Learner Lab에서 제공되는 예산은 얼마인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 34,
    "position": {"x": 0.10, "y": 0.45, "w": 115, "h": 50},
    "text": "Learner Lab 세션 시간은 얼마나 유지되나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 35,
    "position": {"x": 0.18, "y": 0.30, "w": 100, "h": 55},
    "text": "세션 시간을 연장하려면 어떻게 하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 35,
    "position": {"x": 0.12, "y": 0.50, "w": 120, "h": 45},
    "text": "Reset을 누르면 모든 리소스가 반환되나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 36,
    "position": {"x": 0.15, "y": 0.35, "w": 110, "h": 50},
    "text": "SSH Key인 labsuser.pem 파일은 어디에 저장해야 하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 37,
    "position": {"x": 0.20, "y": 0.55, "w": 105, "h": 45},
    "text": "AWS Management Console은 실제 AWS와 동일한가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 38,
    "position": {"x": 0.10, "y": 0.30, "w": 115, "h": 55},
    "text": "EC2는 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 39,
    "position": {"x": 0.18, "y": 0.50, "w": 100, "h": 50},
    "text": "EC2 인스턴스를 시작하려면 어떻게 하나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 40,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "AMI는 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 41,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "인스턴스 유형 t2.micro를 선택하는 이유는 무엇인가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 41,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "키페어 로그인에서 vockey로 설정해야 하는 이유는 무엇인가요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 42,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "보안 그룹에서 SSH 트래픽을 허용해야 하는 이유는 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 42,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "실무에서는 보안 그룹을 어떻게 설정해야 하나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 43,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "스토리지 구성에서 30 GiB로 상향하는 이유는 무엇인가요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 44,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "인스턴스 시작 후 다음 단계는 무엇인가요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 45,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "퍼블릭 IP 주소와 프라이빗 IP 주소의 차이는 무엇인가요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 45,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "탄력적 IP 주소는 왜 필요한가요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 46,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "탄력적 IP 주소 할당은 어떻게 하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 47,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "탄력적 IP 주소를 인스턴스와 연결하는 방법은?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 48,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "서버 접속 방법에는 어떤 것들이 있나요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 49,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "SSH 접속 명령어는 어떻게 작성하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 50,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "AWS Cloud Shell을 사용한 접속 방법은?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 51,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "SSH 접속이 안 될 때 확인해야 할 사항은?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 52,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "MAC에서 labsuser.pem 권한 문제는 어떻게 해결하나요?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 53,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "Learner Lab 시간이 초과되면 어떻게 되나요?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 54,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "Region을 한국으로 바꿀 수 있나요?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 55,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "Sample page를 로컬에서 작업하는 방법은?",
    "section": "A"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 56,
    "position": {"x": 0.15, "y": 0.45, "w": 110, "h": 50},
    "text": "서버에서 GitHub repo를 clone하는 방법은?",
    "section": "B"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 57,
    "position": {"x": 0.20, "y": 0.60, "w": 105, "h": 45},
    "text": "Python Simple HTTP Server로 배포하는 방법은?",
    "section": "C"
  },
  {
    "lecture_id": "LEC-32AEBA14",
    "class_id": 2,
    "page": 58,
    "position": {"x": 0.12, "y": 0.25, "w": 120, "h": 60},
    "text": "Python HTTP Server 실행 시 troubleshooting 방법은?",
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
      console.log(`✅ 질문 저장: "${qData.text.substring(0, 40)}..." (작성자: ${randomStudent.name})`);
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

