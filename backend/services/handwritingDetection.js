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
    let similarity = 1.0;

    if (i === 0) {
      isWritingIncreased = true;
      currentPageStartIndex = 0;
    } else {
      similarity = computeSimilarity(previousText, normalizedText);
      const textDecreased = textLength < previousTextLength * 0.4;
      const isAlmostEmpty = normalizedText.length < 10;

      isPageChanged = similarity < 0.45 || textDecreased || isAlmostEmpty;

      if (isPageChanged) {
        currentPageStartIndex = i;
        isWritingIncreased = true;
      } else {
        // 필기 증가 판단: 텍스트 길이 증가 또는 내용 변화가 큰 경우
        const textLengthIncreased = textLength > previousTextLength;
        const significantContentChange = similarity < 0.7 && textLength >= previousTextLength * 0.8;
        // 텍스트 길이가 약간 줄어들어도 내용이 많이 달라졌다면 필기 추가로 판단
        // (예: 색깔이 다른 필기 추가, 기존 텍스트 일부 삭제 후 새 필기 추가)
        const contentAdded = similarity < 0.75 && textLength >= previousTextLength * 0.7;
        
        isWritingIncreased = textLengthIncreased || significantContentChange || contentAdded;
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
      similarity: similarity,
      textLengthChange: i > 0 ? textLength - previousTextLength : 0,
      textLengthChangePercent: i > 0 && previousTextLength > 0 
        ? ((textLength - previousTextLength) / previousTextLength * 100).toFixed(1) 
        : "0.0",
    });

    previousText = normalizedText;
    previousTextLength = textLength;
  }

  return results;
}

/**
 * 필기량이 증가한 이미지만 필터링하고, 페이지 변경 전까지만 포함
 * 연속으로 줄어드는 구간에서는 첫 번째(줄어들기 시작한 지점)만 저장하고 중간 단계는 모두 제외
 * 예: 1->2->3에서 1만 저장, 2와 3은 제외
 * 페이지 변경 시에는 페이지 변경된 이미지도 저장
 * @param {Array} detectionResults - detectHandwritingChanges의 결과
 * @returns {Array} 필터링된 결과
 */
function filterIncreasedWriting(detectionResults) {
  if (detectionResults.length === 0) return [];
  
  const filtered = [];
  const savedIndices = new Set(); // 이미 저장된 인덱스를 추적하여 중복 방지
  let decreasingStartIndex = -1; // 연속으로 줄어들기 시작한 인덱스 (줄어들기 직전의 이미지)
  let isDecreasing = false;

  const addToFiltered = (index) => {
    if (!savedIndices.has(index)) {
      filtered.push(detectionResults[index]);
      savedIndices.add(index);
    }
  };

  for (let i = 0; i < detectionResults.length; i++) {
    const result = detectionResults[i];
    const prevResult = i > 0 ? detectionResults[i - 1] : null;

    // 페이지 변경 감지 - 페이지 변경 시 항상 저장
    if (result.isPageChanged && i > 0) {
      // 페이지 변경 시 이전 감소 구간의 시작점 저장
      if (isDecreasing && decreasingStartIndex >= 0) {
        addToFiltered(decreasingStartIndex);
        isDecreasing = false;
        decreasingStartIndex = -1;
      }
      // 페이지 변경된 이미지 저장 (새 페이지의 시작)
      addToFiltered(i);
      continue;
    }

    // 필기량 증가한 경우
    if (result.isWritingIncreased) {
      // 이전 감소 구간이 있었다면 그 시작점 저장 (줄어들기 직전의 이미지)
      if (isDecreasing && decreasingStartIndex >= 0) {
        addToFiltered(decreasingStartIndex);
        isDecreasing = false;
        decreasingStartIndex = -1;
      }
      addToFiltered(i);
    } 
    // 필기량이 줄어든 경우
    else if (prevResult && result.textLength < prevResult.textLength) {
      // 연속으로 줄어들기 시작
      if (!isDecreasing) {
        isDecreasing = true;
        decreasingStartIndex = i - 1; // 줄어들기 시작한 이전 이미지(마지막 증가/유지된 이미지)
      }
      // 계속 줄어드는 중이면 아무것도 하지 않음 (중간 단계 모두 제외)
    } 
    // 필기량이 유지되거나 증가하면 감소 구간 종료
    else if (isDecreasing) {
      // 감소 구간 종료 시 시작점 저장 (줄어들기 직전의 이미지)
      if (decreasingStartIndex >= 0) {
        addToFiltered(decreasingStartIndex);
      }
      isDecreasing = false;
      decreasingStartIndex = -1;
    }
  }

  // 마지막에 감소 구간이 남아있으면 시작점 저장
  if (isDecreasing && decreasingStartIndex >= 0) {
    addToFiltered(decreasingStartIndex);
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
    const similarityInfo = result.index > 0 ? `, 유사도=${(result.similarity * 100).toFixed(1)}%` : "";
    const changeInfo = result.index > 0 ? `, 변화=${result.textLengthChange > 0 ? '+' : ''}${result.textLengthChange} (${result.textLengthChangePercent}%)` : "";
    console.log(
      `[${result.index}] ${result.file}: 길이=${result.textLength}${changeInfo}${similarityInfo}, 증가=${result.isWritingIncreased}, 페이지변경=${result.isPageChanged}`
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

