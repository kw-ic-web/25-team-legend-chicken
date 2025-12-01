import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { getBaseUrl, ensureHttps } from "../../api/auth/client";
import LecturePersonnelModal from "../../components/modal/lecturePersonnel/LecturePersonnelModal";
import ParticipantStrip from "../../components/live/professor/ParticipantStrip";
import ScreenShareArea from "../../components/live/professor/ScreenShareArea";
import LiveControls from "../../components/live/professor/LiveControls";
import EndBroadcastConfirmModal from "../../components/modal/live/EndBroadcastConfirmModal";
import Toast from "../../components/common/Toast";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useLiveWebRTC } from "../../hooks/useLiveWebRTC";
import {
  endLive,
  getClassPdfs,
  getClassDetail,
  getWhiteboardPages,
  getMembers,
  type WhiteboardPage,
} from "../../api/professor";
import AnnotatablePdfViewer from "../../components/live/professor/AnnotatablePdfViewer";
import { analyzeHandwriting } from "../../api/handwriting";
import { getChatMessages, type ChatMessage } from "../../api/chat";
import LessonQuestionModal from "../../components/modal/lessonQuestion/LessonQuestionModal";

type PdfItem = {
  name: string;
  url: string;
};

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
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const chatSocketRef = useRef<Socket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isPersonnelOpen, setIsPersonnelOpen] = useState(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isEndingLive, setIsEndingLive] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfItems, setPdfItems] = useState<PdfItem[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfMeta, setPdfMeta] = useState<{
    lectureName?: string;
    classTitle?: string;
  } | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<PdfItem | null>(null);
  const [whiteboardPages, setWhiteboardPages] = useState<WhiteboardPage[]>([]);
  const [isLessonQuestionModalOpen, setIsLessonQuestionModalOpen] =
    useState(false);
  const [selectedLesson, setSelectedLesson] = useState<{
    title: string;
    fileName: string;
    fileSize: string;
    url?: string;
    lectureId?: string;
    classId?: number;
    pages?: WhiteboardPage[];
  } | null>(null);
  const [_isLessonDetailLoading, setIsLessonDetailLoading] = useState(false);
  const showError = useCallback((message: string) => {
    setToast({ message, type: "error" });
  }, []);
  const [students, setStudents] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [studentNameMap, setStudentNameMap] = useState<Map<string, string>>(
    new Map()
  );
  const [isParticipantStripVisible, setIsParticipantStripVisible] =
    useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const lastMessageTimeRef = useRef<number>(0);

  const parseNumeric = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const resolveAssetUrl = useCallback((url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return ensureHttps(url);
    }
    return ensureHttps(`${getBaseUrl()}${url}`);
  }, []);

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
      // 모든 트랙 정지
      shareStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        // 이벤트 리스너 제거
        track.onended = null;
      });
      shareStreamRef.current = null;
    }
    if (shareVideoRef.current) {
      shareVideoRef.current.srcObject = null;
    }
    setIsSharing(false);
    setScreenStream(null);
  }, []);

  const fetchPdfList = useCallback(async () => {
    if (!resolvedLectureId || resolvedClassId === undefined) {
      setPdfError("클래스 정보를 찾을 수 없습니다.");
      setPdfItems([]);
      return;
    }
    setIsPdfLoading(true);
    setPdfError(null);
    try {
      const response = await getClassPdfs(resolvedLectureId, resolvedClassId);
      const normalized = (response.pdfs || []).map((pdfItem, index) => {
        const rawUrl =
          typeof pdfItem === "string"
            ? pdfItem
            : typeof pdfItem === "object" && pdfItem !== null
              ? pdfItem.url
              : "";
        const displayName =
          typeof pdfItem === "string"
            ? pdfItem.split("/").pop() || `자료 ${index + 1}`
            : pdfItem?.originalName || `자료 ${index + 1}`;
        return {
          name: displayName,
          url: resolveAssetUrl(rawUrl),
        };
      });
      setPdfItems(normalized);
      setPdfMeta({
        lectureName: response.lecture_name,
        classTitle: response.class_title,
      });
      if (normalized.length === 0) {
        setPdfError("등록된 PDF 자료가 없습니다.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "PDF 목록을 불러오는 중 오류가 발생했습니다.";
      setPdfError(message);
      showError(message);
    } finally {
      setIsPdfLoading(false);
    }
  }, [resolveAssetUrl, resolvedClassId, resolvedLectureId, showError]);

  const handleOpenPdfModal = useCallback(() => {
    if (!resolvedLectureId || resolvedClassId === undefined) {
      showError("클래스 정보를 찾을 수 없습니다.");
      return;
    }
    setIsPdfModalOpen(true);
    void fetchPdfList();
  }, [fetchPdfList, resolvedClassId, resolvedLectureId, showError]);

  const handleRefreshPdfList = useCallback(() => {
    void fetchPdfList();
  }, [fetchPdfList]);

  const handleSelectPdf = useCallback(
    async (pdf: PdfItem) => {
      console.log("[RealtimeDashboard] PDF 선택:", pdf);
      setSelectedPdf(pdf);
      setIsPdfModalOpen(false);
      if (isSharing) {
        stopScreenShare();
      }

      // Whiteboard pages 가져오기
      if (resolvedLectureId && resolvedClassId !== undefined) {
        try {
          const pagesResponse = await getWhiteboardPages(
            resolvedLectureId,
            resolvedClassId,
            "finalized"
          );
          setWhiteboardPages(pagesResponse.pages || []);
          console.log(
            "[RealtimeDashboard] Whiteboard pages 로드:",
            pagesResponse.pages
          );
        } catch (error) {
          console.error(
            "[RealtimeDashboard] Whiteboard pages 로드 실패:",
            error
          );
          setWhiteboardPages([]);
        }
      }

      // Socket.io로 PDF 공유 이벤트 전송
      if (
        chatSocketRef.current &&
        resolvedLectureId &&
        resolvedClassId !== undefined
      ) {
        console.log("[RealtimeDashboard] PDF 공유 이벤트 전송:", {
          pdf_url: pdf.url,
          pdf_name: pdf.name,
        });
        chatSocketRef.current.emit("pdf:share", {
          pdf_url: pdf.url,
          pdf_name: pdf.name,
        });
      } else {
        console.warn("[RealtimeDashboard] Socket 또는 ID가 없음:", {
          hasSocket: !!chatSocketRef.current,
          lectureId: resolvedLectureId,
          classId: resolvedClassId,
        });
      }
    },
    [isSharing, stopScreenShare, resolvedLectureId, resolvedClassId]
  );

  const handleOpenLessonQuestionModal = useCallback(
    async (pdf?: PdfItem) => {
      if (!resolvedLectureId || resolvedClassId === undefined) {
        showError("클래스 정보를 찾을 수 없습니다.");
        return;
      }

      setIsLessonDetailLoading(true);
      if (pdf) {
        setIsPdfModalOpen(false);
      }

      try {
        const detail = await getClassDetail(resolvedLectureId, resolvedClassId);
        const materials = detail.class?.materials as
          | Array<string | { url?: string; originalName?: string }>
          | undefined;

        // PDF URL 찾기
        let materialUrl: string | undefined;
        let materialName: string | undefined;

        if (materials && materials.length > 0) {
          const firstMaterial = materials[0];
          if (typeof firstMaterial === "string") {
            materialUrl = resolveAssetUrl(firstMaterial);
            materialName = firstMaterial.split("/").pop() || "강의 자료";
          } else {
            materialUrl = firstMaterial.url
              ? resolveAssetUrl(firstMaterial.url)
              : pdf?.url;
            materialName =
              firstMaterial.originalName || pdf?.name || "강의 자료";
          }
        } else if (pdf) {
          materialUrl = pdf.url;
          materialName = pdf.name;
        }

        // whiteboard pages 가져오기 시도
        let pages: WhiteboardPage[] | undefined;
        try {
          const pagesResponse = await getWhiteboardPages(
            resolvedLectureId,
            resolvedClassId,
            "finalized"
          );
          pages = pagesResponse.pages || [];
        } catch (error) {
          console.error("Whiteboard pages 조회 실패:", error);
          pages = undefined;
        }

        setSelectedLesson({
          title: detail.class?.title || pdfMeta?.classTitle || "강의 자료",
          fileName: materialName || "강의 자료",
          fileSize: "파일",
          url: materialUrl,
          lectureId: resolvedLectureId,
          classId: resolvedClassId,
          pages: pages,
        });
        setIsLessonQuestionModalOpen(true);
      } catch (error) {
        console.error("클래스 정보 조회 실패:", error);
        showError("교안 정보를 불러오는데 실패했습니다.");
      } finally {
        setIsLessonDetailLoading(false);
      }
    },
    [resolvedLectureId, resolvedClassId, pdfMeta, showError, resolveAssetUrl]
  );

  const handleStopPdfShare = useCallback(() => {
    // Socket.io로 PDF 공유 중지 이벤트 전송
    if (chatSocketRef.current) {
      chatSocketRef.current.emit("pdf:stop-share");
    }
    setSelectedPdf(null);
  }, []);

  // PDF+필기 캡쳐 핸들러
  const handlePdfCapture = useCallback(
    async (imageData: string, timestamp: number) => {
      if (!resolvedLectureId || resolvedClassId === undefined || !selectedPdf) {
        return;
      }

      try {
        // base64 데이터에서 실제 이미지 데이터만 추출 (data:image/jpeg;base64, 제거)
        const base64Data = imageData.includes(",")
          ? imageData.split(",")[1]
          : imageData;

        // 현재 PDF 페이지 번호 추정 (간단히 1로 설정, 추후 개선 가능)
        // 실제로는 PDF 뷰어에서 현재 페이지를 추적해야 함
        const currentPage = 1;

        await analyzeHandwriting({
          image_data: base64Data,
          timestamp,
          lecture_id: resolvedLectureId,
          class_id: resolvedClassId,
          page_number: currentPage,
          pdf_url: selectedPdf.url,
        });

        console.log(
          "[RealtimeDashboard] PDF+필기 캡쳐 및 분석 완료:",
          timestamp
        );
      } catch (error) {
        console.error("[RealtimeDashboard] PDF+필기 캡쳐 실패:", error);
      }
    },
    [resolvedLectureId, resolvedClassId, selectedPdf]
  );

  const handleClosePdfModal = useCallback(() => {
    setIsPdfModalOpen(false);
  }, []);

  const startScreenShare = useCallback(async () => {
    // 이미 공유 중이면 중복 호출 방지
    if (isSharing || shareStreamRef.current) {
      return;
    }

    // 화면공유 시작 플래그 설정 (visibilitychange 무시)
    if (isStartingShareRef.current) {
      return; // 이미 시작 중이면 중복 호출 방지
    }
    isStartingShareRef.current = true;
    setTimeout(() => {
      isStartingShareRef.current = false;
    }, 5000); // 5초 후 플래그 해제

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

      // 전체 화면 공유를 기본으로 설정 (preferCurrentTab: false)
      const displayConstraints: MediaStreamConstraints & {
        preferCurrentTab?: boolean;
      } = {
        video: {
          frameRate: 30,
          displaySurface: "monitor", // 전체 화면 선호
        },
        audio: true,
        preferCurrentTab: false, // Chrome/Edge 전용 옵션
      };
      const displayStream = await getDisplay(displayConstraints);
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
      const videoTracks = displayStream.getVideoTracks();
      const audioTracks = displayStream.getAudioTracks();

      // 모든 트랙에 ended 이벤트 리스너 추가
      [...videoTracks, ...audioTracks].forEach((track) => {
        track.addEventListener("ended", () => {
          console.log("[RealtimeDashboard] Screen share track ended");
          stopScreenShare();
        });
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
    } finally {
      // 에러 발생 시에도 플래그 해제
      setTimeout(() => {
        isStartingShareRef.current = false;
      }, 1000);
    }
  }, [showError, stopScreenShare, isSharing]);

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

  const handleSendMessage = useCallback(async () => {
    // 중복 전송 방지
    if (isSendingMessage) {
      return;
    }

    // 메시지가 비어있거나 필수 정보가 없으면 리턴
    if (
      !chatMessage.trim() ||
      !resolvedLectureId ||
      resolvedClassId === undefined ||
      !chatSocketRef.current
    ) {
      return;
    }

    // Socket.io 연결 확인
    if (!chatSocketRef.current.connected) {
      showError("서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    // 너무 빠른 연속 전송 방지 (최소 300ms 간격)
    const now = Date.now();
    if (now - lastMessageTimeRef.current < 300) {
      return;
    }

    const messageText = chatMessage.trim();
    setIsSendingMessage(true);
    lastMessageTimeRef.current = now;

    try {
      // Socket.io를 통해 실시간 전송 (백엔드에서 DB 저장도 함께 처리)
      chatSocketRef.current.emit("chat:send", {
        message: messageText,
      });

      // 메시지 입력 필드 비우기
      setChatMessage("");
    } catch (error) {
      console.error("메시지 전송 실패:", error);
      showError(
        error instanceof Error ? error.message : "메시지 전송에 실패했습니다."
      );
    } finally {
      // 전송 완료 후 약간의 지연을 두고 플래그 해제
      setTimeout(() => {
        setIsSendingMessage(false);
      }, 500);
    }
  }, [
    chatMessage,
    isSendingMessage,
    resolvedLectureId,
    resolvedClassId,
    resolvedLiveId,
    showError,
  ]);

  const closePersonnel = () => setIsPersonnelOpen(false);

  // 채팅 메시지 조회 및 Socket.io 연결
  useEffect(() => {
    if (!resolvedLectureId || resolvedClassId === undefined) return;

    // 기존 메시지 조회
    const loadMessages = async () => {
      try {
        const params: {
          lecture_id: string;
          class_id: number;
          live_id?: number;
          limit: number;
        } = {
          lecture_id: resolvedLectureId!,
          class_id: resolvedClassId!,
          limit: 50,
        };
        // live_id가 undefined가 아니고 null이 아닐 때만 추가
        if (resolvedLiveId !== undefined && resolvedLiveId !== null) {
          params.live_id = resolvedLiveId;
        }
        const response = await getChatMessages(params);
        setChatMessages(response.messages || []);
        // 스크롤을 맨 아래로
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error("메시지 조회 실패:", error);
        // 404 에러는 조용히 처리 (채팅이 없을 수 있음)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          !errorMessage.includes("404") &&
          !errorMessage.includes("찾을 수 없습니다")
        ) {
          console.warn("채팅 메시지 조회 중 오류:", errorMessage);
        }
      }
    };

    loadMessages();

    // Socket.io 연결
    const baseUrl = getBaseUrl();
    const token = localStorage.getItem("lecq.token");
    const socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined,
    });
    chatSocketRef.current = socket;

    // 라이브 룸 입장
    const handleConnect = () => {
      console.log("[RealtimeDashboard] Socket connected:", socket.id);
      socket.emit("live:join", {
        lecture_id: resolvedLectureId,
        class_id: resolvedClassId,
        live_id: resolvedLiveId ?? null,
        role: "professor",
        user_id: user?.id,
      });
    };

    socket.on("connect", handleConnect);

    // 재연결 시 룸 재입장
    socket.on("reconnect", () => {
      console.log("[RealtimeDashboard] Socket reconnected, rejoining room");
      handleConnect();
    });

    // 실시간 메시지 수신
    const handleChatMessage = (message: ChatMessage) => {
      console.log("[RealtimeDashboard] Received chat message:", message);
      setChatMessages((prev) => {
        // 중복 방지
        if (prev.some((m) => m._id === message._id)) {
          console.log("[RealtimeDashboard] 중복 메시지 무시:", message._id);
          return prev;
        }
        console.log("[RealtimeDashboard] 새 메시지 추가:", message._id);
        return [...prev, message];
      });
      // 스크롤을 맨 아래로
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop =
            chatContainerRef.current.scrollHeight;
        }
      }, 100);
    };

    socket.on("chat:message", handleChatMessage);
    console.log("[RealtimeDashboard] chat:message 리스너 등록 완료");

    return () => {
      socket.off("connect", handleConnect);
      socket.off("reconnect", handleConnect);
      socket.off("chat:message", handleChatMessage);
      socket.disconnect();
      chatSocketRef.current = null;
    };
  }, [resolvedLectureId, resolvedClassId, resolvedLiveId, user?.id]);

  // 학생 목록 가져오기
  useEffect(() => {
    const fetchStudents = async () => {
      if (!resolvedLectureId) return;
      try {
        const membersResponse = await getMembers(resolvedLectureId);
        const studentsList = membersResponse.students.map((student) => ({
          id: student.id,
          name: student.name,
          email: student.email,
        }));
        setStudents(studentsList);

        // userId -> name 맵 생성
        const nameMap = new Map<string, string>();
        studentsList.forEach((student) => {
          nameMap.set(student.id, student.name);
        });
        setStudentNameMap(nameMap);
      } catch (error) {
        console.error("학생 목록 조회 실패:", error);
      }
    };

    fetchStudents();
  }, [resolvedLectureId]);

  // 컴포넌트 마운트 시 웹캠 자동 시작 및 화면 공유 자동 시작
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      await startCamera();
      // 약간의 지연 후 화면 공유 시작 (카메라 시작 후)
      if (mounted) {
        setTimeout(() => {
          if (mounted && !isSharing) {
            startScreenShare();
          }
        }, 500);
      }
    };

    initialize();

    return () => {
      mounted = false;
      stopCamera();
      stopScreenShare();
      stopCamera();
    };
  }, []); // 한 번만 실행

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
        // 탭이 숨겨지면 화면공유 정리 (브라우저가 종료되어도 정리되도록)
        if (isSharing) {
          console.log("[RealtimeDashboard] Tab hidden, stopping screen share");
          stopScreenShare();
        }
        // 카메라는 유지 (사용자가 다시 돌아올 수 있음)
      }
    };

    const onBeforeUnload = () => {
      // 페이지를 떠날 때 모든 스트림 정리
      console.log("[RealtimeDashboard] Before unload, cleaning up all streams");
      stopScreenShare();
      stopCamera();
    };

    const onPageHide = () => {
      // 페이지가 숨겨질 때 (뒤로 가기, 새로고침 등)
      console.log("[RealtimeDashboard] Page hide, cleaning up all streams");
      stopScreenShare();
      stopCamera();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
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
              hasPdfOverlay={!!selectedPdf}
              videoRef={shareVideoRef}
              connectionStatus={webrtcStatus}
              remoteParticipants={remoteParticipants}
            >
              <>
                {selectedPdf && (
                  <div className="absolute inset-4 z-20">
                    <AnnotatablePdfViewer
                      pdfUrl={selectedPdf.url}
                      pdfName={selectedPdf.name}
                      onStop={handleStopPdfShare}
                      onCapture={handlePdfCapture}
                      lectureId={resolvedLectureId}
                      classId={resolvedClassId}
                      socket={chatSocketRef.current}
                      currentPage={1}
                      whiteboardPages={whiteboardPages}
                    />
                  </div>
                )}
                {isParticipantStripVisible ? (
                  <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none z-30">
                    <ParticipantStrip
                      isCameraOn={isCameraOn}
                      videoRef={videoRef}
                      remoteParticipants={remoteParticipants}
                      studentNameMap={studentNameMap}
                      onClose={() => setIsParticipantStripVisible(false)}
                    />
                  </div>
                ) : (
                  <div className="absolute top-6 right-6 z-30 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setIsParticipantStripVisible(true)}
                      className="px-3 py-1.5 rounded-full bg-white/90 border border-gray-200 shadow text-xs text-gray-700 hover:bg-white"
                    >
                      참여자 목록 보기
                    </button>
                  </div>
                )}
                <LiveControls
                  isMicOn={isMicOn}
                  isCameraOn={isCameraOn}
                  isSharing={isSharing}
                  isPdfSharing={!!selectedPdf}
                  onToggleMic={toggleMic}
                  onToggleCamera={toggleCamera}
                  onToggleShare={() =>
                    isSharing ? stopScreenShare() : startScreenShare()
                  }
                  onSharePdf={handleOpenPdfModal}
                  onOpenPersonnel={() => setIsPersonnelOpen(true)}
                  onEnd={() => setIsEndConfirmOpen(true)}
                />
              </>
            </ScreenShareArea>
          </div>
        </div>

        {/* 우측 채팅/질문 패널 */}
        <div className="w-80 bg-white border-l border-gray-200">
          <div className="h-full flex flex-col">
            {/* 헤더 - 실시간 채팅 + 질문하기 버튼 */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-medium text-gray-900">실시간 채팅</h3>
              <button
                onClick={() => handleOpenLessonQuestionModal()}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                답변하기
              </button>
            </div>

            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto" ref={chatContainerRef}>
              <div className="p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    채팅 메시지가 없습니다.
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isProfessor =
                      msg.sender.role === "professor" ||
                      msg.sender.role === "assistant";
                    const isOwnMessage = msg.sender.id === user?.id;
                    const time = new Date(msg.timestamp || msg.created_at);
                    const timeStr = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;

                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-2 ${
                            isOwnMessage
                              ? "bg-blue-600 text-white"
                              : isProfessor
                                ? "bg-green-100 text-gray-900"
                                : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium ${
                                isOwnMessage
                                  ? "text-blue-100"
                                  : isProfessor
                                    ? "text-green-700"
                                    : "text-gray-600"
                              }`}
                            >
                              {isOwnMessage
                                ? "나"
                                : isProfessor
                                  ? "교수자"
                                  : msg.sender.name}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isOwnMessage ? "text-blue-200" : "text-gray-500"
                              }`}
                            >
                              {timeStr}
                            </span>
                          </div>
                          <p className="text-sm break-words">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 하단 입력 영역 */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="채팅 입력 (Enter)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                  disabled={isSendingMessage}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isSendingMessage) {
                        handleSendMessage();
                      }
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isSendingMessage) {
                      handleSendMessage();
                    }
                  }}
                  disabled={isSendingMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <PdfShareModal
        isOpen={isPdfModalOpen}
        onClose={handleClosePdfModal}
        isLoading={isPdfLoading}
        pdfs={pdfItems}
        error={pdfError}
        meta={pdfMeta}
        onRefresh={handleRefreshPdfList}
        onSelect={handleSelectPdf}
      />
      {selectedLesson && (
        <LessonQuestionModal
          isOpen={isLessonQuestionModalOpen}
          onClose={() => {
            setIsLessonQuestionModalOpen(false);
            setSelectedLesson(null);
          }}
          lessonTitle={selectedLesson.title}
          fileName={selectedLesson.fileName}
          fileSize={selectedLesson.fileSize}
          pdfUrl={selectedLesson.url}
          lectureId={selectedLesson.lectureId}
          classId={selectedLesson.classId}
          pages={selectedLesson.pages}
        />
      )}
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

type PdfShareModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  pdfs: PdfItem[];
  error?: string | null;
  meta?: {
    lectureName?: string;
    classTitle?: string;
  } | null;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (pdf: PdfItem) => void;
};

const PdfShareModal: React.FC<PdfShareModalProps> = ({
  isOpen,
  isLoading,
  pdfs,
  error,
  meta,
  onClose,
  onRefresh,
  onSelect,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-2 sm:px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
        <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              PDF 자료 공유
            </p>
            {meta && (
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                {meta.lectureName || "강좌"} · {meta.classTitle || "클래스"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={onRefresh}
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              새로고침
            </button>
            <button
              onClick={onClose}
              className="px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
            >
              닫기
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="py-10 text-center text-xs sm:text-sm text-gray-500">
              PDF 목록을 불러오는 중입니다...
            </div>
          ) : error ? (
            <div className="py-10 text-center text-xs sm:text-sm text-red-500 break-words px-2">
              {error}
            </div>
          ) : pdfs.length === 0 ? (
            <div className="py-10 text-center text-xs sm:text-sm text-gray-500">
              등록된 PDF 자료가 없습니다.
            </div>
          ) : (
            pdfs.map((pdf) => (
              <div
                key={pdf.url}
                className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-2 sm:gap-3 rounded-xl border border-gray-100 p-2 sm:p-3 hover:border-blue-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                    {pdf.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 break-all mt-0.5">
                    {pdf.url}
                  </p>
                </div>
                <button
                  onClick={() => onSelect(pdf)}
                  className="px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  공유하기
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboard;
