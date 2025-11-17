import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import StudentParticipantStrip from "../../components/live/student/StudentParticipantStrip";
import StudentScreenArea from "../../components/live/student/StudentScreenArea";
import StudentLiveControls from "../../components/live/student/StudentLiveControls";

interface Question {
  id: number;
  studentName: string;
  question: string;
  timestamp: string;
}

const LiveWatching: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const studentVideoRef = useRef<HTMLVideoElement>(null);
  const studentStreamRef = useRef<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isStudentMicOn, setIsStudentMicOn] = useState(false);
  const [isStudentCameraOn, setIsStudentCameraOn] = useState(false);

  const [activeTab, setActiveTab] = useState<"chat" | "questions">("questions");
  const [questionText, setQuestionText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
    },
    {
      id: 2,
      studentName: "익명의 오소리",
      question:
        "그리고 왜 좋은 프로그램을 그렇게 설명하시는 거죠? 저는 파이썬을 쓰고 싶지 않은데 다른 걸로 해도 되나요?",
      timestamp: "08:15",
    },
    {
      id: 3,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
    },
    {
      id: 4,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
    },
    {
      id: 5,
      studentName: "익명의 오소리",
      question: "이 부분이 이해가 잘 안가서 그러는데 파이썬이 뭐죠?",
      timestamp: "08:15",
    },
  ]);

  // 외부에서 videoRef.current.srcObject 또는 src를 주입하면 isLive가 true로 바뀜
  useEffect(() => {
    const checkLive = () => {
      const video = videoRef.current;
      if (!video) return;
      const hasSrc = Boolean((video as any).srcObject) || Boolean(video.src);
      setIsLive(hasSrc && video.readyState >= 2);
    };
    const interval = setInterval(checkLive, 500);
    return () => clearInterval(interval);
  }, []);

  const nowTime = useMemo(() => {
    const d = new Date();
    const mm = String(d.getMinutes()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [questions.length]);

  const handleSubmitQuestion = () => {
    if (!questionText.trim()) return;
    setQuestions((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        studentName: "나",
        question: questionText.trim(),
        timestamp: nowTime,
      },
    ]);
    setQuestionText("");
  };

  const attachStudentStream = useCallback((stream: MediaStream) => {
    if (studentVideoRef.current) {
      studentVideoRef.current.srcObject = stream;
      studentVideoRef.current.onloadedmetadata = () => {
        studentVideoRef.current?.play().catch(console.error);
      };
    }
  }, []);

  const stopStudentCamera = useCallback(() => {
    if (studentStreamRef.current) {
      studentStreamRef.current.getTracks().forEach((track) => track.stop());
      studentStreamRef.current = null;
    }
    if (studentVideoRef.current) {
      studentVideoRef.current.srcObject = null;
    }
    setIsStudentCameraOn(false);
    setIsStudentMicOn(false);
  }, []);

  const toggleStudentCamera = useCallback(async () => {
    if (isStudentCameraOn) {
      stopStudentCamera();
      return;
    }

    try {
      if (studentStreamRef.current) {
        studentStreamRef.current.getTracks().forEach((track) => track.stop());
        studentStreamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      studentStreamRef.current = stream;
      attachStudentStream(stream);
      setIsStudentCameraOn(true);
      setIsStudentMicOn(stream.getAudioTracks().some((track) => track.enabled));
    } catch (error) {
      console.error("학생 카메라 시작 실패:", error);
      alert("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
    }
  }, [attachStudentStream, isStudentCameraOn, stopStudentCamera]);

  const toggleStudentMic = useCallback(async () => {
    const stream = studentStreamRef.current;

    if (!stream) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        studentStreamRef.current = audioStream;
        setIsStudentMicOn(true);
      } catch (error) {
        console.error("마이크 시작 실패:", error);
        alert("마이크를 시작할 수 없습니다. 권한을 확인해주세요.");
      }
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        audioStream.getAudioTracks().forEach((track) => {
          stream.addTrack(track);
        });
        setIsStudentMicOn(true);
      } catch (error) {
        console.error("마이크 추가 실패:", error);
        alert("마이크를 시작할 수 없습니다. 권한을 확인해주세요.");
      }
      return;
    }

    const newState = !isStudentMicOn;
    audioTracks.forEach((track) => {
      track.enabled = newState;
    });
    setIsStudentMicOn(newState);
  }, [isStudentMicOn]);

  useEffect(() => {
    return () => {
      stopStudentCamera();
    };
  }, [stopStudentCamera]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-[calc(100vh-80px)]">
        {/* 메인 콘텐츠 영역 - 교수 레이아웃과 동일 */}
        <div className="flex-1 bg-white m-4 rounded-lg shadow-sm">
          <div className="h-full flex flex-col">
            {/* 강의 제목 - 교수 화면 스타일 매칭 */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-green-600">
                Chapter 1-1. 파이썬 & 프로그래밍 소개
              </h1>
            </div>

            {/* 상단 참여자(웹캠) 스트립 */}
            <StudentParticipantStrip
              studentVideoRef={studentVideoRef}
              isStudentCameraOn={isStudentCameraOn}
            />

            {/* 강의 콘텐츠(화면 공유 영역) - 컨트롤 제거 */}
            <div className="relative flex-1">
              <StudentScreenArea isLive={isLive} videoRef={videoRef} />
              <StudentLiveControls
                isMicOn={isStudentMicOn}
                isCameraOn={isStudentCameraOn}
                onToggleMic={toggleStudentMic}
                onToggleCamera={toggleStudentCamera}
              />
            </div>
          </div>
        </div>

        {/* 우측 채팅/질문 패널 - 교수 마크업을 복제(버튼 제거) */}
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
                  {questions.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm">등록한 질문이 없습니다.</div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">익</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{q.studentName}</span>
                          <span className="text-xs text-gray-500">{q.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700">{q.question}</p>
                        {/* 학생은 컨트롤 없음 */}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-center text-gray-500 text-sm">실시간 채팅 기능</div>
                </div>
              )}
            </div>

            {/* 하단 입력 영역 (간단 입력/전송) */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="질문을 입력하세요"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitQuestion()}
                />
                <button
                  onClick={handleSubmitQuestion}
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

export default LiveWatching;

