import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, Send } from "lucide-react";

interface Question {
  id: number;
  studentName: string;
  question: string;
  timestamp: string;
  status: "pending" | "answered" | "dismissed";
}

const RealtimeDashboard: React.FC = () => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "questions">("questions");
  const [chatMessage, setChatMessage] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
      status: "pending",
    },
    {
      id: 2,
      studentName: "익명의 오소리",
      question:
        "그리고 왜 좋은 프로그램을 그렇게 설명하시는 거죠? 저는 파이썬을 쓰고 싶지 않은데 다른 걸로 해도 되나요?",
      timestamp: "08:15",
      status: "pending",
    },
    {
      id: 3,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
      status: "pending",
    },
    {
      id: 4,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
      status: "pending",
    },
    {
      id: 5,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
      status: "pending",
    },
  ]);

  // 웹캠 시작
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error);
          }
        };
      }

      setIsCameraOn(true);
      setIsMicOn(stream.getAudioTracks().length > 0);

      // 오디오 레벨 모니터링 시작
      if (stream.getAudioTracks().length > 0) {
        startAudioLevelMonitoring(stream);
      }
    } catch (error) {
      console.error("웹캠 접근 실패:", error);
    }
  }, []);

  // 웹캠 중지
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    setIsMicOn(false);
    stopAudioLevelMonitoring();
  }, []);

  // 오디오 레벨 모니터링
  const startAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    } catch (error) {
      console.error("오디오 레벨 모니터링 시작 실패:", error);
    }
  };

  const stopAudioLevelMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      console.log("메시지 전송:", chatMessage);
      setChatMessage("");
    }
  };

  const handleAnswerQuestion = (questionId: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, status: "answered" as const } : q
      )
    );
  };

  const handleDismissQuestion = (questionId: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, status: "dismissed" as const } : q
      )
    );
  };

  // 컴포넌트 마운트 시 웹캠 자동 시작
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="text-sm text-gray-600">학생 화면</span>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 bg-white m-4 rounded-lg shadow-sm">
          <div className="h-full flex flex-col">
            {/* 강의 제목 */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-green-600">
                Chapter 1-1. 파이썬 & 프로그래밍 소개
              </h1>
            </div>

            {/* 강의 콘텐츠 */}
            <div className="flex-1 p-6">
              <div className="space-y-8">
                {/* 프로그래밍 기초 섹션 */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      프로그래밍 기초
                    </h2>
                  </div>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-gray-700">프로그래밍이란?</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-gray-700">코딩 공부 하는 법</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-gray-700">좋은 프로그램이란?</span>
                    </li>
                  </ul>
                </div>

                {/* 파이썬 배우는 이유 섹션 */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      파이썬 배우는 이유
                    </h2>
                  </div>
                  <ul className="space-y-2 ml-7">
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-gray-700">파이썬 장점</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-gray-700">파이썬 활용 분야</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                      <span className="text-gray-700">파이썬 언어 특징</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 교수자 웹캠 영역 */}
              <div className="absolute bottom-4 right-4 w-48 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-500 text-sm mb-2">교수자 얼굴</div>
                  {isCameraOn ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover rounded-lg"
                      style={{ transform: "scaleX(-1)" }}
                    />
                  ) : (
                    <div className="w-full h-20 bg-gray-300 rounded flex items-center justify-center">
                      <VideoOff className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* 하단 컨트롤 */}
              <div className="absolute bottom-4 left-4 flex items-center space-x-4">
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full transition-colors ${
                    isMicOn
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isMicOn ? (
                    <Mic className="w-5 h-5" />
                  ) : (
                    <MicOff className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-full transition-colors ${
                    isCameraOn
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isCameraOn ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <VideoOff className="w-5 h-5" />
                  )}
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  방송 종료
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 우측 채팅/질문 패널 */}
        <div className="w-80 bg-white border-l border-gray-200">
          <div className="h-full flex flex-col">
            {/* 탭 헤더 */}
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

            {/* 탭 콘텐츠 */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "questions" ? (
                <div className="p-4 space-y-4">
                  {questions
                    .filter((q) => q.status === "pending")
                    .map((question) => (
                      <div
                        key={question.id}
                        className="bg-gray-50 rounded-lg p-4"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              익
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {question.studentName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {question.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">
                          {question.question}
                        </p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAnswerQuestion(question.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            답변하기
                          </button>
                          <button
                            onClick={() => handleDismissQuestion(question.id)}
                            className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                          >
                            답변 생략
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-center text-gray-500 text-sm">
                    실시간 채팅 기능
                  </div>
                </div>
              )}
            </div>

            {/* 하단 입력 영역 */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="김철수로 채팅하기"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
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

export default RealtimeDashboard;
