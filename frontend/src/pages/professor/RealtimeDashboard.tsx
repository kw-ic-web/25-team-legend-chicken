import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import LecturePersonnelModal from "../../components/modal/lecturePersonnel/LecturePersonnelModal";
import ParticipantStrip from "../../components/live/professor/ParticipantStrip";
import ScreenShareArea from "../../components/live/professor/ScreenShareArea";
import LiveControls from "../../components/live/professor/LiveControls";
import EndBroadcastConfirmModal from "../../components/modal/live/EndBroadcastConfirmModal";
import Toast from "../../components/common/Toast";

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
  const [isSharing, setIsSharing] = useState(false);
  const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const showError = (message: string) => setToast({ message, type: "error" });
  const [students] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `수강생 ${i + 1}`,
      email: `student${i + 1}@example.com`,
    }))
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const shareVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shareStreamRef = useRef<MediaStream | null>(null);
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
    } catch (error: unknown) {
      console.error("웹캠 접근 실패:", error);
      const err = error as { name?: string };
      if (err?.name === "NotAllowedError") {
        showError(
          "카메라/마이크 권한이 차단되어 있어요. 브라우저 권한을 허용해 주세요."
        );
      } else if (err?.name === "NotFoundError") {
        showError("카메라 또는 마이크를 찾을 수 없어요.");
      } else {
        showError("웹캠을 시작할 수 없어요. 장치와 권한을 확인해 주세요.");
      }
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

  // 화면 공유 중지/시작
  const stopScreenShare = useCallback(() => {
    if (shareStreamRef.current) {
      shareStreamRef.current.getTracks().forEach((t) => t.stop());
      shareStreamRef.current = null;
    }
    if (shareVideoRef.current) {
      shareVideoRef.current.srcObject = null;
    }
    setIsSharing(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const mediaDevices = navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (
          constraints?: MediaStreamConstraints
        ) => Promise<MediaStream>;
      };
      const getDisplay = mediaDevices.getDisplayMedia
        ? mediaDevices.getDisplayMedia.bind(mediaDevices)
        : // 일부 브라우저 호환용
          (
            navigator as unknown as {
              getDisplayMedia: () => Promise<MediaStream>;
            }
          ).getDisplayMedia;

      const displayStream = await getDisplay({
        video: { frameRate: 30 },
        audio: true,
      });
      shareStreamRef.current = displayStream;
      if (shareVideoRef.current) {
        shareVideoRef.current.srcObject =
          displayStream as unknown as MediaStream;
      }
      setIsSharing(true);

      // 사용자가 공유를 중지했을 때 이벤트 처리
      const [track] = displayStream.getVideoTracks();
      track.addEventListener("ended", () => {
        stopScreenShare();
      });
    } catch (e: unknown) {
      console.error("화면 공유 실패:", e);
      setIsSharing(false);
      const err = e as { name?: string };
      if (err?.name === "NotAllowedError") {
        showError("화면 공유가 취소되었어요. 다시 시도해 주세요.");
      } else {
        showError("화면 공유를 시작할 수 없어요.");
      }
    }
  }, [stopScreenShare]);

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

  const closePersonnel = () => setIsPersonnelOpen(false);

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
      stopScreenShare();
    };
  }, [startCamera, stopCamera, stopScreenShare]);

  // 탭 숨김/이탈 시 리소스 정리
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopScreenShare();
        stopCamera();
      }
    };
    const onBeforeUnload = () => {
      stopScreenShare();
      stopCamera();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [stopCamera, stopScreenShare]);

  return (
    <div className="min-h-screen bg-gray-50">
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

            {/* 상단 참여자(웹캠) 스트립 */}
            <ParticipantStrip isCameraOn={isCameraOn} videoRef={videoRef} />

            {/* 강의 콘텐츠(화면 공유 영역) */}
            <ScreenShareArea isSharing={isSharing} videoRef={shareVideoRef}>
              <LiveControls
                isMicOn={isMicOn}
                isCameraOn={isCameraOn}
                isSharing={isSharing}
                onToggleMic={toggleMic}
                onToggleCamera={toggleCamera}
                onToggleShare={() =>
                  isSharing ? stopScreenShare() : startScreenShare()
                }
                onOpenPersonnel={() => setIsPersonnelOpen(true)}
                onEnd={() => setIsEndConfirmOpen(true)}
              />
            </ScreenShareArea>
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
        {/* 강의 인원 모달 */}
        <LecturePersonnelModal
          isOpen={isPersonnelOpen}
          onClose={closePersonnel}
          students={students}
        />
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <EndBroadcastConfirmModal
          isOpen={isEndConfirmOpen}
          onClose={() => setIsEndConfirmOpen(false)}
          onConfirm={() => {
            setIsEndConfirmOpen(false);
            stopScreenShare();
            stopCamera();
            console.log("방송 종료됨");
          }}
        />
      </div>
    </div>
  );
};

export default RealtimeDashboard;
