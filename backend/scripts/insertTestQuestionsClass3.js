require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Lecture = require("../models/lectures");
const User = require("../models/User");

const questions = [
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 1,
    position: { x: 0.15, y: 0.2, w: 120, h: 50 },
    text: "웹서비스 기획의 주요 내용은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 2,
    position: { x: 0.1, y: 0.25, w: 100, h: 60 },
    text: "정보 설계의 3가지 요소는 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 3,
    position: { x: 0.2, y: 0.3, w: 110, h: 55 },
    text: "웹사이트와 웹 서비스의 차이는 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 3,
    position: { x: 0.15, y: 0.5, w: 105, h: 45 },
    text: "HTTP 요청과 응답의 과정을 설명해주세요.",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 4,
    position: { x: 0.12, y: 0.35, w: 115, h: 50 },
    text: "웹 서비스의 종류에는 어떤 것들이 있나요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 5,
    position: { x: 0.18, y: 0.25, w: 100, h: 60 },
    text: "좋은 웹 서비스의 요건은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 5,
    position: { x: 0.1, y: 0.45, w: 120, h: 55 },
    text: "Useful과 Usability의 차이는 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 6,
    position: { x: 0.15, y: 0.6, w: 110, h: 50 },
    text: "사용자 친화적인 UI/UX가 중요한 이유는 무엇인가요?",
    section: "C",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 7,
    position: { x: 0.2, y: 0.3, w: 105, h: 45 },
    text: "기획과 계획의 차이는 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 7,
    position: { x: 0.12, y: 0.5, w: 120, h: 50 },
    text: "거시적 웹 기획과 미시적 웹 기획의 차이는?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 8,
    position: { x: 0.15, y: 0.4, w: 115, h: 55 },
    text: "UX 기획에서 중요한 점은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 8,
    position: { x: 0.1, y: 0.55, w: 110, h: 50 },
    text: "수익을 내야 하는 기업의 웹사이트 기획은 어떻게 해야 하나요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 9,
    position: { x: 0.18, y: 0.3, w: 100, h: 45 },
    text: "웹 기획 프로세스의 전체 단계는 몇 개인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 9,
    position: { x: 0.12, y: 0.5, w: 120, h: 55 },
    text: "1단계 프로젝트 계획 수립에서 PM의 주요 업무는 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 10,
    position: { x: 0.15, y: 0.35, w: 105, h: 50 },
    text: "정보 수집 방법에는 어떤 것들이 있나요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 10,
    position: { x: 0.2, y: 0.55, w: 110, h: 45 },
    text: "서비스 블루프린트와 SRS는 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 11,
    position: { x: 0.1, y: 0.3, w: 115, h: 55 },
    text: "서비스 블루프린트는 어떤 목적으로 사용하나요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 12,
    position: { x: 0.18, y: 0.5, w: 100, h: 50 },
    text: "서비스 블루프린트의 구성 요소는 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 15,
    position: { x: 0.12, y: 0.25, w: 120, h: 60 },
    text: "SRS에서 use case diagram은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 16,
    position: { x: 0.15, y: 0.45, w: 110, h: 50 },
    text: "콘텐츠 구성 단계에서 고려해야 할 사항은?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 16,
    position: { x: 0.2, y: 0.6, w: 105, h: 45 },
    text: "인포메이션 아키텍처에서 설계하는 요소는?",
    section: "C",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 17,
    position: { x: 0.12, y: 0.25, w: 120, h: 60 },
    text: "디자인 작업은 언제 시작하나요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 17,
    position: { x: 0.15, y: 0.45, w: 110, h: 50 },
    text: "Waterfall과 Agile 방식의 차이는 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 18,
    position: { x: 0.2, y: 0.6, w: 105, h: 45 },
    text: "WBS는 무엇인가요?",
    section: "C",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 19,
    position: { x: 0.12, y: 0.25, w: 120, h: 60 },
    text: "개발 및 제작 단계에서 publisher의 역할은?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 19,
    position: { x: 0.15, y: 0.45, w: 110, h: 50 },
    text: "테스트 및 런칭 단계에서 확인해야 할 사항은?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 22,
    position: { x: 0.2, y: 0.3, w: 105, h: 55 },
    text: "정보 설계의 3가지 요소를 설명해주세요.",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 23,
    position: { x: 0.1, y: 0.5, w: 115, h: 50 },
    text: "정보 구조의 종류에는 어떤 것들이 있나요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 24,
    position: { x: 0.18, y: 0.3, w: 100, h: 55 },
    text: "Linear 구조의 장단점은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 24,
    position: { x: 0.12, y: 0.5, w: 120, h: 45 },
    text: "Linear 구조는 어떤 경우에 적용하나요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 28,
    position: { x: 0.15, y: 0.35, w: 110, h: 50 },
    text: "Hierarchical 구조의 장단점은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 29,
    position: { x: 0.2, y: 0.55, w: 105, h: 45 },
    text: "계층 구조 설계 시 폭과 깊이의 균형이 중요한 이유는?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 29,
    position: { x: 0.1, y: 0.4, w: 115, h: 55 },
    text: "Miller's magic number 7은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 32,
    position: { x: 0.18, y: 0.3, w: 100, h: 50 },
    text: "Grid 구조는 어떤 경우에 사용하나요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 34,
    position: { x: 0.12, y: 0.5, w: 120, h: 55 },
    text: "Network 구조의 장단점은 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 35,
    position: { x: 0.15, y: 0.35, w: 110, h: 50 },
    text: "네비게이션 시스템에서 발생하는 문제는 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 35,
    position: { x: 0.2, y: 0.55, w: 105, h: 45 },
    text: "방향 상실과 인지적 과부하는 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 36,
    position: { x: 0.1, y: 0.3, w: 115, h: 60 },
    text: "글로벌 내비게이션 시스템의 역할은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 37,
    position: { x: 0.18, y: 0.5, w: 100, h: 50 },
    text: "로컬 내비게이션 시스템은 언제 사용하나요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 38,
    position: { x: 0.12, y: 0.25, w: 120, h: 60 },
    text: "원격 제어 네비게이션 요소에는 어떤 것들이 있나요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 39,
    position: { x: 0.15, y: 0.45, w: 110, h: 50 },
    text: "사이트 맵의 역할은 무엇인가요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 40,
    position: { x: 0.2, y: 0.6, w: 105, h: 45 },
    text: "보조 네비게이션을 사용할 때 주의할 점은?",
    section: "C",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 41,
    position: { x: 0.12, y: 0.25, w: 120, h: 60 },
    text: "레이블링 시스템의 목적은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 42,
    position: { x: 0.15, y: 0.45, w: 110, h: 50 },
    text: "네비게이션 시스템 속의 레이블은 어떻게 사용해야 하나요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 43,
    position: { x: 0.2, y: 0.6, w: 105, h: 45 },
    text: "링크 레이블을 사용할 때 주의할 점은?",
    section: "C",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 44,
    position: { x: 0.12, y: 0.25, w: 120, h: 60 },
    text: "아이콘 레이블의 장단점은 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 45,
    position: { x: 0.15, y: 0.45, w: 110, h: 50 },
    text: "레이블링의 종류에는 어떤 것들이 있나요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 46,
    position: { x: 0.2, y: 0.6, w: 105, h: 45 },
    text: "효과적인 레이블링 시스템을 만드는 방법은?",
    section: "C",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 47,
    position: { x: 0.12, y: 0.25, w: 120, h: 60 },
    text: "UX Writing이 중요한 이유는 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 49,
    position: { x: 0.15, y: 0.45, w: 110, h: 50 },
    text: "팀 프로젝트의 주제는 어떻게 정하나요?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 50,
    position: { x: 0.2, y: 0.3, w: 105, h: 55 },
    text: "Educational Technology의 핵심 목표는 무엇인가요?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 50,
    position: { x: 0.1, y: 0.5, w: 115, h: 50 },
    text: "좋은 주제를 선택하기 위한 고려사항은?",
    section: "B",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 51,
    position: { x: 0.18, y: 0.4, w: 100, h: 60 },
    text: "Ideation Time에서 논의해야 할 주요 사항은?",
    section: "A",
  },
  {
    lecture_id: "LEC-32AEBA14",
    class_id: 3,
    page: 51,
    position: { x: 0.12, y: 0.55, w: 110, h: 50 },
    text: "Service Blueprint를 구성할 때 고려해야 할 요소는?",
    section: "B",
  },
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
      const randomStudent =
        students[Math.floor(Math.random() * students.length)];

      const question = new Question({
        lecture_id: qData.lecture_id,
        class_id: qData.class_id,
        page: qData.page,
        position: qData.position,
        timestamp: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ),
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
      console.log(
        `✅ 질문 저장: "${qData.text.substring(0, 40)}..." (작성자: ${randomStudent.name})`
      );
    }

    console.log(
      `\n🎉 총 ${insertedQuestions.length}개의 질문이 성공적으로 저장되었습니다!`
    );

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
