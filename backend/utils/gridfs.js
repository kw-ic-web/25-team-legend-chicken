const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const { Readable } = require("stream");

// GridFS 버킷 인스턴스
let gridfsBucket = null;

/**
 * GridFS 버킷 초기화
 */
function initGridFS() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB 연결이 설정되지 않았습니다.");
  }
  gridfsBucket = new GridFSBucket(db, { bucketName: "files" });
  return gridfsBucket;
}

/**
 * GridFS 버킷 가져오기 (초기화되지 않았으면 초기화)
 */
function getBucket() {
  if (!gridfsBucket) {
    return initGridFS();
  }
  return gridfsBucket;
}

/**
 * 파일을 GridFS에 저장
 * @param {Buffer} buffer - 파일 데이터 버퍼
 * @param {string} filename - 파일명
 * @param {string} contentType - MIME 타입
 * @param {Object} metadata - 추가 메타데이터
 * @returns {Promise<string>} 파일 ID
 */
async function uploadFile(buffer, filename, contentType, metadata = {}) {
  const bucket = getBucket();
  
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        ...metadata,
        uploadedAt: new Date(),
      },
    });

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    readable
      .pipe(uploadStream)
      .on("error", (error) => {
        reject(error);
      })
      .on("finish", () => {
        resolve(uploadStream.id.toString());
      });
  });
}

/**
 * GridFS에서 파일 읽기
 * @param {string} fileId - 파일 ID
 * @returns {Promise<{stream: Readable, metadata: Object}>}
 */
async function downloadFile(fileId) {
  const bucket = getBucket();
  const ObjectId = mongoose.Types.ObjectId;

  try {
    const fileIdObj = new ObjectId(fileId);
    
    // 파일 메타데이터 조회
    const files = await bucket.find({ _id: fileIdObj }).toArray();
    if (files.length === 0) {
      throw new Error("파일을 찾을 수 없습니다.");
    }

    const fileMetadata = files[0];
    
    // 파일 스트림 생성
    const downloadStream = bucket.openDownloadStream(fileIdObj);

    return {
      stream: downloadStream,
      metadata: {
        filename: fileMetadata.filename,
        contentType: fileMetadata.contentType || "application/octet-stream",
        length: fileMetadata.length,
        uploadDate: fileMetadata.uploadDate,
        metadata: fileMetadata.metadata || {},
      },
    };
  } catch (error) {
    if (error.message === "파일을 찾을 수 없습니다.") {
      throw error;
    }
    throw new Error(`파일 다운로드 오류: ${error.message}`);
  }
}

/**
 * GridFS에서 파일 삭제
 * @param {string} fileId - 파일 ID
 * @returns {Promise<void>}
 */
async function deleteFile(fileId) {
  const bucket = getBucket();
  const ObjectId = mongoose.Types.ObjectId;

  try {
    const fileIdObj = new ObjectId(fileId);
    await bucket.delete(fileIdObj);
  } catch (error) {
    throw new Error(`파일 삭제 오류: ${error.message}`);
  }
}

/**
 * 파일 존재 여부 확인
 * @param {string} fileId - 파일 ID
 * @returns {Promise<boolean>}
 */
async function fileExists(fileId) {
  const bucket = getBucket();
  const ObjectId = mongoose.Types.ObjectId;

  try {
    const fileIdObj = new ObjectId(fileId);
    const files = await bucket.find({ _id: fileIdObj }).toArray();
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

module.exports = {
  initGridFS,
  getBucket,
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
};

