const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 디렉토리 생성 유틸
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const baseImageDir = "uploads/images/";
const whiteboardDir = "uploads/whiteboard/";

ensureDir(baseImageDir);
ensureDir(whiteboardDir);

const createStorage = (targetDir) =>
  multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, targetDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

const imageStorage = createStorage(baseImageDir);
const whiteboardStorage = createStorage(whiteboardDir);

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
  storage: imageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});

// 썸네일 이미지 업로드 설정
const uploadThumbnail = multer({
  storage: imageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
});

// 화이트보드 스냅샷 업로드 설정
const uploadWhiteboardSnapshot = multer({
  storage: whiteboardStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

module.exports = {
  uploadProfileImage,
  uploadThumbnail,
  uploadWhiteboardSnapshot,
};

