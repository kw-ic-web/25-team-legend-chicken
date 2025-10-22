import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Video, VideoOff } from "lucide-react";
import Modal from "../common/Modal";

interface BroadcastSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onStart: () => void;
  cameraRequired: boolean;
  files: File[];
}

const BroadcastSettingsModal: React.FC<BroadcastSettingsModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onStart,
  cameraRequired,
  files,
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 오디오 레벨 상태 추가
  const [broadcastInfo, setBroadcastInfo] = useState({
    title: "웹서비스 설계 및 실습",
    visibility: "수강생 전용 (비공개)",
    time: "예약되지 않음",
    aiRecording: "활성화됨",
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 웹캠 시작/중지 함수
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true, // 마이크도 함께 활성화
      });
      streamRef.current = stream;

      // 상태를 먼저 업데이트하여 비디오 요소가 렌더링되도록 함
      setIsCameraOn(true);
      setIsMicOn(stream.getAudioTracks().length > 0);

      console.log(
        "웹캠 시작됨:",
        stream.getVideoTracks().length,
        "개 비디오 트랙"
      );
      console.log(
        "마이크 시작됨:",
        stream.getAudioTracks().length,
        "개 오디오 트랙"
      );
      console.log("스트림:", stream);

      // useEffect에서 스트림 할당을 처리하므로 여기서는 로그만 출력
      console.log("스트림 준비 완료, useEffect에서 비디오 요소에 할당될 예정");
    } catch (error) {
      console.error("웹캠 접근 실패:", error);
      alert("웹캠에 접근할 수 없습니다. 권한을 확인해주세요.");
    }
  };

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
    setAudioLevel(0); // 오디오 레벨 리셋
    stopAudioLevelMonitoring(); // 오디오 레벨 모니터링 중지
  }, []);

  // 오디오 레벨 모니터링 시작
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
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalizedLevel = Math.min(average / 128, 1); // 0-1 범위로 정규화
          setAudioLevel(normalizedLevel);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };

      updateAudioLevel();
    } catch (error) {
      console.error("오디오 레벨 모니터링 시작 실패:", error);
    }
  };

  // 오디오 레벨 모니터링 중지
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

  const toggleCamera = () => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // 컴포넌트 언마운트 시 웹캠 정리
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // isCameraOn이 true가 되면 비디오 요소에 스트림 할당
  useEffect(() => {
    if (isCameraOn && streamRef.current && videoRef.current) {
      console.log("useEffect: 비디오 요소에 스트림 할당");
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        console.log("useEffect: 비디오 메타데이터 로드됨, 재생 시작");
        if (videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      };

      // 오디오 레벨 모니터링 시작
      if (streamRef.current.getAudioTracks().length > 0) {
        startAudioLevelMonitoring(streamRef.current);
      }
    }
  }, [isCameraOn]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileDisplayText = () => {
    if (files.length === 0) return "없음";
    if (files.length === 1) {
      return `${files[0].name} [${formatFileSize(files[0].size)}]`;
    }
    return `${files[0].name} [${formatFileSize(files[0].size)}] 외 ${files.length - 1}개`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="방송 설정">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 비디오 미리보기 영역 */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
              {isCameraOn ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }} // 좌우 반전 (거울 효과)
                    onLoadStart={() => console.log("비디오 로드 시작")}
                    onLoadedData={() => console.log("비디오 데이터 로드됨")}
                    onCanPlay={() => console.log("비디오 재생 가능")}
                    onPlay={() => console.log("비디오 재생 시작")}
                    onError={(e) => console.error("비디오 오류:", e)}
                  />
                  <div className="absolute top-2 right-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                    웹캠 활성화됨
                  </div>
                </>
              ) : (
                <div className="text-white text-lg font-medium">
                  카메라 없이 강의하기
                </div>
              )}

              {/* 마이크 상태 표시 */}
              {isCameraOn && (
                <div className="absolute top-2 left-2 flex items-center space-x-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                  <div
                    className={`w-2 h-2 rounded-full ${isMicOn ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <span className="text-white text-xs">
                    {isMicOn ? "마이크 ON" : "마이크 OFF"}
                  </span>
                </div>
              )}

              <button
                onClick={toggleCamera}
                className="absolute bottom-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all duration-200"
              >
                {isCameraOn ? (
                  <VideoOff className="w-5 h-5 text-white" />
                ) : (
                  <Video className="w-5 h-5 text-white" />
                )}
              </button>

              {/* 오디오 레벨 표시 바 */}
              {isCameraOn && isMicOn && (
                <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-xs">소리 크기</span>
                    <div className="flex-1 bg-gray-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-100 ease-out"
                        style={{ width: `${audioLevel * 100}%` }}
                      />
                    </div>
                    <span className="text-white text-xs">
                      {Math.round(audioLevel * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>실시간 강의가 시작되면 모든 설정이 잠금됩니다.</p>
              <p>강의 자료와 환경을 다시 한 번 확인해주세요.</p>
            </div>
          </div>

          {/* 오른쪽: 방송 정보 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">방송 정보</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                <Edit className="w-4 h-4" />
                <span>{isEditing ? "완료" : "수정"}</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* 강의명 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">강의명</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={broadcastInfo.title}
                    onChange={(e) =>
                      setBroadcastInfo((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">
                    {broadcastInfo.title}
                  </div>
                )}
              </div>

              {/* 공개 범위 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">공개 범위</div>
                {isEditing ? (
                  <select
                    value={broadcastInfo.visibility}
                    onChange={(e) =>
                      setBroadcastInfo((prev) => ({
                        ...prev,
                        visibility: e.target.value,
                      }))
                    }
                    className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="수강생 전용 (비공개)">
                      수강생 전용 (비공개)
                    </option>
                    <option value="공개">공개</option>
                    <option value="링크가 있는 사용자">
                      링크가 있는 사용자
                    </option>
                  </select>
                ) : (
                  <div className="text-sm font-medium text-gray-900">
                    {broadcastInfo.visibility}
                  </div>
                )}
              </div>

              {/* 강의 시간 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">강의 시간</div>
                {isEditing ? (
                  <input
                    type="datetime-local"
                    value={
                      broadcastInfo.time === "예약되지 않음"
                        ? ""
                        : broadcastInfo.time
                    }
                    onChange={(e) =>
                      setBroadcastInfo((prev) => ({
                        ...prev,
                        time: e.target.value || "예약되지 않음",
                      }))
                    }
                    className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">
                    {broadcastInfo.time}
                  </div>
                )}
              </div>

              {/* AI 자동 기록 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">AI 자동 기록</div>
                <div className="text-sm font-medium text-gray-900">
                  활성화됨
                </div>
              </div>

              {/* 학생 카메라 설정 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">
                  학생 카메라 설정
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {cameraRequired ? "카메라 참여 필수" : "선택적 사용"}
                </div>
              </div>

              {/* 교안 */}
              <div className="border-b border-dashed border-gray-200 pb-3">
                <div className="text-sm text-gray-500 mb-1">교안</div>
                <div className="text-sm font-medium text-gray-900">
                  {getFileDisplayText()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
          >
            뒤로 가기
          </button>
          <button
            onClick={() => {
              onStart();
              navigate("/professor/realtime-dashboard");
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 flex items-center space-x-2"
          >
            <span>시작하기</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BroadcastSettingsModal;
