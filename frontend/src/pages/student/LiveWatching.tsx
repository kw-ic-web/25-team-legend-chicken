import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import StudentParticipantStrip from "../../components/live/student/StudentParticipantStrip";
import StudentScreenArea from "../../components/live/student/StudentScreenArea";
import StudentLiveControls from "../../components/live/student/StudentLiveControls";
import { useLiveWebRTC } from "../../hooks/useLiveWebRTC";
import { useAuth } from "../../contexts/AuthContext";
import { getParticipateInfo } from "../../api/student";
import Toast from "../../components/common/Toast";

interface Question {
  id: number;
  studentName: string;
  question: string;
  timestamp: string;
}

const LiveWatching: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const studentVideoRef = useRef<HTMLVideoElement>(null);
  const studentStreamRef = useRef<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isStudentMicOn, setIsStudentMicOn] = useState(false);
  const [isStudentCameraOn, setIsStudentCameraOn] = useState(false);
  const [lectureInfo, setLectureInfo] = useState<{
    lectureId: string;
    classId: number;
    liveId: number | null;
    lectureName: string;
    classTitle: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // URL 파라미터에서 lectureId와 classId 읽기
  const lectureId = searchParams.get("lectureId");
  const classIdParam = searchParams.get("classId");
  const classId = classIdParam ? Number(classIdParam) : null;

  const [activeTab, setActiveTab] = useState<"chat" | "questions">("questions");
  const [questionText, setQuestionText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 학생의 로컬 스트림 (카메라/마이크)
  const [studentLocalStream, setStudentLocalStream] = useState<MediaStream | null>(null);

  // 라이브 참여 정보 가져오기
  useEffect(() => {
    const fetchParticipateInfo = async () => {
      if (!lectureId || !classId || !Number.isFinite(classId)) {
        setToast({
          message: "강의 정보가 올바르지 않습니다.",
          type: "error",
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const info = await getParticipateInfo(lectureId, classId);
        setLectureInfo({
          lectureId: info.lecture_id,
          classId: info.class_id,
          liveId: info.live_id,
          lectureName: info.lecture_name,
          classTitle: info.class_title,
        });

        if (!info.is_live_active) {
          setToast({
            message: "현재 진행 중인 라이브 방송이 없습니다.",
            type: "error",
          });
        }
      } catch (error) {
        console.error("라이브 참여 정보 조회 실패:", error);
        const message =
          error instanceof Error
            ? error.message
            : "라이브 정보를 불러오는 중 오류가 발생했습니다.";
        setToast({ message, type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchParticipateInfo();
  }, [lectureId, classId]);

  // WebRTC 연결 설정
  const {
    remoteParticipants,
    status: webrtcStatus,
    error: webrtcError,
  } = useLiveWebRTC({
    lectureId: lectureInfo?.lectureId,
    classId: lectureInfo?.classId ?? undefined,
    liveId: lectureInfo?.liveId ?? null,
    role: "student",
    userId: user?.id,
    localStreams: studentLocalStream ? [studentLocalStream] : [],
    enabled: !!lectureInfo && !!lectureInfo.liveId,
    autoInitiate: false, // 학생은 offer를 보내지 않음
  });

  // 원격 스트림을 videoRef에 연결
  useEffect(() => {
    console.log("[LiveWatching] remoteParticipants:", remoteParticipants);
    console.log("[LiveWatching] remoteParticipants.length:", remoteParticipants.length);
    
    if (remoteParticipants.length > 0 && videoRef.current) {
      // 교수자의 스트림 찾기 (화면 공유 또는 카메라)
      const professorStream = remoteParticipants.find(
        (p) => p.role === "professor"
      )?.stream;

      console.log("[LiveWatching] professorStream found:", !!professorStream);
      console.log("[LiveWatching] All participants:", remoteParticipants.map(p => ({ role: p.role, hasStream: !!p.stream, socketId: p.socketId })));

      // 교수자 스트림이 있으면 사용, 없으면 첫 번째 스트림 사용
      const streamToUse = professorStream || remoteParticipants[0]?.stream;
      
      if (streamToUse && videoRef.current) {
        console.log("[LiveWatching] Setting video srcObject", streamToUse);
        videoRef.current.srcObject = streamToUse;
        
        // 비디오 재생 시도 (사용자 상호작용 필요 시 처리)
        const playVideo = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              console.log("[LiveWatching] Video playing successfully");
            }
          } catch (playError) {
            console.warn("[LiveWatching] Auto-play prevented, user interaction required:", playError);
            // 사용자 상호작용이 필요한 경우, 비디오는 로드되지만 재생되지 않음
            // 사용자가 클릭하면 재생됨
            if (videoRef.current) {
              videoRef.current.muted = true; // 음소거하면 자동 재생 가능할 수 있음
              try {
                await videoRef.current.play();
                console.log("[LiveWatching] Video playing with muted");
              } catch (mutedError) {
                console.warn("[LiveWatching] Even muted play failed:", mutedError);
              }
            }
          }
        };
        
        videoRef.current.onloadedmetadata = () => {
          console.log("[LiveWatching] Video metadata loaded, attempting to play...");
          playVideo();
        };
        
        // 이미 로드되어 있으면 바로 재생 시도
        if (videoRef.current.readyState >= 2) {
          playVideo();
        }
        
        setIsLive(true);
      }
    } else if (videoRef.current && remoteParticipants.length === 0) {
      console.log("[LiveWatching] No remote participants, clearing video");
      videoRef.current.srcObject = null;
      setIsLive(false);
    }
  }, [remoteParticipants]);

  // WebRTC 오류 처리
  useEffect(() => {
    if (webrtcError) {
      setToast({ message: `WebRTC 오류: ${webrtcError}`, type: "error" });
    }
  }, [webrtcError]);

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
    setStudentLocalStream(stream);
  }, []);

  const stopStudentCamera = useCallback(() => {
    if (studentStreamRef.current) {
      studentStreamRef.current.getTracks().forEach((track) => track.stop());
      studentStreamRef.current = null;
    }
    if (studentVideoRef.current) {
      studentVideoRef.current.srcObject = null;
    }
    setStudentLocalStream(null);
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
                {isLoading
                  ? "로딩 중..."
                  : lectureInfo
                  ? `${lectureInfo.classTitle} - ${lectureInfo.lectureName}`
                  : "강의 정보 없음"}
              </h1>
              {lectureInfo && !lectureInfo.liveId && (
                <p className="text-sm text-gray-500 mt-2">
                  현재 진행 중인 라이브 방송이 없습니다.
                </p>
              )}
            </div>

            {/* 상단 참여자(웹캠) 스트립 */}
            <StudentParticipantStrip
              studentVideoRef={studentVideoRef}
              isStudentCameraOn={isStudentCameraOn}
            />

            {/* 강의 콘텐츠(화면 공유 영역) - 컨트롤 제거 */}
            <div className="relative flex-1">
              <StudentScreenArea
                isLive={isLive}
                videoRef={videoRef}
                statusText={
                  isLoading
                    ? "로딩 중..."
                    : !lectureInfo?.liveId
                    ? "방송 대기 중"
                    : webrtcStatus === "connecting"
                    ? "연결 중..."
                    : webrtcStatus === "connected"
                    ? "라이브 방송 중"
                    : "연결 오류"
                }
              />
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default LiveWatching;

