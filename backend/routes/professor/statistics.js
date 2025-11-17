const express = require("express");
const router = express.Router();
const Lecture = require("../../models/lectures");
const Question = require("../../models/Question");
const { authenticateToken } = require("../../middleware/auth");
const { extractHardestConceptWithGPT } = require("./utils");

async function calculateClassStatistics(questions, lecture, classId) {
  const classQuestions = questions.filter((q) => Number(q.class_id) === Number(classId));

  const totalQuestions = classQuestions.length;
  const totalUpvotes = classQuestions.reduce(
    (sum, q) => sum + Number(q.upvote_count || q.metadata?.likes || 0),
    0
  );

  const uniqueQuestionAuthors = new Set(
    classQuestions.map((q) => String(q.author?.id || "")).filter(Boolean)
  );
  const totalStudents = lecture.student_id_list?.length || 0;
  const participationRate = totalStudents > 0 
    ? (uniqueQuestionAuthors.size / totalStudents) * 100 
    : 0;

  const hardestConcept = await extractHardestConceptWithGPT(classQuestions);

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

router.get(
  "/:lectureId/statistics",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 통계를 조회할 수 있습니다." });
      }

      const lecture = await Lecture.findOne({ 
        lecture_id: lectureId, 
        professor_id: user._id 
      });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      const questions = await Question.find({ lecture_id: lectureId }).lean();

      const totalQuestions = questions.length;
      const totalUpvotes = questions.reduce(
        (sum, q) => sum + Number(q.upvote_count || q.metadata?.likes || 0),
        0
      );

      const uniqueQuestionAuthors = new Set(
        questions.map((q) => String(q.author?.id || "")).filter(Boolean)
      );
      const totalStudents = lecture.student_id_list?.length || 0;
      const participationRate = totalStudents > 0 
        ? (uniqueQuestionAuthors.size / totalStudents) * 100 
        : 0;

      const hardestConcept = await extractHardestConceptWithGPT(questions);

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

