import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Send } from "lucide-react";
import LecturePersonnelModal from "../../components/modal/lecturePersonnel/LecturePersonnelModal";
import ParticipantStrip from "../../components/live/professor/ParticipantStrip";
import ScreenShareArea from "../../components/live/professor/ScreenShareArea";
import LiveControls from "../../components/live/professor/LiveControls";
import EndBroadcastConfirmModal from "../../components/modal/live/EndBroadcastConfirmModal";
import Toast from "../../components/common/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useLiveWebRTC } from "../../hooks/useLiveWebRTC";
import { endLive } from "../../api/professor";

interface Question {
  id: number;
  studentName: string;
  question: string;
  timestamp: string;
  status: "pending" | "answered" | "dismissed";
}

type LiveNavigationState = {
  lectureId?: string;
  classId?: number;
  classTitle?: string;
  liveId?: number;
  cameraRequired?: boolean;
  materials?: Array<{ name: string; size: number }>;
};

const RealtimeDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{
    lectureId?: string;
    classId?: string;
    liveId?: string;
  }>();
  const liveState = (location.state as LiveNavigationState) || null;
  const { user } = useAuth();
  const { showToast: showGlobalToast } = useToast();
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
  const [isEndingLive, setIsEndingLive] = useState(false);
  const showError = useCallback((message: string) => {
    setToast({ message, type: "error" });
  }, []);
  const [students] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `수강생 ${i + 1}`,
      email: `student${i + 1}@example.com`,
    }))
  );

  const parseNumeric = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const resolvedLectureId = liveState?.lectureId || params.lectureId;
  const resolvedClassId = parseNumeric(liveState?.classId ?? params.classId);
  const resolvedLiveId = parseNumeric(liveState?.liveId ?? params.liveId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const shareVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shareStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isStartingShareRef = useRef(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const localStreams = useMemo(
    () => [cameraStream, screenStream],
    [cameraStream, screenStream]
  );

  const {
    remoteParticipants,
    status: webrtcStatus,
    error: webrtcError,
  } = useLiveWebRTC({
    lectureId: resolvedLectureId,
    classId: resolvedClassId,
    liveId: resolvedLiveId ?? null,
    role: "professor",
    userId: user?.id,
    localStreams,
  });

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
  ]);

  // 웹캠 시작
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setCameraStream(stream);

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
  }, [showError]);

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
    setCameraStream(null);
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
    setScreenStream(null);
  }, []);

  const startScreenShare = useCallback(async () => {
    // 화면공유 시작 플래그 설정 (visibilitychange 무시)
    isStartingShareRef.current = true;
    setTimeout(() => {
      isStartingShareRef.current = false;
    }, 3000); // 3초 후 플래그 해제

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
      setScreenStream(displayStream);
      if (shareVideoRef.current) {
        shareVideoRef.current.srcObject =
          displayStream as unknown as MediaStream;
        // 비디오 재생 보장
        shareVideoRef.current.onloadedmetadata = () => {
          if (shareVideoRef.current) {
            shareVideoRef.current.play().catch(console.error);
          }
        };
        // 이미 로드되어 있으면 바로 재생
        if (shareVideoRef.current.readyState >= 2) {
          shareVideoRef.current.play().catch(console.error);
        }
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
  }, [showError, stopScreenShare]);

  const toggleMic = useCallback(() => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled;
        audioTracks.forEach((track) => {
          track.enabled = newState;
        });
        setIsMicOn(newState);
      } else {
        // audio track이 없으면 마이크만 다시 시작
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((audioStream) => {
            if (streamRef.current) {
              audioStream.getAudioTracks().forEach((newTrack) => {
                streamRef.current!.addTrack(newTrack);
              });
              setIsMicOn(true);
            } else {
              streamRef.current = audioStream;
              setIsMicOn(true);
            }
          })
          .catch((error) => {
            console.error("마이크 접근 실패:", error);
            const err = error as { name?: string };
            if (err?.name === "NotAllowedError") {
              showError("마이크 권한이 차단되어 있어요.");
            } else {
              showError("마이크를 시작할 수 없어요.");
            }
          });
      }
    } else {
      // 스트림이 없으면 마이크만 시작
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((audioStream) => {
          streamRef.current = audioStream;
          setIsMicOn(true);
          if (audioStream.getAudioTracks().length > 0) {
            startAudioLevelMonitoring(audioStream);
          }
        })
        .catch((error) => {
          console.error("마이크 접근 실패:", error);
          const err = error as { name?: string };
          if (err?.name === "NotAllowedError") {
            showError("마이크 권한이 차단되어 있어요.");
          } else {
            showError("마이크를 시작할 수 없어요.");
          }
        });
    }
  }, [showError]);

  const toggleCamera = useCallback(() => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        // 기존 스트림이 있으면 video track만 토글
        const newState = !videoTracks[0].enabled;
        videoTracks.forEach((track) => {
          track.enabled = newState;
        });
        setIsCameraOn(newState);
        // 비디오 요소에도 반영
        if (videoRef.current) {
          if (newState) {
            // 카메라를 켤 때: 비디오 요소 강제 재로드
            videoRef.current.srcObject = null;
            // 다음 프레임에서 다시 설정
            requestAnimationFrame(() => {
              if (videoRef.current && streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.onloadedmetadata = () => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(console.error);
                  }
                };
                // 이미 로드되어 있으면 바로 재생
                if (videoRef.current.readyState >= 2) {
                  videoRef.current.play().catch(console.error);
                }
              }
            });
          } else {
            // 카메라를 끌 때: 비디오 요소 비우기
            videoRef.current.srcObject = null;
          }
        }
      } else {
        // video track이 없으면 카메라만 다시 시작
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((videoStream) => {
            if (streamRef.current) {
              videoStream.getVideoTracks().forEach((newTrack) => {
                streamRef.current!.addTrack(newTrack);
              });
              if (videoRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.play().catch(console.error);
              }
              setIsCameraOn(true);
            } else {
              streamRef.current = videoStream;
              if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
                videoRef.current.play().catch(console.error);
              }
              setIsCameraOn(true);
            }
          })
          .catch((error) => {
            console.error("카메라 접근 실패:", error);
            const err = error as { name?: string };
            if (err?.name === "NotAllowedError") {
              showError("카메라 권한이 차단되어 있어요.");
            } else {
              showError("카메라를 시작할 수 없어요.");
            }
          });
      }
    } else {
      // 스트림이 없으면 카메라만 시작
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((videoStream) => {
          streamRef.current = videoStream;
          if (videoRef.current) {
            videoRef.current.srcObject = videoStream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) {
                videoRef.current.play().catch(console.error);
              }
            };
          }
          setIsCameraOn(true);
        })
        .catch((error) => {
          console.error("카메라 접근 실패:", error);
          const err = error as { name?: string };
          if (err?.name === "NotAllowedError") {
            showError("카메라 권한이 차단되어 있어요.");
          } else {
            showError("카메라를 시작할 수 없어요.");
          }
        });
    }
  }, [showError]);

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

  useEffect(() => {
    if (webrtcError) {
      showError(`WebRTC 오류: ${webrtcError}`);
    }
  }, [webrtcError, showError]);

  // 탭 숨김/이탈 시 리소스 정리
  useEffect(() => {
    const onVisibility = () => {
      // 화면공유 시작 중이면 무시 (getDisplayMedia 호출 시 일시적으로 hidden이 될 수 있음)
      if (isStartingShareRef.current) return;

      if (document.hidden) {
        // 화면공유 중이 아니면 정리
        if (!isSharing) {
          stopScreenShare();
          stopCamera();
        }
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
  }, [stopCamera, stopScreenShare, isSharing]);

  const handleConfirmEndLive = useCallback(async () => {
    if (!resolvedLectureId || resolvedClassId === undefined) {
      showError("라이브 정보를 찾을 수 없습니다.");
      return;
    }
    if (isEndingLive) return;
    setIsEndingLive(true);
    try {
      const response = await endLive(resolvedLectureId, resolvedClassId);
      const successMessage = response.message || "라이브가 종료되었습니다.";
      setToast({
        message: successMessage,
        type: "success",
      });
      showGlobalToast(successMessage, "success");
      stopScreenShare();
      stopCamera();
      setIsEndConfirmOpen(false);
      navigate(`/professor/courses/${resolvedLectureId}`, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "라이브 종료 중 오류가 발생했습니다.";
      showError(message);
    } finally {
      setIsEndingLive(false);
    }
  }, [
    endLive,
    isEndingLive,
    navigate,
    resolvedClassId,
    resolvedLectureId,
    showError,
    showGlobalToast,
    stopCamera,
    stopScreenShare,
  ]);

  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex flex-1 overflow-hidden">
        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 bg-white m-2 rounded-lg shadow-sm overflow-hidden">
          <div className="h-full flex flex-col overflow-hidden">
            {/* 강의 제목 */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-white via-white to-green-50">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-green-600 truncate">
                  {liveState?.classTitle || "실시간 강의"}
                </h1>
                <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                  {(liveState?.lectureId || params.lectureId) && (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-gray-700">강좌</span>
                      {liveState?.lectureId || params.lectureId}
                    </span>
                  )}
                  {(liveState?.classId || params.classId) && (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-gray-700">
                        클래스
                      </span>
                      {liveState?.classId || params.classId}
                    </span>
                  )}
                  {(liveState?.liveId || params.liveId) && (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-gray-700">
                        라이브
                      </span>
                      {liveState?.liveId || params.liveId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 강의 콘텐츠(화면 공유 영역) */}
            <ScreenShareArea
              isSharing={isSharing}
              videoRef={shareVideoRef}
              connectionStatus={webrtcStatus}
              remoteParticipants={remoteParticipants}
            >
              <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none z-30">
                <ParticipantStrip isCameraOn={isCameraOn} videoRef={videoRef} />
              </div>
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
                  placeholder="채팅 입력 (Enter)"
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

      <LecturePersonnelModal
        isOpen={isPersonnelOpen}
        onClose={closePersonnel}
        students={students}
        lectureId={liveState?.lectureId || params.lectureId || ""}
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
        isProcessing={isEndingLive}
        onClose={() => {
          if (isEndingLive) return;
          setIsEndConfirmOpen(false);
        }}
        onConfirm={handleConfirmEndLive}
      />
    </div>
  );
};

export default RealtimeDashboard;
