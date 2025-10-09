const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const uri = process.env.MONGODB_URI;

// 기본 설정
const app = express();
const PORT = process.env.PORT || 8080;

// 미들웨어
app.use(cors());
app.use(bodyParser.json());

// mongoDB 연결
if (!uri) {
  console.error(
    "❌ 환경변수 MONGODB_URI가 설정되지 않았습니다. .env 파일을 확인하세요."
  );
  process.exit(1);
}
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB에 성공적으로 연결되었습니다."))
  .catch((err) => {
    console.error("❌ MongoDB 연결 오류:", err);
    process.exit(1);
  });

//DB 스키마 정의
// Users(사용자)

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  role: { type: String, enum: ["student", "instructor"], required: true },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

//pdf(강의 파일)
const pdfSchema = new mongoose.Schema({
  title: String,
  description: String,
  url: String,
  pages: Number,
  uploadedAt: { type: Date, default: Date.now },
});

// Question(질문)
const questionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  page: Number, // 교안 페이지 위치
  isAnonymous: { type: Boolean, default: true },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  aiAnswer: String,
  instructorAnswer: String,
  createdAt: { type: Date, default: Date.now },
});
const Question = mongoose.model("Question", questionSchema);

// 4. 리포트(Report)
const reportSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  topQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  stats: {
    questionCount: Number,
    activeStudents: Number,
    wordCloud: [String],
  },
  createdAt: { type: Date, default: Date.now },
});
const Report = mongoose.model("Report", reportSchema);

// 강의(Lecture)
const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  professor: { type: String, required: true },
  status: {
    type: String,
    enum: ["ongoing", "upcoming", "finished"],
    default: "ongoing",
  },
  description: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
const Lecture = mongoose.model("Lecture", lectureSchema);

// api 라우트
// 회원가입
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const newUser = new User({ email, password, name, role });
    await newUser.save();
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 강의 조회
app.get("/lectures", async (req, res) => {
  try {
    const lectures = await Lecture.find(
      {},
      {
        _id: 1,
        title: 1,
        professor: 1,
        status: 1,
      }
    ).sort({ createdAt: -1 });

    const response = lectures.map((lec) => ({
      lectureId: String(lec._id),
      title: lec.title,
      professor: lec.professor,
      status: lec.status,
    }));

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 강의 생성
app.post("/lectures", async (req, res) => {
  try {
    const {
      title,
      professor,
      status = "ongoing",
      description = "",
    } = req.body || {};
    if (!title || !professor) {
      return res
        .status(400)
        .json({ message: "title과 professor는 필수입니다." });
    }

    const created = await Lecture.create({
      title,
      professor,
      status,
      description,
    });

    res.status(201).json({
      lectureId: String(created._id),
      message: "강의가 생성되었습니다.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 강의 상세 조회
app.get("/lectures/:lectureId", async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
    }

    res.status(200).json({
      lectureId: String(lecture._id),
      title: lecture.title,
      professor: lecture.professor,
      status: lecture.status,
      description: lecture.description || "",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 로그인
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user)
    return res.status(401).json({ success: false, message: "로그인 실패" });
  res.json({ success: true, user });
});

// 강의 개설
app.post("/api/courses", async (req, res) => {
  try {
    const { title, description, instructorId, schedule } = req.body;
    const newCourse = new Course({
      title,
      description,
      instructor: instructorId,
      schedule,
    });
    await newCourse.save();
    res.json({ success: true, course: newCourse });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 질문 등록
app.post("/api/questions", async (req, res) => {
  try {
    const { courseId, authorId, content, page, isAnonymous } = req.body;
    const newQuestion = new Question({
      course: courseId,
      author: authorId,
      content,
      page,
      isAnonymous,
    });
    await newQuestion.save();
    res.json({ success: true, question: newQuestion });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 질문 Upvote
app.post("/api/questions/:id/upvote", async (req, res) => {
  try {
    const { userId } = req.body;
    const question = await Question.findById(req.params.id);
    if (!question)
      return res.status(404).json({ success: false, message: "질문 없음" });

    if (!question.upvotes.includes(userId)) {
      question.upvotes.push(userId);
      await question.save();
    }

    res.json({ success: true, question });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

//  강의 리포트 생성
app.post("/api/reports", async (req, res) => {
  try {
    const { courseId, topQuestions, stats } = req.body;
    const newReport = new Report({ course: courseId, topQuestions, stats });
    await newReport.save();
    res.json({ success: true, report: newReport });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 서버 실행

app.listen(PORT, () => {
  console.log(`🚀 Lec-Q 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
