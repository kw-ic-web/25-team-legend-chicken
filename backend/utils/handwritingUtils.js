/**
 * 텍스트를 토큰화합니다.
 * @param {string} text - 토큰화할 텍스트
 * @returns {string[]} 토큰 배열
 */
function tokenize(text = "") {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9가-힣]/g, ""))
    .filter(Boolean);
}

/**
 * 두 텍스트 간의 유사도를 계산합니다 (Jaccard 유사도).
 * @param {string} a - 첫 번째 텍스트
 * @param {string} b - 두 번째 텍스트
 * @returns {number} 유사도 (0-1)
 */
function computeSimilarity(a = "", b = "") {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (tokensA.size === 0 && tokensB.size === 0) {
    return 1;
  }

  const intersection = [...tokensA].filter((token) => tokensB.has(token));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.length / union.size;
}

/**
 * 페이지 변경 여부를 판단합니다.
 * @param {string} prevText - 이전 텍스트
 * @param {string} nextText - 다음 텍스트
 * @returns {boolean} 페이지 변경 여부
 */
function shouldFinalize(prevText = "", nextText = "") {
  if (!prevText) return false;
  const similarity = computeSimilarity(prevText, nextText);
  const shortened = nextText.length < prevText.length * 0.4;
  const nextIsAlmostEmpty = nextText.trim().length < 10;

  return similarity < 0.45 || shortened || nextIsAlmostEmpty;
}

module.exports = {
  tokenize,
  computeSimilarity,
  shouldFinalize,
};

