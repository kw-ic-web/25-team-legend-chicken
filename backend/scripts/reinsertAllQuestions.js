require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");
const Lecture = require("../models/lectures");
const User = require("../models/User");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

async function reinsertAllQuestions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB 연결 성공");

    console.log("\n🗑️  기존 질문 삭제 중...");
    const deleteResult = await Question.deleteMany({
      lecture_id: "LEC-32AEBA14",
    });
    console.log(`✅ ${deleteResult.deletedCount}개의 기존 질문 삭제 완료`);

    await mongoose.connection.close();

    console.log("\n📝 Class 1 질문 삽입 중...");
    await execPromise("node scripts/insertTestQuestions.js", {
      cwd: __dirname + "/..",
    });

    console.log("\n📝 Class 2 질문 삽입 중...");
    await execPromise("node scripts/insertTestQuestionsClass2.js", {
      cwd: __dirname + "/..",
    });

    console.log("\n📝 Class 3 질문 삽입 중...");
    await execPromise("node scripts/insertTestQuestionsClass3.js", {
      cwd: __dirname + "/..",
    });

    await mongoose.connect(process.env.MONGODB_URI);

    const lecture = await Lecture.findOne({ lecture_id: "LEC-32AEBA14" });
    const studentIds = lecture.student_id_list || [];
    const students = await User.find({
      _id: { $in: studentIds },
      user_type: "student",
    }).select("_id name email");

    const allQuestions = await Question.find({ lecture_id: "LEC-32AEBA14" });

    console.log(`\n👍 ${allQuestions.length}개 질문에 Upvote 추가 중...`);
    let totalUpvotes = 0;

    for (const question of allQuestions) {
      const upvoteCount = Math.floor(Math.random() * 8);

      if (upvoteCount > 0) {
        const upvoters = [];
        const availableStudents = students.filter(
          (s) => String(s._id) !== String(question.author.id)
        );

        const shuffled = [...availableStudents].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(upvoteCount, shuffled.length); i++) {
          upvoters.push(String(shuffled[i]._id));
        }

        question.upvote_count = upvoters.length;
        question.upvoted_by = upvoters;
        question.metadata = {
          ...(question.metadata || {}),
          likes: upvoters.length,
        };

        await question.save();
        totalUpvotes += upvoters.length;
      }
    }

    console.log(`✅ 총 ${totalUpvotes}개의 upvote 추가 완료`);
    console.log(
      `\n🎉 총 ${allQuestions.length}개의 질문이 성공적으로 저장되었습니다!`
    );

    await mongoose.connection.close();
    console.log("✅ MongoDB 연결 종료");
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

reinsertAllQuestions();
