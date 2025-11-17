const fs = require("fs-extra");
const path = require("path");
const { extractTextFromImage } = require("./vision");
const { computeSimilarity } = require("../utils/handwritingUtils");

/**
 * 필기량 변화를 감지하고 필기량이 증가한 이미지만 필터링
 * @param {string} imageDir - 이미지들이 있는 디렉토리 경로
 * @param {string[]} imageFiles - 이미지 파일명 배열 (순서대로)
 * @returns {Promise<Array<{index: number, file: string, text: string, textLength: number, isWritingIncreased: boolean, isPageChanged: boolean}>>}
 */
async function detectHandwritingChanges(imageDir, imageFiles) {
  const results = [];
  let previousText = "";
  let previousTextLength = 0;
  let currentPageStartIndex = 0;

  for (let i = 0; i < imageFiles.length; i++) {
    const imageFile = imageFiles[i];
    const imagePath = path.join(imageDir, imageFile);

    if (!(await fs.pathExists(imagePath))) {
      console.warn(`이미지 파일을 찾을 수 없습니다: ${imagePath}`);
      continue;
    }

    const { text } = await extractTextFromImage(imagePath);
    const textLength = text.length;
    const normalizedText = text.trim();

    let isWritingIncreased = false;
    let isPageChanged = false;

    if (i === 0) {
      isWritingIncreased = true;
      currentPageStartIndex = 0;
    } else {
      const similarity = computeSimilarity(previousText, normalizedText);
      const textDecreased = textLength < previousTextLength * 0.4;
      const isAlmostEmpty = normalizedText.length < 10;

      isPageChanged = similarity < 0.45 || textDecreased || isAlmostEmpty;

      if (isPageChanged) {
        currentPageStartIndex = i;
        isWritingIncreased = true;
      } else {
        isWritingIncreased = textLength > previousTextLength;
      }
    }

    results.push({
      index: i,
      file: imageFile,
      text: normalizedText,
      textLength: textLength,
      isWritingIncreased: isWritingIncreased,
      isPageChanged: isPageChanged,
      pageStartIndex: currentPageStartIndex,
    });

    previousText = normalizedText;
    previousTextLength = textLength;
  }

  return results;
}

/**
 * 필기량이 증가한 이미지만 필터링하고, 페이지 변경 전까지만 포함
 * @param {Array} detectionResults - detectHandwritingChanges의 결과
 * @returns {Array} 필터링된 결과
 */
function filterIncreasedWriting(detectionResults) {
  const filtered = [];
  let lastPageChangeIndex = -1;

  for (let i = 0; i < detectionResults.length; i++) {
    const result = detectionResults[i];

    if (result.isPageChanged && i > 0) {
      lastPageChangeIndex = i;
    }

    if (result.isWritingIncreased) {
      if (lastPageChangeIndex >= 0 && i >= lastPageChangeIndex) {
        break;
      }
      filtered.push(result);
    }
  }

  return filtered;
}

/**
 * handwriting_test 폴더의 이미지들을 분석하여 필기량 증가 감지
 * @param {string} testDir - handwriting_test 디렉토리 경로
 * @returns {Promise<Array>} 필터링된 결과
 */
async function analyzeHandwritingTest(testDir) {
  const imageFiles = ["0.jpeg", "1.jpeg", "2.jpeg", "3.jpeg", "4.jpeg", "5.jpeg"];

  console.log("필기량 변화 감지 시작...");
  const allResults = await detectHandwritingChanges(testDir, imageFiles);

  console.log("\n=== 전체 분석 결과 ===");
  allResults.forEach((result) => {
    console.log(
      `[${result.index}] ${result.file}: 길이=${result.textLength}, 증가=${result.isWritingIncreased}, 페이지변경=${result.isPageChanged}`
    );
  });

  const filtered = filterIncreasedWriting(allResults);

  console.log("\n=== 필터링된 결과 (필기량 증가만) ===");
  filtered.forEach((result) => {
    console.log(`[${result.index}] ${result.file}: 길이=${result.textLength}`);
  });

  return filtered;
}

module.exports = {
  detectHandwritingChanges,
  filterIncreasedWriting,
  analyzeHandwritingTest,
};

