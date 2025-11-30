const { uploadFile } = require("../utils/gridfs");
const path = require("path");

/**
 * multer로 업로드된 파일을 GridFS에 저장하는 미들웨어
 * req.file.buffer를 GridFS에 저장하고 req.file.gridfsId를 설정
 */
async function uploadToGridFS(req, res, next) {
  try {
    if (!req.file) {
      return next();
    }

    // GridFS에 파일 저장
    const fileId = await uploadFile(
      req.file.buffer,
      req.file.originalname || req.file.fieldname,
      req.file.mimetype,
      {
        originalName: req.file.originalname,
        fieldName: req.file.fieldname,
      }
    );

    // GridFS 파일 ID를 req.file에 추가
    req.file.gridfsId = fileId;
    req.file.gridfsUrl = `/api/files/${fileId}`;

    // 기존 경로 정보는 유지 (하위 호환성)
    // 파일 ID로 대체된 URL
    req.file.path = `/api/files/${fileId}`;

    next();
  } catch (error) {
    console.error("GridFS 업로드 오류:", error);
    return res.status(500).json({
      success: false,
      message: "파일 업로드 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
}

/**
 * 여러 파일을 GridFS에 저장하는 미들웨어 (multer.array 사용 시)
 */
async function uploadMultipleToGridFS(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const uploadPromises = req.files.map(async (file) => {
      const fileId = await uploadFile(
        file.buffer,
        file.originalname || file.fieldname,
        file.mimetype,
        {
          originalName: file.originalname,
          fieldName: file.fieldname,
        }
      );

      file.gridfsId = fileId;
      file.gridfsUrl = `/api/files/${fileId}`;
      file.path = `/api/files/${fileId}`;
    });

    await Promise.all(uploadPromises);
    next();
  } catch (error) {
    console.error("GridFS 다중 업로드 오류:", error);
    return res.status(500).json({
      success: false,
      message: "파일 업로드 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
}

module.exports = {
  uploadToGridFS,
  uploadMultipleToGridFS,
};

