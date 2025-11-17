const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const { connectToDatabase } = require("./config/db");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./docs/swagger.yaml");

const authRouter = require("./routes/auth");
const studentRouter = require("./routes/student");
const professorRouter = require("./routes/professor");
const lecturesRouter = require("./routes/lectures");
const whiteboardRouter = require("./routes/whiteboard");
const questionsRouter = require("./routes/questions");
const chatRouter = require("./routes/chat");
const reportsRouter = require("./routes/reports");

const http = require("http");
const { attachSocket } = require("./socket");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
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

server.listen(PORT, () => {
  console.log(`🚀 Lec-Q 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
