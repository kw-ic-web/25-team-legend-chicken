const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 이미지 파일 저장 디렉토리 생성
const imageDir = "uploads/images/";
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

// 이미지 파일 저장 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imageDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// 파일 필터링 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("이미지 파일만 업로드 가능합니다. (jpg, jpeg, png, gif, webp)"), false);
  }
};

// 프로필 사진 업로드 설정
const uploadProfileImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});

// 썸네일 이미지 업로드 설정
const uploadThumbnail = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});

module.exports = {
  uploadProfileImage,
  uploadThumbnail,
};

