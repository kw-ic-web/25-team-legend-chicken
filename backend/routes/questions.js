const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Lecture = require("../models/lectures");
const WhiteboardPage = require("../models/whiteboardPage");
const { authenticateToken } = require("../middleware/auth");
const mongoose = require("mongoose");
const OpenAI = require("openai");

async function canAccess(user, lecture_id) {
  let lec = await Lecture.findOne({ lecture_id });
  if (!lec) {
    if (mongoose.Types.ObjectId.isValid(String(lecture_id))) {
      lec = await Lecture.findById(lecture_id);
    }
  }
  if (!lec) return { ok: false, code: 404, msg: "강좌를 찾을 수 없습니다." };

  const uid = String(user._id || user.id || "");
  const profId = lec.professor_id ? String(lec.professor_id) : "";
  const studentIds = Array.isArray(lec.student_id_list)
    ? lec.student_id_list.map(String)
    : [];

  const isProfessor = user.user_type === "professor" && profId === uid;
  const isStudent = user.user_type === "student" && studentIds.includes(uid);

  if (!isProfessor && !isStudent) {
    return { ok: false, code: 403, msg: "해당 강좌에 접근할 수 없습니다." };
  }
  return { ok: true, lec };
}

router.post("/", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const {
      lecture_id,
      class_id,
      page,
      section,
      position,
      timestamp,
      type = "question",
      author,
      text,
      metadata,
    } = req.body;

    if (!lecture_id || !class_id || !page || !position || !text) {
      return res
        .status(400)
        .json({ message: "필수 필드가 누락되었습니다." });
    }

    const access = await canAccess(user, lecture_id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.msg });
    }

    const cls = Array.isArray(access.lec.classes)
      ? access.lec.classes.find((c) => Number(c.id) === Number(class_id))
      : null;
    if (!cls) {
      return res
        .status(404)
        .json({ message: "해당 클래스를 찾을 수 없습니다." });
    }

    let liveId = null;
    if (cls.isLiveActive && cls.currentLiveId) {
      liveId = Number(cls.currentLiveId);
    }

    const authorSafe =
      author && typeof author === "object"
        ? author
        : {
            id: String(user._id || user.id || ""),
            name: user.name || user.username || "익명",
            role: user.user_type || "student",
          };

    const q = await Question.create({
      lecture_id,
      class_id: Number(class_id),
      page,
      section: section || null,
      position,
      timestamp: new Date(timestamp || Date.now()),
      type,
      author: authorSafe,
      text,
      metadata: {
        ...(metadata || {}),
        likes: 0,
      },
      live_id: liveId,
      upvote_count: 0,
      upvoted_by: [],
    });

    const io = req.app.get("io");
    if (io) {
      const room = `lec:${lecture_id}:cls:${class_id}`;
      io.to(room).emit("question:new", q.toObject());
    }

    generateGPTAnswer(q._id, lecture_id, class_id, text, io).catch((err) => {
      console.error("GPT 답변 생성 오류:", err);
    });

    return res
      .status(201)
      .json({ message: "질문이 저장되었습니다.", question: q });
  } catch (err) {
    console.error("질문 저장 오류:", err);
    return res
      .status(500)
      .json({ message: "서버 오류가 발생했습니다.", error: err.message });
  }
});

router.get("/list", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { lecture_id, class_id, page, limit = 50 } = req.query;

    if (!lecture_id || !class_id) {
      return res
        .status(400)
        .json({ message: "lecture_id, class_id는 필수입니다." });
    }

    const access = await canAccess(user, lecture_id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.msg });
    }

    const filter = {
      lecture_id,
      class_id: Number(class_id),
    };
    if (page) filter.page = Number(page);

    const data = await Question.find(filter)
      .sort({ createdAt: -1, created_at: -1 })
      .limit(Math.min(Number(limit) || 50, 200));

    return res.json({ questions: data });
  } catch (err) {
    console.error("질문 조회 오류:", err);
    return res
      .status(500)
      .json({ message: "서버 오류가 발생했습니다.", error: err.message });
  }
});

router.post("/:id/upvote", authenticateToken, async (req, res) => {
  try {
    const userId = String(req.user._id);
    const questionId = req.params.id;

    console.log("[UPVOTE] user =", userId, "question =", questionId);

    const q = await Question.findById(questionId);
    if (!q) {
      return res.status(404).json({ message: "질문을 찾을 수 없습니다." });
    }

    const access = await canAccess(req.user, q.lecture_id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.msg });
    }

    if (!Array.isArray(q.upvoted_by)) q.upvoted_by = [];
    if (typeof q.upvote_count !== "number") q.upvote_count = 0;

    const already = q.upvoted_by.includes(userId);

    if (already) {
      q.upvoted_by = q.upvoted_by.filter((id) => id !== userId);
      q.upvote_count = Math.max(0, q.upvote_count - 1);
    } else {
      q.upvoted_by.push(userId);
      q.upvote_count += 1;
    }

    if (!q.metadata) q.metadata = {};
    q.metadata.likes = q.upvote_count;

    await q.save();

    const io = req.app.get("io");
    if (io) {
      const room = `lec:${q.lecture_id}:cls:${q.class_id}`;
      io.to(room).emit("question:updated", q.toObject());
    }

    return res.json({
      message: "ok",
      upvoted: !already,
      upvote_count: q.upvote_count,
    });
  } catch (err) {
    console.error("질문 업보트 오류:", err);
    return res
      .status(500)
      .json({ message: "서버 오류가 발생했습니다.", error: err.message });
  }
});


router.get(
  "/lectures/:lectureId/classes/:classId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;
      const { page, limit = 50 } = req.query;

      const access = await canAccess(user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ message: access.msg });
      }

      const filter = {
        lecture_id: lectureId,
        class_id: Number(classId),
      };
      if (page) filter.page = Number(page);

      const questions = await Question.find(filter)
        .sort({ createdAt: -1, created_at: -1 })
        .limit(Math.min(Number(limit) || 50, 200));

      return res.json({
        lecture_id: lectureId,
        class_id: Number(classId),
        count: questions.length,
        questions,
      });
    } catch (err) {
      console.error("강좌/클래스 질문 조회 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

router.get(
  "/lectures/:lectureId",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId } = req.params;
      const { page, limit = 50 } = req.query;

      const access = await canAccess(user, lectureId);
      if (!access.ok) {
        return res.status(access.code).json({ message: access.msg });
      }

      const filter = {
        lecture_id: lectureId,
      };
      if (page) filter.page = Number(page);

      const allQuestions = await Question.find(filter)
        .sort({ createdAt: -1, created_at: -1 })
        .limit(Math.min(Number(limit) || 50, 200));

      const topQuestions = await Question.find(filter)
        .sort({ "metadata.likes": -1, createdAt: -1 })
        .limit(5)
        .lean();

      return res.json({
        lecture_id: lectureId,
        count: allQuestions.length,
        questions: allQuestions,
        top_questions_by_upvote: topQuestions.map((q) => ({
          _id: q._id,
          text: q.text,
          author: q.author,
          upvotes: q.metadata?.likes || 0,
          class_id: q.class_id,
          page: q.page,
          created_at: q.created_at || q.createdAt,
        })),
      });
    } catch (err) {
      console.error("강좌 질문 조회 오류:", err);
      return res
        .status(500)
        .json({ message: "서버 오류가 발생했습니다.", error: err.message });
    }
  }
);

async function generateGPTAnswer(questionId, lectureId, classId, questionText, io = null) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
    if (!apiKey) {
      console.warn("OpenAI API 키가 설정되지 않아 GPT 답변을 생성할 수 없습니다.");
      return;
    }

    const whiteboardPages = await WhiteboardPage.find({
      lecture_id: lectureId,
      class_id: String(classId),
      status: "finalized",
    })
      .sort({ page_number: 1 })
      .select("text page_number")
      .lean();

    const lectureText = whiteboardPages
      .map((page) => `[페이지 ${page.page_number}]\n${page.text || ""}`)
      .join("\n\n");

    if (!lectureText.trim()) {
      console.log("교안 텍스트가 없어 GPT 답변을 생성하지 않습니다.");
      return;
    }

    const openai = new OpenAI({ apiKey });

    const prompt = `다음 교안 내용을 참고하여 질문에 대해 간결하게 답변해주세요. 한두 문장으로 핵심만 답변해주세요.

## 교안 내용:
${lectureText}

## 질문:
${questionText}

교안 내용을 기반으로 간결하고 명확하게 답변해주세요. 교안에 없는 내용은 언급하지 마세요.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "교안 내용을 기반으로 질문에 대해 간결하고 명확하게 답변합니다. 한두 문장으로 핵심만 답변합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim();

    if (answer) {
      const updatedQuestion = await Question.findByIdAndUpdate(
        questionId,
        { answer },
        { new: true }
      );

      if (io) {
        const room = `lec:${lectureId}:cls:${classId}`;
        io.to(room).emit("question:answer", {
          question_id: questionId,
          answer: answer,
          question: updatedQuestion.toObject(),
        });
      }

      console.log(`✅ GPT 답변이 생성되었습니다. (질문 ID: ${questionId})`);
    } else {
      console.warn("GPT 답변이 생성되지 않았습니다.");
    }
  } catch (error) {
    console.error("GPT 답변 생성 중 오류 발생:", error.message || error);
  }
}

module.exports = router;
