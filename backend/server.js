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

//DB 스키마 및 모델 정의
