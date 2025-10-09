const mongoose = require("mongoose");

function connectToDatabase(uri) {
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
}

module.exports = { connectToDatabase };


