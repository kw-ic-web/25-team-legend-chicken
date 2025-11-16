const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const Lecture = require("../models/lectures");
const Question = require("../models/Question");
const AnalysisReport = require("../models/AnalysisReport");
const OpenAI = require("openai");

// 권한 체크
async function verifyProfessorOwnership(user, lectureId) {
  if (user.user_type !== "professor") return { ok: false, code: 403, msg: "교수만 접근할 수 있습니다." };
  const lecture = await Lecture.findOne({ lecture_id: lectureId, professor_id: user._id });
  if (!lecture) return { ok: false, code: 404, msg: "강좌를 찾을 수 없습니다." };
  return { ok: true, lecture };
}

function tokenizeKo(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length >= 2);
}

function topKeywords(texts = [], limit = 10) {
  const freq = new Map();
  for (const t of texts) {
    for (const w of tokenizeKo(t)) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ id: word, label: word, weight: count }));
}

function cooccurrence(texts = [], keywords = []) {
  const keySet = new Set(keywords.map((k) => k.id));
  const edgeMap = new Map(); // "a|b" -> count
  for (const t of texts) {
    const ws = tokenizeKo(t).filter((w) => keySet.has(w));
    const uniq = [...new Set(ws)];
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        const a = uniq[i] < uniq[j] ? uniq[i] : uniq[j];
        const b = uniq[i] < uniq[j] ? uniq[j] : uniq[i];
        const key = `${a}|${b}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
    }
  }
  return [...edgeMap.entries()].map(([k, w]) => {
    const [a, b] = k.split("|");
    return { source: a, target: b, weight: w };
  });
}

function bucketizeTimeline(questions, bucketMinutes = 5) {
  if (!questions.length) return [];
  const times = questions.map((q) => new Date(q.created_at || q.createdAt || Date.now()).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const bucketMs = bucketMinutes * 60 * 1000;
  const buckets = [];
  for (let t = minT; t <= maxT + bucketMs; t += bucketMs) {
    buckets.push({ start: t, end: t + bucketMs, questions: 0, curious: 0 });
  }
  for (const q of questions) {
    const ts = new Date(q.created_at || q.createdAt || Date.now()).getTime();
    const idx = Math.floor((ts - minT) / bucketMs);
    if (buckets[idx]) {
      buckets[idx].questions += 1;
      buckets[idx].curious += Number(q.metadata?.likes || 0);
    }
  }
  return buckets.map((b) => ({ ...b, start: new Date(b.start), end: new Date(b.end) }));
}

function buildQuestionMatrix(questions) {
  const map = new Map(); // text -> { freq, popularity, authors:set }
  for (const q of questions) {
    const key = String(q.text || "").trim();
    if (!key) continue;
    const likes = Number(q.metadata?.likes || 0);
    const authorId = String(q.author?.id || "");
    if (!map.has(key)) {
      map.set(key, { frequency: 0, popularity: 0, authors: new Set() });
    }
    const entry = map.get(key);
    entry.frequency += 1;
    entry.popularity += likes;
    if (authorId) entry.authors.add(authorId);
  }
  return [...map.entries()].map(([text, v]) => ({
    text,
    frequency: v.frequency,
    popularity: v.popularity,
    uniqueAuthors: v.authors.size,
  }));
}

function buildLeaderboard(questions) {
  const askMap = new Map(); // userId -> { name, count }
  const voteMap = new Map(); // userId -> { name, likes }
  for (const q of questions) {
    const uid = String(q.author?.id || "");
    const name = q.author?.name || "익명";
    if (uid) {
      if (!askMap.has(uid)) askMap.set(uid, { name, count: 0 });
      askMap.get(uid).count += 1;
    }
    // voters 데이터가 별도로 없는 관계로 metadata.voters 배열을 가정(없으면 skip)
    const voters = Array.isArray(q.metadata?.voters) ? q.metadata.voters : [];
    for (const v of voters) {
      const vid = String(v.id || v.userId || "");
      const vname = v.name || "익명";
      if (!vid) continue;
      if (!voteMap.has(vid)) voteMap.set(vid, { name: vname, likes: 0 });
      voteMap.get(vid).likes += 1;
    }
  }
  const topAskers = [...askMap.entries()]
    .map(([userId, v]) => ({ userId, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topVoters = [...voteMap.entries()]
    .map(([userId, v]) => ({ userId, name: v.name, likes: v.likes }))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);
  return { topAskers, topVoters };
}

// ▶ 강의(클래스) 단위 분석 실행
router.post(
  "/:lectureId/classes/:classId/analysis/run",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId } = req.params;
      const { ok, code, msg, lecture } = await verifyProfessorOwnership(req.user, lectureId);
      if (!ok) return res.status(code).json({ message: msg });

      const cid = Number(classId);
      const questions = await Question.find({ lecture_id: lectureId, class_id: cid }).lean();

      const totalQuestions = questions.length;
      const totalCurious = questions.reduce((a, q) => a + Number(q.metadata?.likes || 0), 0);
      const uniqueAuthors = new Set(questions.map((q) => String(q.author?.id || ""))).size;
      const denom = Math.max(lecture.student_id_list?.length || 0, 1);
      const participationRate = uniqueAuthors / denom;

      const texts = questions.map((q) => q.text || "");
      const nodes = topKeywords(texts, 15);
      const edges = cooccurrence(texts, nodes);
      const hardestConcept = nodes.length ? nodes[0].label : "";

      const timeline = bucketizeTimeline(questions, 5);
      const questionMatrix = buildQuestionMatrix(questions);
      const leaderboard = buildLeaderboard(questions);

      // GPT 요약(선택)
      let gpt = { summary: "", sections: {}, usage: null };
      try {
        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
        if (apiKey) {
          const openai = new OpenAI({ apiKey });
          const prompt = `다음 강의 데이터를 요약해 교수에게 actionable insights를 제공하세요.
강의: ${lecture.name}
질문 수: ${totalQuestions}, 궁금해요 합: ${totalCurious}, 참여율: ${(participationRate * 100).toFixed(1)}%, 가장 어려운 개념: ${hardestConcept}
상위 키워드: ${nodes.slice(0,10).map(n=>n.label).join(", ")}
타임라인(5분 단위) 질문 카운트: ${timeline.map(b=>b.questions).join(", ")}
요구 포맷: 1) 핵심 요약 2) 다음 강의 개선 제안 3) 학생 과제/복습 가이드 4) 평가 포인트`;
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "교육 데이터 분석 전문가" },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 700,
          });
          gpt.summary = completion.choices?.[0]?.message?.content || "";
          if (completion.usage) {
            gpt.usage = {
              prompt_tokens: completion.usage.prompt_tokens,
              completion_tokens: completion.usage.completion_tokens,
              total_tokens: completion.usage.total_tokens,
              estimated_cost:
                ((completion.usage.prompt_tokens * 0.00015) +
                  (completion.usage.completion_tokens * 0.0006)) / 1000,
            };
          }
        }
      } catch (e) {
        gpt.summary = gpt.summary || "GPT 요약 생성에 실패했습니다. 데이터 기반 시각화만 저장합니다.";
      }

      const report = await AnalysisReport.create({
        lecture_id: lectureId,
        class_id: cid,
        kpis: { totalQuestions, totalCurious, participationRate, hardestConcept },
        timeline,
        questionMatrix,
        conceptGraph: { nodes, edges },
        leaderboard,
        gpt,
      });

      return res.status(201).json({ message: "분석이 생성되었습니다.", report_id: report._id });
    } catch (err) {
      console.error("분석 생성 오류:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ▶ 강좌(코스) 단위 분석 실행
router.post(
  "/:lectureId/analysis/run",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId } = req.params;
      const { ok, code, msg, lecture } = await verifyProfessorOwnership(
        req.user,
        lectureId
      );
      if (!ok) return res.status(code).json({ message: msg });

      // 해당 강좌의 모든 질문 사용 (모든 class_id 포함)
      const questions = await Question.find({ lecture_id: lectureId }).lean();
      const totalQuestions = questions.length;
      const totalCurious = questions.reduce(
        (a, q) => a + Number(q.metadata?.likes || 0),
        0
      );
      const uniqueAuthors = new Set(
        questions.map((q) => String(q.author?.id || ""))
      ).size;
      const denom = Math.max(lecture.student_id_list?.length || 0, 1);
      const participationRate = uniqueAuthors / denom;

      const texts = questions.map((q) => q.text || "");
      const nodes = topKeywords(texts, 20);
      const edges = cooccurrence(texts, nodes);
      const hardestConcept = nodes.length ? nodes[0].label : "";

      const timeline = bucketizeTimeline(questions, 5);
      const questionMatrix = buildQuestionMatrix(questions);
      const leaderboard = buildLeaderboard(questions);

      // GPT 요약(선택)
      let gpt = { summary: "", sections: {}, usage: null };
      try {
        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
        if (apiKey) {
          const openai = new OpenAI({ apiKey });
          const prompt = `다음 강좌 데이터를 요약해 교수에게 actionable insights를 제공하세요.
강좌: ${lecture.name}
총 질문 수: ${totalQuestions}, 총 궁금해요 수: ${totalCurious}, 참여율: ${(participationRate * 100).toFixed(
            1
          )}%, 가장 어려웠던 개념: ${hardestConcept}
상위 키워드: ${nodes
            .slice(0, 15)
            .map((n) => n.label)
            .join(", ")}
주차(클래스)를 모두 포함한 타임라인(5분 단위) 질문 카운트: ${timeline
            .map((b) => b.questions)
            .join(", ")}
요구 포맷: 1) 강좌 전체 핵심 요약 2) 난이도 높은 주차/주제 요약 3) 다음 학기 강의 개선 제안 4) 학생들에게 줄 복습/예습 가이드`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "교육 데이터 분석 전문가" },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 900,
          });
          gpt.summary = completion.choices?.[0]?.message?.content || "";
          if (completion.usage) {
            gpt.usage = {
              prompt_tokens: completion.usage.prompt_tokens,
              completion_tokens: completion.usage.completion_tokens,
              total_tokens: completion.usage.total_tokens,
              estimated_cost:
                ((completion.usage.prompt_tokens * 0.00015) +
                  (completion.usage.completion_tokens * 0.0006)) /
                1000,
            };
          }
        }
      } catch (e) {
        gpt.summary =
          gpt.summary ||
          "GPT 요약 생성에 실패했습니다. 강좌 전체 통계와 시각화 데이터만 저장합니다.";
      }

      const report = await AnalysisReport.create({
        lecture_id: lectureId,
        class_id: 0, // 0번은 강좌 전체 집계용으로 사용
        kpis: { totalQuestions, totalCurious, participationRate, hardestConcept },
        timeline,
        questionMatrix,
        conceptGraph: { nodes, edges },
        leaderboard,
        gpt,
      });

      return res
        .status(201)
        .json({ message: "강좌 단위 분석이 생성되었습니다.", report_id: report._id });
    } catch (err) {
      console.error("강좌 단위 분석 생성 오류:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ▶ 강의(클래스) 단위 최신 분석 조회
router.get(
  "/:lectureId/classes/:classId/analysis/latest",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId, classId } = req.params;
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      const isProfessor =
        req.user.user_type === "professor" && String(lecture.professor_id) === String(req.user._id);
      const isStudent =
        req.user.user_type === "student" &&
        (lecture.student_id_list || []).some((id) => String(id) === String(req.user._id));
      if (!isProfessor && !isStudent) return res.status(403).json({ message: "권한이 없습니다." });

      const cid = Number(classId);
      const report = await AnalysisReport.findOne({
        lecture_id: lectureId,
        class_id: cid,
      })
        .sort({ createdAt: -1 })
        .lean();
      if (!report) return res.status(404).json({ message: "분석 결과가 없습니다." });
      return res.json(report);
    } catch (err) {
      console.error("최신 분석 조회 오류:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

// ▶ 강좌(코스) 단위 최신 분석 조회
router.get(
  "/:lectureId/analysis/latest",
  authenticateToken,
  async (req, res) => {
    try {
      const { lectureId } = req.params;
      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture)
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      const isProfessor =
        req.user.user_type === "professor" &&
        String(lecture.professor_id) === String(req.user._id);
      const isStudent =
        req.user.user_type === "student" &&
        (lecture.student_id_list || []).some(
          (id) => String(id) === String(req.user._id)
        );
      if (!isProfessor && !isStudent)
        return res.status(403).json({ message: "권한이 없습니다." });

      const report = await AnalysisReport.findOne({
        lecture_id: lectureId,
        class_id: 0,
      })
        .sort({ createdAt: -1 })
        .lean();
      if (!report)
        return res.status(404).json({ message: "강좌 단위 분석 결과가 없습니다." });
      return res.json(report);
    } catch (err) {
      console.error("강좌 단위 최신 분석 조회 오류:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
  }
);

module.exports = router;


