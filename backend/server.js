const express = require("express");
const bodyParser = require("body-parser"); // 클라이언트가 보내는 요청의 본문(body)을 서버에서 쉽게 처리할 수 있는 형태로 파싱
const cors = require("cors");
require("dotenv").config(); // .env 파일에 저장해 둔 환경 변수들을 process.env 객체로 불러와 코드에서 사용할 수 있게 함
const { connectToDatabase } = require("./config/db"); // ./config/db.js 파일에 별도로 작성된 데이터베이스 연결 함수를 가져옴
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
const chatRouter = require("./routes/chat"); // 채팅 관련 API
const reportsRouter = require("./routes/reports"); // 리포트 관련 API

const http = require("http");
const { attachSocket } = require("./socket");

// 기본 설정
const app = express();
const PORT = process.env.PORT || 8080;

// 미들웨어
app.use(cors());
app.use(bodyParser.json());

// 정적 파일 서빙 (업로드된 PDF 파일 접근용)
app.use("/uploads", express.static("uploads")); // '/uploads' 경로로 들어오는 요청에 대해 'uploads' 폴더의 정적 파일을 서빙

// 프론트엔드 정적 파일 서빙
app.use(express.static("public"));

// Swagger API 문서
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// DB 연결
connectToDatabase(process.env.MONGODB_URI);

// 라우트 마운트

app.use("/api", authRouter); // /api/register, /api/login
app.use("/api/student", studentRouter);
app.use("/api/professor", professorRouter);
app.use("/api", lecturesRouter); // 강의 공통 라우트
app.use("/api", whiteboardRouter);
app.use("/api/questions", questionsRouter); 
app.use("/api/chat", chatRouter); 
app.use("/api/reports", reportsRouter);

app.get("/", (req, res) => {
  // GET 메서드로 명확히 지정
  res.send("Lec-Q 서버가 실행 중입니다.");
});

// ------------------- 추가된 부분 ------------------- //
// 등록된 라우트가 없는 경우 404 에러 처리
app.use((req, res, next) => {
  res.status(404).send({ error: "요청하신 페이지를 찾을 수 없습니다." });
});
// ---------------------------------------------------- //

// 모든 에러를 처리하는 미들웨어 (가장 마지막에 위치해야 함)

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "서버 오류가 발생했습니다." });
});

// 수정된 부분 시작
const server = http.createServer(app);
const io = attachSocket(server, process.env.CORS_ORIGIN || "*");
app.set("io", io);

server.listen(PORT, () => {
  console.log(`🚀 Lec-Q 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
