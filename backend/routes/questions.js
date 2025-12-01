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
      return res.status(400).json({ message: "필수 필드가 누락되었습니다." });
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

    // 질문이 생성된 페이지 번호를 전달
    generateGPTAnswer(q._id, lecture_id, class_id, text, page, io).catch((err) => {
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

// 교수자 답변 추가/수정
router.post("/:id/answer", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const questionId = req.params.id;
    const { answer } = req.body;

    if (!answer || typeof answer !== "string" || !answer.trim()) {
      return res.status(400).json({ message: "답변 내용이 필요합니다." });
    }

    const q = await Question.findById(questionId);
    if (!q) {
      return res.status(404).json({ message: "질문을 찾을 수 없습니다." });
    }

    const access = await canAccess(user, q.lecture_id);
    if (!access.ok) {
      return res.status(access.code).json({ message: access.msg });
    }

    // 교수자만 답변을 추가/수정할 수 있도록 체크 (선택사항)
    // if (user.user_type !== "professor") {
    //   return res.status(403).json({ message: "교수자만 답변을 추가할 수 있습니다." });
    // }

    const trimmed = answer.trim();
    if (!q.metadata) q.metadata = {};

    // 이전에 AI가 답변했던 경우, 그 내용을 ai_answer로 백업
    if (!q.metadata.ai_answer && q.answer && q.metadata.answer_by === "ai") {
      q.metadata.ai_answer = q.answer;
    }

    q.answer = trimmed;
    q.metadata.answer_by = "professor";
    // 교수자 답변은 별도 필드에 보존
    q.metadata.professor_answer = trimmed;
    await q.save();

    const io = req.app.get("io");
    if (io) {
      const room = `lec:${q.lecture_id}:cls:${q.class_id}`;
      io.to(room).emit("question:answer", {
        question_id: questionId,
        answer: q.answer,
        question: q.toObject(),
      });
    }

    return res.json({
      message: "답변이 저장되었습니다.",
      question: q,
    });
  } catch (err) {
    console.error("답변 저장 오류:", err);
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

router.get("/lectures/:lectureId", authenticateToken, async (req, res) => {
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
});

async function generateGPTAnswer(
  questionId,
  lectureId,
  classId,
  questionText,
  questionPage = null,
  io = null
) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
    if (!apiKey) {
      console.warn(
        "OpenAI API 키가 설정되지 않아 GPT 답변을 생성할 수 없습니다."
      );
      return;
    }

    const { extractTextFromImage } = require("../services/vision");
    const { convertPdfPageToImage, toAbsolutePath } = require("../utils/pdf");
    const path = require("path");
    const fs = require("fs-extra");

    // 질문이 생성된 특정 페이지를 우선적으로 찾기
    // materials API를 통해 최신 정보 조회 (GridFS URL 포함)
    const Lecture = require("../models/lectures");
    const lecture = await Lecture.findOne({ lecture_id: lectureId });
    if (!lecture) {
      console.warn(`[GPT 답변] 강좌를 찾을 수 없습니다: ${lectureId}`);
      return;
    }
    
    const classData = lecture.classes.find(c => String(c.id) === String(classId));
    if (!classData) {
      console.warn(`[GPT 답변] 클래스를 찾을 수 없습니다: ${classId}`);
      return;
    }

    // WhiteboardPage에서 페이지별 교안 조회 (materials API와 동일한 방식)
    // GridFS URL을 우선적으로 찾기 위해 먼저 GridFS URL이 있는 페이지를 조회
    const filter = {
      lecture_id: lectureId,
      class_id: String(classId),
      status: "finalized",
    };
    
    // 특정 페이지가 있으면 해당 페이지만 조회
    let whiteboardPages;
    if (questionPage !== null && questionPage !== undefined) {
      filter.page_number = Number(questionPage);
      
      // 먼저 GridFS URL을 가진 페이지 찾기
      const pageWithGridFS = await WhiteboardPage.findOne({
        ...filter,
        pdf_path: { $regex: "^/api/files/" } // GridFS URL로 시작
      })
        .select("text page_number pdf_path _id")
        .lean();
      
      if (pageWithGridFS) {
        // GridFS URL을 가진 페이지가 있으면 사용
        whiteboardPages = [pageWithGridFS];
      } else {
        // 없으면 일반 조회
        whiteboardPages = await WhiteboardPage.find(filter)
          .sort({ page_number: 1 })
          .select("text page_number pdf_path _id")
          .lean();
      }
    } else {
      // 모든 페이지 조회 (GridFS URL 우선)
      whiteboardPages = await WhiteboardPage.find(filter)
        .sort({ page_number: 1 })
        .select("text page_number pdf_path _id")
        .lean();
    }

    // 각 페이지의 텍스트를 수집 (비어있으면 PDF에서 추출)
    const pageTexts = [];
    for (const page of whiteboardPages) {
      let pageText = page.text || "";
      
      // 텍스트가 비어있고 PDF 경로가 있으면 Vision API로 추출
      if (!pageText.trim() && page.pdf_path) {
        try {
          console.log(`[GPT 답변] 페이지 ${page.page_number}의 텍스트가 비어있어 PDF에서 추출 시도: ${page.pdf_path}`);
          
          let pdfAbsolutePath = null;
          let isGridFS = false;
          
          // GridFS URL인지 확인 (/api/files/로 시작)
          if (page.pdf_path.startsWith("/api/files/")) {
            isGridFS = true;
            const fileId = page.pdf_path.replace("/api/files/", "");
            const { downloadFile } = require("../utils/gridfs");
            const nodeFs = require("fs");
            
            try {
              const { stream, metadata } = await downloadFile(fileId);
              
              // GridFS에서 PDF를 임시 파일로 저장
              const tempPdfPath = path.join(require("os").tmpdir(), `gpt-extract-${fileId}-${Date.now()}.pdf`);
              const writeStream = nodeFs.createWriteStream(tempPdfPath);
              
              await new Promise((resolve, reject) => {
                stream.pipe(writeStream);
                stream.on("error", reject);
                writeStream.on("finish", resolve);
                writeStream.on("error", reject);
              });
              
              pdfAbsolutePath = tempPdfPath;
              console.log(`[GPT 답변] GridFS에서 PDF 다운로드 완료: ${tempPdfPath}`);
            } catch (gridfsError) {
              console.error(`[GPT 답변] GridFS 다운로드 실패:`, gridfsError.message || gridfsError);
              continue;
            }
          } else {
            // 로컬 파일 경로인 경우 - 파일이 없으면 GridFS에서 찾기
            pdfAbsolutePath = toAbsolutePath(page.pdf_path);
            
            // 파일 존재 확인
            if (!fs.existsSync(pdfAbsolutePath)) {
              // 로컬 파일이 없으면 해당 페이지의 GridFS URL 찾기
              console.warn(`[GPT 답변] 로컬 PDF 파일을 찾을 수 없습니다: ${pdfAbsolutePath}`);
              console.log(`[GPT 답변] 해당 페이지의 GridFS URL을 찾는 중...`);
              
              try {
                // 해당 페이지 번호의 다른 WhiteboardPage에서 GridFS URL 찾기
                const pageWithGridFS = await WhiteboardPage.findOne({
                  lecture_id: lectureId,
                  class_id: String(classId),
                  page_number: page.page_number,
                  status: "finalized",
                  pdf_path: { $regex: "^/api/files/" } // GridFS URL로 시작
                })
                  .select("pdf_path")
                  .lean();
                
                if (pageWithGridFS && pageWithGridFS.pdf_path) {
                  // GridFS URL 발견 - GridFS에서 다운로드
                  isGridFS = true;
                  const fileId = pageWithGridFS.pdf_path.replace("/api/files/", "");
                  const { downloadFile } = require("../utils/gridfs");
                  const nodeFs = require("fs");
                  
                  const { stream, metadata } = await downloadFile(fileId);
                  const tempPdfPath = path.join(require("os").tmpdir(), `gpt-extract-${fileId}-${Date.now()}.pdf`);
                  const writeStream = nodeFs.createWriteStream(tempPdfPath);
                  
                  await new Promise((resolve, reject) => {
                    stream.pipe(writeStream);
                    stream.on("error", reject);
                    writeStream.on("finish", resolve);
                    writeStream.on("error", reject);
                  });
                  
                  pdfAbsolutePath = tempPdfPath;
                  console.log(`[GPT 답변] GridFS에서 PDF 다운로드 완료: ${tempPdfPath}`);
                  
                  // 현재 페이지의 pdf_path를 GridFS URL로 업데이트 (다음 번에는 바로 사용)
                  await WhiteboardPage.updateOne(
                    { _id: page._id },
                    { $set: { pdf_path: pageWithGridFS.pdf_path } }
                  );
                } else {
                  // GridFS URL이 없으면 로컬 파일 경로는 건너뛰기
                  console.warn(`[GPT 답변] 해당 페이지의 GridFS URL을 찾을 수 없습니다. 로컬 파일도 없어 건너뜁니다.`);
                  continue;
                }
              } catch (gridfsError) {
                console.error(`[GPT 답변] GridFS에서 PDF 찾기 실패:`, gridfsError.message || gridfsError);
                continue;
              }
            }
          }
          
          // PDF를 이미지로 변환
          const imagePath = await convertPdfPageToImage(pdfAbsolutePath);
          
          // Vision API로 텍스트 추출
          const { text: extractedText } = await extractTextFromImage(imagePath);
          pageText = extractedText || "";
          
          // 추출된 텍스트를 WhiteboardPage에 저장 (다음 번에는 재사용)
          if (pageText.trim()) {
            await WhiteboardPage.updateOne(
              { _id: page._id },
              { $set: { text: pageText } }
            );
            console.log(`[GPT 답변] 페이지 ${page.page_number}의 텍스트 추출 완료 (${pageText.length}자)`);
          } else {
            console.warn(`[GPT 답변] 페이지 ${page.page_number}에서 텍스트를 추출하지 못했습니다.`);
          }
          
          // 임시 파일 정리
          try {
            await fs.remove(imagePath);
            if (isGridFS && pdfAbsolutePath) {
              await fs.remove(pdfAbsolutePath);
            }
          } catch (cleanupError) {
            // 정리 실패는 무시
          }
        } catch (extractError) {
          console.error(`[GPT 답변] 페이지 ${page.page_number}의 텍스트 추출 실패:`, extractError.message || extractError);
          console.error(`[GPT 답변] 스택 트레이스:`, extractError.stack);
          // 추출 실패해도 계속 진행
        }
      }
      
      if (pageText.trim()) {
        pageTexts.push(`[페이지 ${page.page_number}]\n${pageText}`);
      }
    }

    const lectureText = pageTexts.join("\n\n");

    if (!lectureText.trim()) {
      console.log("교안 텍스트가 없어 GPT 답변을 생성하지 않습니다.");
      // 텍스트가 없을 때 기본 답변 제공
      const defaultAnswer = "교안 내용이 제공되지 않아 질문에 대한 답변을 드릴 수 없습니다. 교안의 구체적인 내용을 알려주시면 도움을 드리겠습니다.";
      await Question.findByIdAndUpdate(
        questionId,
        {
          answer: defaultAnswer,
          "metadata.answer_by": "ai",
          "metadata.ai_answer": defaultAnswer,
        },
        { new: true }
      );
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
          content:
            "교안 내용을 기반으로 질문에 대해 간결하고 명확하게 답변합니다. 한두 문장으로 핵심만 답변합니다.",
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
        {
          // 기본 answer 필드에는 여전히 최신 답변을 넣어 둔다 (하위 호환)
          answer,
          "metadata.answer_by": "ai",
          "metadata.ai_answer": answer,
        },
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
