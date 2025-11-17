const express = require("express");
const router = express.Router();
const Lecture = require("../../models/lectures");
const { authenticateToken } = require("../../middleware/auth");
const OpenAI = require("openai");

router.get(
  "/:lectureId/classes/:classId/report",
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user;
      const { lectureId, classId } = req.params;

      if (user.user_type !== "professor") {
        return res
          .status(403)
          .json({ message: "교수만 리포트를 생성할 수 있습니다." });
      }

      const lecture = await Lecture.findOne({ lecture_id: lectureId });
      if (!lecture) {
        return res.status(404).json({ message: "강좌를 찾을 수 없습니다." });
      }

      if (lecture.professor_id.toString() !== user._id.toString()) {
        return res
          .status(403)
          .json({ message: "본인의 강좌만 리포트를 생성할 수 있습니다." });
      }

      const classData = lecture.classes.find(
        (cls) => cls.id === parseInt(classId)
      );
      
      if (!classData) {
        return res.status(404).json({ message: "해당 클래스를 찾을 수 없습니다." });
      }

      const mockQuestions = [
        {
          student_name: "김학생",
          question: `${classData.title}에 대해 제가 이해한 게 맞는지 확인하고 싶습니다.`,
          timestamp: new Date().toISOString(),
        },
        {
          student_name: "이학생",
          question: `${classData.title} 수업 내용을 다시 정리해주실 수 있나요?`,
          timestamp: new Date().toISOString(),
        },
        {
          student_name: "박학생",
          question: `${classData.description || classData.title}와 관련해서 추가 자료가 있을까요?`,
          timestamp: new Date().toISOString(),
        },
        {
          student_name: "최학생",
          question: `다음 주차 내용을 미리 예습하고 싶은데, 어떤 부분을 중점적으로 봐야 할까요?`,
          timestamp: new Date().toISOString(),
        },
      ];

      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API;
      if (!apiKey) {
        return res.status(500).json({
          message: "OpenAI API 키가 설정되지 않았습니다. .env 파일에 OPENAI_API_KEY 또는 OPENAI_API를 설정해주세요.",
        });
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        timeout: 60000,
        maxRetries: 2,
      });

      const prompt = `당신은 강의 분석 전문가입니다. 아래 학생들의 질문을 분석하여 강의 리포트를 작성해주세요.

강의 정보:
- 강의명: ${lecture.name}
- 클래스 제목: ${classData.title}
- 클래스 설명: ${classData.description || "설명 없음"}
- 수강 인원: ${lecture.student_id_list.length}명

학생 질문:
${mockQuestions.map((q, idx) => `${idx + 1}. [${q.student_name}] ${q.question}`).join('\n')}

다음 형식으로 리포트를 작성해주세요:
1. 질문 분석 요약 (각 질문의 주요 내용과 패턴 분석)
2. 학습 이해도 평가 (전반적인 학생들의 이해도 수준)
3. 개선 제안 (교수자에게 제안할 수 있는 강의 개선 방안)
4. 다음 주차 준비 사항 (학생들의 질문 패턴을 바탕으로 한 다음 주차 수업 준비 권장사항)

한국어로 전문적이고 상세하게 작성해주세요.`;

      let reportContent;
      let usage = null;
      try {
        const completion = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "당신은 교육 전문가로서 학생 질문을 분석하고 강의 리포트를 작성하는 전문가입니다.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("API 호출 타임아웃")), 55000)
          ),
        ]);

        usage = completion.usage;
        reportContent = completion.choices[0].message.content;
      } catch (gptError) {
        console.error("GPT API 호출 오류:", gptError.message || gptError);
        reportContent = `## 리포트 생성 중 오류 발생

GPT API 호출 중 문제가 발생하여 기본 리포트를 제공합니다.

### 질문 분석 요약
총 ${mockQuestions.length}개의 질문이 분석되었습니다. 학생들의 주요 관심사는 다음과 같습니다:
- ${classData.title}에 대한 이해도 확인 요청
- 수업 내용 재정리 요청
- 추가 학습 자료 요청
- 다음 주차 예습 관련 문의

### 학습 이해도 평가
현재 수강 인원: ${lecture.student_id_list.length}명
질문을 통해 확인된 학생들의 이해도 수준: 중상

### 개선 제안
1. 추가 자료 제공 권장
2. 실습 예제 보강
3. 다음 주차 내용 미리 안내

### 다음 주차 준비 사항
- 학생들의 질문 패턴을 고려한 추가 자료 준비
- 실습 예제 및 연습 문제 확대
- Q&A 세션 시간 확보

*주의: 이 리포트는 GPT API 호출 실패로 인해 기본 템플릿으로 생성되었습니다.`;
      }

      const response = {
        message: "분석 리포트가 성공적으로 생성되었습니다.",
        lecture_id: lecture.lecture_id,
        lecture_name: lecture.name,
        class_id: parseInt(classId),
        class_title: classData.title,
        generated_at: new Date().toISOString(),
        analysis_period: {
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString(),
        },
        student_count: lecture.student_id_list.length,
        questions_analyzed: mockQuestions.length,
        questions: mockQuestions,
        report: {
          summary: reportContent,
          sections: {
            question_analysis: "질문 분석 요약이 포함되어 있습니다.",
            understanding_level: "학습 이해도 평가가 포함되어 있습니다.",
            improvement_suggestions: "개선 제안이 포함되어 있습니다.",
            next_week_preparation: "다음 주차 준비 사항이 포함되어 있습니다.",
          },
        },
      };

      if (usage) {
        response.usage = {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          estimated_cost: ((usage.prompt_tokens * 0.00015) + (usage.completion_tokens * 0.0006)) / 1000,
        };
      }

      res.status(200).json(response);
    } catch (err) {
      console.error("리포트 생성 오류:", err);
      
      if (err instanceof OpenAI.APIError) {
        return res.status(500).json({
          message: "OpenAI API 오류가 발생했습니다.",
          error: err.message,
          details: err.status || "알 수 없는 오류",
        });
      }

      if (err.code === 'ECONNRESET' || err.message?.includes('hang up') || err.message?.includes('timeout')) {
        return res.status(504).json({
          message: "GPT API 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.",
          error: "Network timeout or connection reset",
        });
      }

      if (err.message?.includes('timeout') || err.message?.includes('타임아웃')) {
        return res.status(504).json({
          message: "GPT API 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
          error: "Request timeout",
        });
      }

      res.status(500).json({
        message: "서버 오류가 발생했습니다.",
        error: err.message || "알 수 없는 오류",
      });
    }
  }
);

module.exports = router;

