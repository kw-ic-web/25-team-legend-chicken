const vision = require("@google-cloud/vision");

// Google Cloud Vision 클라이언트 초기화
// GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되어 있어야 합니다.
let client;

const getClient = () => {
  if (!client) {
    client = new vision.ImageAnnotatorClient();
  }
  return client;
};

/**
 * 이미지에서 텍스트를 추출합니다.
 * @param {string} filePath - 분석할 이미지 파일 경로
 * @returns {Promise<{ text: string, raw: object }>}
 */
async function extractTextFromImage(filePath) {
  const annotator = getClient();
  const [result] = await annotator.documentTextDetection(filePath);

  const text = (result.fullTextAnnotation && result.fullTextAnnotation.text) || "";

  return {
    text: text.replace(/\r/g, "").trim(),
    raw: result,
  };
}

module.exports = {
  extractTextFromImage,
};

