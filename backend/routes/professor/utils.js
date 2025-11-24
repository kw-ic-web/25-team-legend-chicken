const OpenAI = require("openai");

const STOPWORDS_KO = new Set([
  "주차", "1주차", "2주차", "3주차", "4주차", "5주차", "6주차", "7주차", "8주차", "9주차", "10주차",
  "1주", "2주", "3주", "4주", "5주", "6주", "7주", "8주", "9주", "10주",
  "이번", "다음", "이전", "오늘", "내일", "어제",
  "수업", "강의", "과목", "교과목", "수업에", "강의에", "과목에",
  "질문", "답변", "답", "문의",
  "이것", "그것", "저것", "이거", "그거", "저거",
  "어느", "어떤", "어디", "언제", "누구", "무엇", "무엇을",
  "에서", "에게", "으로", "로", "의", "을", "를", "이", "가", "은", "는", "에", "와", "과",
  "대한", "위한", "관한", "대해", "위해", "관해",
  "것", "거", "게", "건", "것을", "것이", "것은",
  "때문", "위해", "대해", "관해",
  "있습니다", "합니다", "됩니다", "입니다",
  "그리고", "또한", "또", "그런데", "하지만", "그러나",
  "하는", "하는데", "하는지", "하는것", "하는거",
  "되는", "되는데", "되는지",
  "있는", "있는데", "있는지",
]);

function removeJosa(word) {
  const josaPatterns = [
    /에$/g, /에서$/g, /에게$/g, /으로$/g, /로$/g,
    /의$/g, /을$/g, /를$/g, /이$/g, /가$/g, /은$/g, /는$/g,
    /와$/g, /과$/g, /도$/g, /만$/g, /까지$/g, /부터$/g,
    /처럼$/g, /같이$/g, /보다$/g, /마다$/g,
  ];
  
  let cleaned = word;
  for (const pattern of josaPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  
  return cleaned;
}

async function filterMeaningfulWord(word, wordFreq) {
  const cleanedWord = removeJosa(word);
  
  if (STOPWORDS_KO.has(word) || STOPWORDS_KO.has(cleanedWord)) {
    return false;
  }

  if (/^\d+$/.test(word) || /^\d+$/.test(cleanedWord)) {
    return false;
  }

  if (word.length < 2 || cleanedWord.length < 2) {
    return false;
  }

  if (cleanedWord.length < 2) {
    return false;
  }

  if (word !== cleanedWord && cleanedWord.length === 0) {
    return false;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const wordToCheck = cleanedWord.length > 0 ? cleanedWord : word;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "당신은 한국어 단어 분석 전문가입니다. 주어진 단어가 의미 있는 개념, 용어, 기술 용어, 학술 용어인지 판단합니다. 조사나 접미사가 붙은 단어는 제외합니다.",
          },
          {
            role: "user",
            content: `다음 단어가 의미 있는 개념이나 용어인지 판단해주세요: "${wordToCheck}"\n\n의미 있는 개념/용어면 "yes", 불용어나 의미 없는 단어면 "no"로만 답변해주세요.`,
          },
        ],
        max_tokens: 10,
        temperature: 0.3,
      });

      const response = completion.choices?.[0]?.message?.content?.trim().toLowerCase();
      if (response && (response.includes("no") || response.includes("아니"))) {
        return false;
      }
    } catch (error) {
      console.warn(`GPT 필터링 실패, 불용어 사전 기반으로 진행: ${error.message}`);
    }
  }

  return true;
}

function tokenizeKo(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length >= 2);
}

async function extractHardestConceptWithGPT(questions) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
  if (!apiKey) {
    console.warn("OpenAI API 키가 설정되지 않아 GPT 분석을 수행할 수 없습니다.");
    return "";
  }

  if (!questions || questions.length === 0) {
    return "";
  }

  try {
    const questionTexts = questions
      .map((q) => q.text || "")
      .filter(Boolean)
      .slice(0, 50);

    if (questionTexts.length === 0) {
      return "";
    }

    const questionsText = questionTexts.join("\n- ");

    const openai = new OpenAI({ apiKey });

    const prompt = `다음은 학생들이 강의 중에 남긴 질문들입니다. 이 질문들을 분석하여 가장 어려웠던 개념을 한 단어로 추출해주세요.

## 질문 목록:
- ${questionsText}

## 요구사항:
1. 가장 어려웠던 개념을 **한 단어**로만 답변해주세요.
2. 다음 불용어는 절대 포함하지 마세요: 이유, 2주차, 3주차, 수업, 강의, 질문, 답변, 방법, 무엇, 어디, 언제, 누구, 어떤, 어느, 대한, 위한, 관련, 이것, 그것, 저것
3. 기술 용어나 학술 용어를 우선적으로 선택해주세요 (예: WebRTC, MongoDB, Express, Socket.IO, JWT, REST API 등)
4. 한글이나 영문 모두 가능하지만, 한 단어만 답변해주세요.
5. 답변은 단어만 출력하고 설명은 하지 마세요.

가장 어려웠던 개념:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 교육 데이터 분석 전문가입니다. 학생들의 질문을 분석하여 가장 어려웠던 개념을 정확하게 한 단어로 추출합니다. 불용어나 일반적인 단어는 제외하고 기술 용어나 학술 용어를 우선적으로 선택합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const response = completion.choices?.[0]?.message?.content?.trim();
    
    if (!response) {
      return "";
    }

    const concept = response
      .split(/[,\n]/)[0]
      .trim()
      .replace(/^[-•\s]+/, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim();

    if (concept.length < 2) {
      return "";
    }

    const lowerConcept = concept.toLowerCase();
    const stopwords = ["이유", "주차", "수업", "강의", "질문", "답변", "방법", "무엇", "어디", "언제", "누구", "어떤", "어느", "대한", "위한", "관련"];
    
    for (const stopword of stopwords) {
      if (lowerConcept.includes(stopword)) {
        return "";
      }
    }

    return concept;
  } catch (error) {
    console.error("GPT hardest_concept 추출 오류:", error.message || error);
    return "";
  }
}

module.exports = {
  STOPWORDS_KO,
  removeJosa,
  filterMeaningfulWord,
  tokenizeKo,
  extractHardestConceptWithGPT,
};

