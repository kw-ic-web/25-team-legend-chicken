import React, { useRef, useState } from "react";
import { Send } from "lucide-react";
import StudentScreenArea from "../../components/live/student/StudentScreenArea";

interface Question {
  id: number;
  studentName: string;
  question: string;
  timestamp: string;
  status: "pending" | "answered" | "dismissed";
  answer?: string; // ✅ AI 답변
}

interface ChatMessage {
  id: number;
  author: string; // "나" | "익명"
  text: string;
  timestamp: string;
}

const RealTimeParticipation: React.FC = () => {
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const [isLive] = useState(false);

  // ✅ 기본 탭은 채팅
  const [activeTab, setActiveTab] = useState<"chat" | "questions">("chat");

  // ✅ 입력/리스트 상태 분리
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiTyping, setAiTyping] = useState(false); // 질문 등록 후 AI 타이핑 표시

  // 공통 타임스탬프
  const nowHM = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
  };

  // 간단한 더미 AI 답변 생성기
  const fakeAIAnswer = (q: string) => {
    // 질문의 핵심 단어를 뽑아 가벼운 설명을 붙여주는 느낌
    const trimmed = q.replace(/\s+/g, " ").trim();
    if (!trimmed) return "질문을 더 자세히 적어주면 도와드릴 수 있어요.";
    return [
      `좋은 질문이에요! "${trimmed}"에 대해 간단히 정리해볼게요.`,
      "1) 핵심 개념: 질문에서 중요한 키워드를 파악하고,",
      "2) 한 줄 정의: 한 문장으로 요약하고,",
      "3) 예시: 바로 적용해볼 수 있는 짧은 예시를 들어 이해를 돕습니다.",
      "필요하면 교수님께 팔로업 질문을 남겨주세요 🙂",
    ].join("\n");
  };

  // 🗨️ 채팅 전송 — 질문 카드와 동일한 디자인으로 렌더링
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, author: "나", text: chatMessage, timestamp: nowHM() },
    ]);
    setChatMessage("");
    // 탭은 유지 (채팅 탭에서 전송하면 채팅 탭 유지)
  };

  // ❓ 질문 등록 — AI 자동 응답 시뮬레이션
  const handleSubmitQuestion = () => {
    if (!chatMessage.trim()) return;

    const nextId = questions.length ? questions[questions.length - 1].id + 1 : 1;
    const q: Question = {
      id: nextId,
      studentName: "나",
      question: chatMessage,
      timestamp: nowHM(),
      status: "pending",
    };

    setQuestions((prev) => [...prev, q]);
    setChatMessage("");
    setActiveTab("questions");

    // AI 타이핑 표시 후 답변 채우기
    setAiTyping(true);
    const delay = 800 + Math.random() * 900; // 0.8~1.7초 랜덤 지연
    setTimeout(() => {
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === nextId
            ? { ...item, status: "answered", answer: fakeAIAnswer(item.question) }
            : item
        )
      );
      setAiTyping(false);
    }, delay);
  };

  // 공통 카드 컴포넌트 (질문/채팅 모두 동일 디자인 사용)
  const MessageCard = ({
    name,
    time,
    text,
    variant = "normal",
  }: {
    name: string;
    time: string;
    text: string;
    variant?: "normal" | "ai";
  }) => (
    <div className={`bg-white rounded-xl p-4 border border-gray-200 shadow-md ${variant === "ai" ? "border-blue-200" : ""}`}>
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-6 h-6 ${variant === "ai" ? "bg-purple-500" : "bg-blue-500"} rounded-full flex items-center justify-center`}>
          <span className="text-white text-xs font-medium">{variant === "ai" ? "AI" : "익"}</span>
        </div>
        <span className="text-sm font-medium text-gray-900">{name}</span>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
      {/* 줄바꿈 표시 */}
      <p className="text-sm text-gray-700 whitespace-pre-line">{text}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex h-[calc(100vh-80px)]">
        {/* 메인 */}
        <div className="flex-1 bg-white m-4 rounded-xl shadow-md">
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-green-600">Chapter 1-1. 파이썬 & 프로그래밍 소개</h1>
            </div>

            <StudentScreenArea isLive={isLive} videoRef={screenVideoRef} statusText="방송 대기 중" />
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="w-80 bg-white border-l border-gray-200">
          <div className="h-full flex flex-col">
            {/* 탭 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  activeTab === "chat" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
                type="button"
              >
                실시간 채팅
              </button>
              <button
                onClick={() => setActiveTab("questions")}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  activeTab === "questions" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
                type="button"
              >
                질문
              </button>
            </div>

            {/* 탭 콘텐츠: 두 탭 모두 동일 카드 디자인 사용 */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "chat" ? (
                <div className="p-4 space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">아직 채팅 메시지가 없습니다.</div>
                  ) : (
                    chatMessages.map((m) => (
                      <MessageCard key={m.id} name={m.author} time={m.timestamp} text={m.text} />
                    ))
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {questions.length === 0 && !aiTyping ? (
                    <div className="text-sm text-gray-500 text-center py-8">아직 등록된 질문이 없습니다.</div>
                  ) : (
                    <>
                      {questions.map((q) => (
                        <div key={q.id} className="space-y-2">
                          <MessageCard name={q.studentName} time={q.timestamp} text={q.question} />
                          {q.status === "answered" && q.answer && (
                            <MessageCard name="AI 도우미" time={q.timestamp} text={q.answer} variant="ai" />
                          )}
                          {q.status === "pending" && aiTyping && (
                            <div className="bg-white rounded-xl p-4 border border-dashed border-gray-200 text-xs text-gray-500 shadow-md">
                              AI가 답변을 작성 중입니다…
                            </div>
                          )}
                        </div>
                      ))}
                      {/* 질문은 아직 없지만 AI 타이핑만 표시해야 하는 드문 케이스 처리 */}
                      {questions.length === 0 && aiTyping && (
                        <div className="bg-white rounded-xl p-4 border border-dashed border-gray-200 text-xs text-gray-500 shadow-md">
                          AI가 답변을 작성 중입니다…
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 하단 입력 — 탭에 따라 동작/문구 변경 */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={activeTab === "questions" ? "질문을 입력하세요 (Enter)" : "실시간 채팅 입력 (Enter)"}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (activeTab === "questions") handleSubmitQuestion();
                      else handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => (activeTab === "questions" ? handleSubmitQuestion() : handleSendMessage())}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  aria-label="send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* 우측 패널 끝 */}
      </div>
    </div>
  );
};

export default RealTimeParticipation;
