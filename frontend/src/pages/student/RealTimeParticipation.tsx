import React, { useRef, useState } from "react";
import { Send } from "lucide-react";
import StudentScreenArea from "../../components/live/student/StudentScreenArea";
import StudentParticipantStrip from "../../components/live/student/StudentParticipantStrip";

interface Question {
  id: number;
  studentName: string;
  question: string;
  timestamp: string;
  status: "pending" | "answered" | "dismissed";
}

const RealTimeParticipation: React.FC = () => {
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const teacherHeadRef = useRef<HTMLVideoElement>(null);
  const [isLive] = useState(false);

  const [activeTab, setActiveTab] = useState<"chat" | "questions">("questions");
  const [chatMessage, setChatMessage] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    console.log("채팅 전송:", chatMessage);
    setChatMessage("");
  };

  const handleSubmitQuestion = () => {
    if (!chatMessage.trim()) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");

    setQuestions((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        studentName: "나",
        question: chatMessage,
        timestamp: `${hh}:${mm}`,
        status: "pending",
      },
    ]);
    setActiveTab("questions");
    setChatMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-[calc(100vh-80px)]">
        {/* 메인 */}
        <div className="flex-1 bg-white m-4 rounded-lg shadow-sm">
          <div className="h-full flex flex-col">
            {/* 제목 */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-green-600">
                Chapter 1-1. 파이썬 & 프로그래밍 소개
              </h1>
            </div>

          
            <StudentScreenArea
              isLive={isLive}
              videoRef={screenVideoRef}
              statusText="방송 대기 중"
            />
          </div>
        </div>

        {/* 우측 질문/채팅 */}
        <div className="w-80 bg-white border-l border-gray-200">
          <div className="h-full flex flex-col">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  activeTab === "chat"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                실시간 채팅
              </button>
              <button
                onClick={() => setActiveTab("questions")}
                className={`flex-1 py-3 px-4 text-sm font-medium ${
                  activeTab === "questions"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                질문
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === "questions" ? (
                <div className="p-4 space-y-4">
                  {questions.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-8">
                      아직 등록된 질문이 없습니다.
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">익</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {q.studentName}
                          </span>
                          <span className="text-xs text-gray-500">{q.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700">{q.question}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-center text-gray-500 text-sm">
                    실시간 채팅 기능
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="김철수로 채팅하기 (Enter)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (activeTab === "questions") handleSubmitQuestion();
                      else handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={() =>
                    activeTab === "questions"
                      ? handleSubmitQuestion()
                      : handleSendMessage()
                  }
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeParticipation;
