const vision = require("@google-cloud/vision");
const fs = require("fs");
const path = require("path");

// Google Cloud Vision 클라이언트 초기화
// GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되어 있어야 합니다.
let client;
let clientInitialized = false;
let clientError = null;

const getClient = () => {
  // credentials가 없으면 클라이언트를 초기화하지 않음
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }
  
  // 파일이 실제로 존재하는지 확인
  try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    // 경로가 디렉토리인지 파일인지 확인
    if (!fs.existsSync(credPath)) {
      if (!clientError) {
        console.warn(`GCP credentials 파일/디렉토리가 존재하지 않습니다: ${credPath}`);
        clientError = new Error("Credentials file not found");
      }
      return null;
    }
    // 파일인지 확인 (디렉토리가 아닌)
    const stats = fs.statSync(credPath);
    if (!stats.isFile()) {
      if (!clientError) {
        console.warn(`GCP credentials 경로가 파일이 아닙니다: ${credPath}`);
        clientError = new Error("Credentials path is not a file");
      }
      return null;
    }
  } catch (err) {
    if (!clientError) {
      console.warn("GCP credentials 경로 확인 실패:", err?.message || err);
      clientError = err;
    }
    return null;
  }
  
  // 이미 에러가 발생했으면 다시 시도하지 않음
  if (clientError && clientError.message !== "Credentials file not found") {
    return null;
  }
  
  if (!client && !clientInitialized) {
    clientInitialized = true;
    try {
      // 클라이언트 생성 시도
      // 생성자 내부에서 파일을 찾으려고 시도할 수 있으므로 try-catch로 감싸기
      client = new vision.ImageAnnotatorClient({
        // 명시적으로 credentials를 전달하지 않으면 환경 변수를 사용
        // 하지만 파일이 없으면 여기서 에러가 발생할 수 있음
      });
      // 초기화 성공 시 에러 상태 초기화
      clientError = null;
    } catch (err) {
      // 생성자 호출 시점에 에러가 발생할 수 있음 (파일이 없거나 잘못된 경우)
      console.error("Google Cloud Vision 클라이언트 초기화 실패:", err?.message || err);
      clientError = err;
      client = null; // 클라이언트를 null로 설정
      return null;
    }
  }
  return client;
};

/**
 * 이미지에서 텍스트를 추출합니다.
 * @param {string} filePath - 분석할 이미지 파일 경로
 * @returns {Promise<{ text: string, raw: object }>}
 */
async function extractTextFromImage(filePath) {
  try {
    // 자격증명 미설정 시 안전하게 우회
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn("GOOGLE_APPLICATION_CREDENTIALS가 설정되지 않아 OCR을 건너뜁니다.");
      return { text: "", raw: null };
    }
    
    const annotator = getClient();
    if (!annotator) {
      console.warn("Google Cloud Vision 클라이언트를 초기화할 수 없어 OCR을 건너뜁니다.");
      return { text: "", raw: null };
    }
    
    const [result] = await annotator.documentTextDetection(filePath);
    const text = (result.fullTextAnnotation && result.fullTextAnnotation.text) || "";
    return {
      text: text.replace(/\r/g, "").trim(),
      raw: result,
    };
  } catch (err) {
    // OCR 실패 시에도 크래시 방지하고 빈 텍스트로 진행
    console.error("Vision OCR 오류:", err?.message || err);
    return { text: "", raw: null };
  }
}

module.exports = {
  extractTextFromImage,
};

