const multer = require("multer");
const path = require("path");

// PDF 파일 필터링 (PDF만 허용)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("PDF 파일만 업로드 가능합니다."), false);
  }
};

// Memory storage로 변경 (GridFS에 저장하기 위해)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

module.exports = upload;
