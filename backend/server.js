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

const http = require("http");
const { attachSocket } = require("./socket");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

connectToDatabase(process.env.MONGODB_URI);

app.use("/api", authRouter);
app.use("/api/student", studentRouter);
app.use("/api/professor", professorRouter);
app.use("/api", lecturesRouter);
app.use("/api", whiteboardRouter);
app.use("/api/questions", questionsRouter); 
app.use("/api/chat", chatRouter); 
app.use("/api/reports", reportsRouter);
app.use("/api/handwriting", handwritingRouter);

app.get("/", (req, res) => {
  res.send("Lec-Q 서버가 실행 중입니다.");
});

app.use((req, res, next) => {
  res.status(404).send({ error: "요청하신 페이지를 찾을 수 없습니다." });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: "서버 오류가 발생했습니다." });
});

const server = http.createServer(app);
const io = attachSocket(server, process.env.CORS_ORIGIN || "*");
app.set("io", io);

// 0.0.0.0으로 바인딩하여 모든 네트워크 인터페이스에서 접근 가능하게 함
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Lec-Q 서버가 ${PORT}번 포트에서 실행 중입니다.`);
  console.log(`   로컬 접속: http://localhost:${PORT}`);
  console.log(`   네트워크 접속: http://0.0.0.0:${PORT}`);
  console.log(`   다른 컴퓨터에서 접근하려면 이 컴퓨터의 IP 주소를 사용하세요.`);
});
