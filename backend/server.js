const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const { connectToDatabase } = require("./config/db");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./docs/swagger.yaml");

// 라우터
const authRouter = require("./routes/auth"); // 회원가입, 로그인 등 인증 관련 API
const studentRouter = require("./routes/student"); // student 랜딩페이지 관련 API
const professorRouter = require("./routes/professor"); // professor 랜딩페이지 관련 API
const lecturesRouter = require("./routes/lectures"); // 강의 공통 API
const whiteboardRouter = require("./routes/whiteboard"); // 화이트보드 스냅샷 API
const questionsRouter = require("./routes/questions"); // 질문 관련 API
const reportsRouter = require("./routes/reports"); // 리포트 관련 API

// 채팅 API
const chatRouter = require("./routes/chat");

const handwritingRouter = require("./routes/handwriting");
const materialsRouter = require("./routes/materials"); // 통일된 교안 API
const filesRouter = require("./routes/files"); // GridFS 파일 서빙

// 라우터 로드 확인
console.log("📦 라우터 로드 확인:");
console.log("  - materialsRouter:", materialsRouter ? "✅ 로드됨" : "❌ 로드 실패");
console.log("  - chatRouter:", chatRouter ? "✅ 로드됨" : "❌ 로드 실패");
console.log("  - filesRouter:", filesRouter ? "✅ 로드됨" : "❌ 로드 실패");

const http = require("http");
const { attachSocket } = require("./socket");

const app = express();
const PORT = process.env.PORT || 8080;

// Reverse proxy 환경에서 X-Forwarded-* 헤더 신뢰
// 프로덕션 환경에서는 trust proxy 설정 필요
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true);
}

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

connectToDatabase(process.env.MONGODB_URI);

// GridFS 초기화
const mongoose = require("mongoose");
mongoose.connection.once("open", () => {
  const { initGridFS } = require("./utils/gridfs");
  initGridFS();
  console.log("✅ GridFS가 초기화되었습니다.");
});

// 라우터 등록 (구체적인 경로를 먼저 등록)
app.use("/api", authRouter);
app.use("/api/student", studentRouter);
app.use("/api/professor", professorRouter);
app.use("/api/questions", questionsRouter); 
app.use("/api/chat", chatRouter); 
app.use("/api/reports", reportsRouter);
app.use("/api/handwriting", handwritingRouter);
app.use("/api/files", filesRouter); // GridFS 파일 서빙

// materials 라우터를 lectures 라우터보다 먼저 등록 (더 구체적인 경로)
app.use("/api", materialsRouter); // 통일된 교안 API - /api/lectures/:lectureId/classes/:classId/materials/*
app.use("/api", lecturesRouter); // 강의 공통 API
app.use("/api", whiteboardRouter); // 화이트보드 스냅샷 API

// 라우터 등록 확인 로그
console.log("✅ 라우터 등록 완료:");
console.log("  - /api/chat");
console.log("  - /api/lectures/:lectureId/classes/:classId/materials/pages");
console.log("  - /api/lectures/:lectureId/classes/:classId/materials/upload");
console.log("  - /api/files/:fileId");

app.get("/", (req, res) => {
  res.send("Lec-Q 서버가 실행 중입니다.");
});

app.use((req, res, next) => {
  console.error(`[404] 요청 경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`);
  console.error(`[404] 요청 헤더:`, {
    host: req.headers.host,
    origin: req.headers.origin,
    referer: req.headers.referer,
  });
  res.status(404).json({ 
    error: "요청하신 페이지를 찾을 수 없습니다.",
    method: req.method,
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "서버 오류가 발생했습니다." });
});

const server = http.createServer(app);
const io = attachSocket(server, process.env.CORS_ORIGIN || "*");
app.set("io", io);

server.listen(PORT, () => {
  console.log(`🚀 Lec-Q 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
