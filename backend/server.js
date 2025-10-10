const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const { connectToDatabase } = require("./config/db");

// 라우터
const authRouter = require("./routes/auth");
const lecturesRouter = require("./routes/lectures");
const coursesRouter = require("./routes/courses");
const questionsRouter = require("./routes/questions");
const reportsRouter = require("./routes/reports");

// 기본 설정
const app = express();
const PORT = process.env.PORT || 8080;

// 미들웨어
app.use(cors());
app.use(bodyParser.json());

// DB 연결
connectToDatabase(process.env.MONGODB_URI);

// 라우트 마운트
app.use("/api", authRouter); // /api/register, /api/login
app.use("/lectures", lecturesRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/reports", reportsRouter);

// 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 Lec-Q 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
