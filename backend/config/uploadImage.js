const multer = require("multer");

// 파일 필터링 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("이미지 파일만 업로드 가능합니다. (jpg, jpeg, png, gif, webp)"), false);
  }
};

// Memory storage로 변경 (GridFS에 저장하기 위해)
const storage = multer.memoryStorage();

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

// 화이트보드 스냅샷 업로드 설정
const uploadWhiteboardSnapshot = multer({
  storage: storage,
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

