require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Lecture = require("../models/lectures");
const User = require("../models/User");

async function reinsertQuestions() {
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

    console.log("\n🗑️  기존 질문 삭제 중...");
    await Question.deleteMany({ lecture_id: "LEC-32AEBA14" });
    console.log("✅ 기존 질문 삭제 완료");

    const class1Questions = require("./insertTestQuestions.js");
    const class2Questions = require("./insertTestQuestionsClass2.js");
    const class3Questions = require("./insertTestQuestionsClass3.js");

    const allQuestions = [
      ...(class1Questions.questions || []),
      ...(class2Questions.questions || []),
      ...(class3Questions.questions || []),
    ];

    if (allQuestions.length === 0) {
      console.log("📝 질문 데이터를 직접 로드합니다...");
      const fs = require("fs");
      const path = require("path");

      const class1Path = path.join(__dirname, "insertTestQuestions.js");
      const class2Path = path.join(__dirname, "insertTestQuestionsClass2.js");
      const class3Path = path.join(__dirname, "insertTestQuestionsClass3.js");

      const class1Content = fs.readFileSync(class1Path, "utf8");
      const class2Content = fs.readFileSync(class2Path, "utf8");
      const class3Content = fs.readFileSync(class3Path, "utf8");

      const extractQuestions = (content) => {
        const match = content.match(/const questions = \[([\s\S]*?)\];/);
        if (match) {
          return eval(`[${match[1]}]`);
        }
        return [];
      };

      const q1 = extractQuestions(class1Content);
      const q2 = extractQuestions(class2Content);
      const q3 = extractQuestions(class3Content);

      allQuestions.push(...q1, ...q2, ...q3);
    }

    console.log(`\n📝 총 ${allQuestions.length}개의 질문 삽입 시작...`);

    const insertedQuestions = [];

    for (const qData of allQuestions) {
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
        upvote_count: 0,
        upvoted_by: [],
      });

      const saved = await question.save();
      insertedQuestions.push(saved);
    }

    console.log(`✅ ${insertedQuestions.length}개의 질문 삽입 완료`);

    console.log("\n👍 Upvote 추가 중...");
    let totalUpvotes = 0;

    for (const question of insertedQuestions) {
      const upvoteCount = Math.floor(Math.random() * 8);

      if (upvoteCount > 0) {
        const upvoters = [];
        const availableStudents = students.filter(
          (s) => String(s._id) !== String(question.author.id)
        );

        for (
          let i = 0;
          i < Math.min(upvoteCount, availableStudents.length);
          i++
        ) {
          const randomStudent =
            availableStudents[
              Math.floor(Math.random() * availableStudents.length)
            ];
          const studentId = String(randomStudent._id);
          if (!upvoters.includes(studentId)) {
            upvoters.push(studentId);
          }
        }

        question.upvote_count = upvoters.length;
        question.upvoted_by = upvoters;
        question.metadata = {
          ...question.metadata,
          likes: upvoters.length,
        };

        await question.save();
        totalUpvotes += upvoters.length;
      }
    }

    console.log(`✅ 총 ${totalUpvotes}개의 upvote 추가 완료`);
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

reinsertQuestions();
