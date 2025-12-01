import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { getBaseUrl } from "../../api/auth/client";
import StudentScreenArea from "../../components/live/student/StudentScreenArea";
import StudentLiveControls from "../../components/live/student/StudentLiveControls";
import StudentParticipantStrip from "../../components/live/student/StudentParticipantStrip";
import { useLiveWebRTC } from "../../hooks/useLiveWebRTC";
import { useAuth } from "../../contexts/AuthContext";
import { getParticipateInfo } from "../../api/student";
import Toast from "../../components/common/Toast";
import { getChatMessages, type ChatMessage } from "../../api/chat";
import {
  getClassQuestions,
  type Question as ApiQuestion,
} from "../../api/questions";
import { getMyInfo } from "../../api/auth";
import LessonQuestionModal from "../../components/modal/lessonQuestion/LessonQuestionModal";
import {
  getClassDetail,
  getWhiteboardPages,
  type WhiteboardPage,
} from "../../api/professor";
import StudentPdfViewer from "../../components/live/student/StudentPdfViewer";

const LiveWatching: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const professorVideoRef = useRef<HTMLVideoElement>(null);
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
    isLiveActive: boolean;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // URL 파라미터에서 lectureId와 classId 읽기
  const lectureId = searchParams.get("lectureId");
  const classIdParam = searchParams.get("classId");
  const classId = classIdParam ? Number(classIdParam) : null;

  // activeTab 제거 - 채팅만 표시
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [_questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [_isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [_userInfo, setUserInfo] = useState<{
    name: string;
    id: string;
    role: string;
  } | null>(null);
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
  const [sharedPdf, setSharedPdf] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const chatSocketRef = useRef<Socket | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const lastMessageTimeRef = useRef<number>(0);

  // 학생의 로컬 스트림 (카메라/마이크)
  const [studentLocalStream, setStudentLocalStream] =
    useState<MediaStream | null>(null);

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
          isLiveActive: info.is_live_active,
        });

        if (!info.is_live_active) {
          setToast({
            message: "현재 진행 중인 라이브 방송이 없습니다.",
            type: "error",
          });
        } else if (!info.live_id) {
          // 라이브가 활성화되어 있지만 liveId가 없는 경우 (채팅/질문만 가능)
          console.warn(
            "[LiveWatching] 라이브가 활성화되어 있지만 liveId가 없습니다. 채팅/질문 기능만 사용 가능합니다."
          );
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
  // 라이브가 활성화되어 있고 lectureId, classId가 있으면 연결 시도
  // liveId가 없어도 채팅/질문 기능은 사용 가능
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
    enabled:
      !!lectureInfo &&
      !!lectureInfo.isLiveActive &&
      !!lectureInfo.lectureId &&
      !!lectureInfo.classId,
    autoInitiate: false, // 학생은 offer를 보내지 않음
  });

  // 원격 스트림을 videoRef에 연결 (화면 공유만)
  useEffect(() => {
    console.log("[LiveWatching] ===== 화면 공유 스트림 찾기 시작 =====");
    console.log("[LiveWatching] remoteParticipants:", remoteParticipants);
    console.log(
      "[LiveWatching] remoteParticipants.length:",
      remoteParticipants.length
    );
    console.log(
      "[LiveWatching] remoteParticipants 상세:",
      remoteParticipants.map((p) => ({
        socketId: p.socketId,
        role: p.role,
        userId: p.userId,
        streamId: p.stream.id,
        videoTracks: p.stream.getVideoTracks().length,
        audioTracks: p.stream.getAudioTracks().length,
      }))
    );
    console.log("[LiveWatching] videoRef.current:", videoRef.current);

    if (remoteParticipants.length > 0 && videoRef.current) {
      // 교수자의 스트림 찾기 (role이 professor이거나 role이 없는 경우도 포함)
      const professorParticipants = remoteParticipants.filter(
        (p) => p.role === "professor" || !p.role
      );

      console.log(
        "[LiveWatching] 교수자 참여자 수 (role 포함):",
        professorParticipants.length
      );

      // 교수자의 화면 공유 스트림 찾기 (screen 트랙이 있는 것만)
      let screenShareStream: MediaStream | null = null;
      let cameraStream: MediaStream | null = null;

      for (const participant of professorParticipants) {
        const stream = participant.stream;
        const videoTracks = stream.getVideoTracks();

        console.log("[LiveWatching] 스트림 확인:", {
          streamId: stream.id,
          videoTracksCount: videoTracks.length,
          tracks: videoTracks.map((t) => ({
            label: t.label,
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
          })),
        });

        if (videoTracks.length === 0) continue;

        // 화면 공유 트랙인지 확인
        let hasScreenTrack = false;
        let trackDetails: Record<string, unknown> | null = null;

        for (const track of videoTracks) {
          try {
            const settings = track.getSettings();
            const label = track.label || "";
            const displaySurface = settings.displaySurface;
            const width = settings.width;
            const height = settings.height;

            trackDetails = {
              label: label,
              displaySurface: displaySurface,
              width: width,
              height: height,
              allSettings: settings,
            };

            // 화면 공유 트랙 판별 조건
            const isScreen =
              label.toLowerCase().includes("screen") ||
              label.toLowerCase().includes("화면") ||
              displaySurface === "monitor" ||
              displaySurface === "window" ||
              displaySurface === "browser" ||
              // 일반 카메라보다 큰 해상도면 화면 공유로 간주
              (width && height && width > 1280 && height > 720);

            console.log("[LiveWatching] 트랙 확인 (화면 공유):", {
              ...trackDetails,
              isScreen: isScreen,
            });

            if (isScreen) {
              hasScreenTrack = true;
              break;
            }
          } catch (e) {
            const label = track.label || "";
            const isScreen =
              label.toLowerCase().includes("screen") ||
              label.toLowerCase().includes("화면");
            console.log("[LiveWatching] 트랙 확인 (예외, 화면 공유):", {
              label: label,
              isScreen: isScreen,
              error: e,
            });
            if (isScreen) {
              hasScreenTrack = true;
              break;
            }
          }
        }

        // 화면 공유 트랙이 있는 스트림만 사용
        if (hasScreenTrack) {
          console.log(
            "[LiveWatching] 화면 공유 스트림 발견:",
            stream.id,
            trackDetails
          );
          screenShareStream = stream;
        } else {
          // 화면 공유가 아니면 카메라로 간주 (나중에 교수자 카메라로 사용)
          if (!cameraStream) {
            cameraStream = stream;
            console.log("[LiveWatching] 카메라 스트림으로 분류:", stream.id);
          }
        }
      }

      // 화면 공유 스트림이 없으면, 교수자 카메라가 아닌 다른 스트림 사용
      if (!screenShareStream) {
        if (professorParticipants.length > 1 && cameraStream) {
          // 이미 카메라로 분류된 스트림이 있으면, 다른 스트림을 화면 공유로 사용
          const otherStream = professorParticipants.find(
            (p) => p.stream.id !== cameraStream.id
          )?.stream;
          if (otherStream) {
            console.log(
              "[LiveWatching] 화면 공유 스트림을 찾지 못했지만 다른 스트림 사용:",
              otherStream.id
            );
            screenShareStream = otherStream;
          }
        } else if (professorParticipants.length === 1) {
          // 스트림이 1개만 있으면, 화면 공유로 사용 (카메라가 아닌 것으로 간주)
          console.log(
            "[LiveWatching] 스트림이 1개만 있어서 화면 공유로 사용:",
            professorParticipants[0].stream.id
          );
          screenShareStream = professorParticipants[0].stream;
        }
      }

      console.log(
        "[LiveWatching] 최종 화면 공유 스트림:",
        screenShareStream ? screenShareStream.id : "없음"
      );

      // 화면 공유 스트림만 사용 (카메라는 사용하지 않음)
      if (screenShareStream && videoRef.current) {
        // 현재 연결된 스트림과 다를 때만 업데이트
        console.log("[LiveWatching] 화면 공유 스트림 찾음, 연결 시도:", {
          streamId: screenShareStream.id,
          currentSrcObject: videoRef.current.srcObject
            ? (videoRef.current.srcObject as MediaStream).id
            : "null",
          videoTracks: screenShareStream.getVideoTracks().length,
          audioTracks: screenShareStream.getAudioTracks().length,
        });

        if (videoRef.current.srcObject !== screenShareStream) {
          console.log(
            "[LiveWatching] Setting video srcObject (화면 공유)",
            screenShareStream.id
          );
          videoRef.current.srcObject = screenShareStream;

          // 즉시 확인
          setTimeout(() => {
            console.log("[LiveWatching] 연결 후 확인:", {
              srcObject: videoRef.current?.srcObject
                ? (videoRef.current.srcObject as MediaStream).id
                : "null",
            });
          }, 100);
        } else {
          console.log("[LiveWatching] 이미 같은 스트림이 연결되어 있음");
        }

        // 비디오 재생 시도
        const playVideo = async () => {
          try {
            if (videoRef.current) {
              await videoRef.current.play();
              console.log("[LiveWatching] 화면 공유 재생 성공");
              setIsLive(true);
            }
          } catch (playError) {
            console.warn("[LiveWatching] Auto-play prevented:", playError);
            if (videoRef.current) {
              videoRef.current.muted = true;
              try {
                await videoRef.current.play();
                console.log("[LiveWatching] 화면 공유 재생 성공 (muted)");
                setIsLive(true);
              } catch (mutedError) {
                console.warn(
                  "[LiveWatching] Even muted play failed:",
                  mutedError
                );
                setIsLive(false);
              }
            }
          }
        };

        videoRef.current.onloadedmetadata = () => {
          console.log("[LiveWatching] 화면 공유 메타데이터 로드됨");
          playVideo();
        };

        if (videoRef.current.readyState >= 2) {
          console.log("[LiveWatching] 비디오 이미 로드됨, 바로 재생 시도");
          playVideo();
        }
      } else {
        // 화면 공유 스트림이 없으면 빈 화면
        console.log("[LiveWatching] 화면 공유 스트림 없음, 비우기");
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject = null;
        }
        setIsLive(false);
      }
    } else {
      if (remoteParticipants.length === 0) {
        console.log("[LiveWatching] 원격 참여자 없음");
      }
      if (!videoRef.current) {
        console.log("[LiveWatching] videoRef.current 없음");
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        setIsLive(false);
      }
    }
  }, [remoteParticipants]);

  // 교수자 카메라 스트림을 professorVideoRef에 연결
  useEffect(() => {
    console.log("[LiveWatching] 교수자 카메라 스트림 찾기 시작");

    if (remoteParticipants.length > 0 && professorVideoRef.current) {
      // 교수자의 스트림 찾기 (role이 professor이거나 role이 없는 경우도 포함)
      const professorParticipants = remoteParticipants.filter(
        (p) => p.role === "professor" || !p.role
      );

      console.log(
        "[LiveWatching] 교수자 참여자 수 (카메라, role 포함):",
        professorParticipants.length
      );

      // 교수자의 카메라 스트림 찾기 (화면 공유가 아닌 것)
      // 먼저 화면 공유 스트림을 찾아서 제외
      let professorCameraStream: MediaStream | null = null;
      const screenShareStreamIds = new Set<string>();

      // 먼저 화면 공유 스트림 ID 수집
      for (const participant of professorParticipants) {
        const stream = participant.stream;
        const videoTracks = stream.getVideoTracks();

        if (videoTracks.length === 0) continue;

        const hasScreenTrack = videoTracks.some((track) => {
          try {
            const settings = track.getSettings();
            const label = track.label || "";
            const displaySurface = settings.displaySurface;
            const width = settings.width;
            const height = settings.height;

            const isScreen =
              label.toLowerCase().includes("screen") ||
              label.toLowerCase().includes("화면") ||
              displaySurface === "monitor" ||
              displaySurface === "window" ||
              displaySurface === "browser" ||
              (width && height && width > 1280 && height > 720);

            return isScreen;
          } catch {
            const label = track.label || "";
            return (
              label.toLowerCase().includes("screen") ||
              label.toLowerCase().includes("화면")
            );
          }
        });

        if (hasScreenTrack) {
          screenShareStreamIds.add(stream.id);
        }
      }

      // 화면 공유가 아닌 스트림을 카메라로 사용
      for (const participant of professorParticipants) {
        const stream = participant.stream;

        if (screenShareStreamIds.has(stream.id)) {
          console.log(
            "[LiveWatching] 화면 공유 스트림 무시 (카메라용):",
            stream.id
          );
          continue;
        }

        console.log("[LiveWatching] 교수자 카메라 스트림 발견:", stream.id);
        professorCameraStream = stream;
        break;
      }

      console.log(
        "[LiveWatching] 최종 교수자 카메라 스트림:",
        professorCameraStream ? professorCameraStream.id : "없음"
      );

      if (professorCameraStream && professorVideoRef.current) {
        // 현재 연결된 스트림과 다를 때만 업데이트
        console.log("[LiveWatching] 교수자 카메라 스트림 찾음, 연결 시도:", {
          streamId: professorCameraStream.id,
          currentSrcObject: professorVideoRef.current.srcObject
            ? (professorVideoRef.current.srcObject as MediaStream).id
            : "null",
          videoTracks: professorCameraStream.getVideoTracks().length,
          audioTracks: professorCameraStream.getAudioTracks().length,
        });

        if (professorVideoRef.current.srcObject !== professorCameraStream) {
          console.log(
            "[LiveWatching] Setting professorVideoRef srcObject (카메라)",
            professorCameraStream.id
          );
          professorVideoRef.current.srcObject = professorCameraStream;

          // 즉시 확인
          setTimeout(() => {
            console.log("[LiveWatching] 교수자 카메라 연결 후 확인:", {
              srcObject: professorVideoRef.current?.srcObject
                ? (professorVideoRef.current.srcObject as MediaStream).id
                : "null",
            });
          }, 100);
        } else {
          console.log(
            "[LiveWatching] 교수자 카메라 이미 같은 스트림이 연결되어 있음"
          );
        }

        const playVideo = async () => {
          try {
            if (professorVideoRef.current) {
              await professorVideoRef.current.play();
              console.log("[LiveWatching] 교수자 카메라 재생 성공");
            }
          } catch (error) {
            console.error("[LiveWatching] 교수자 카메라 재생 실패:", error);
          }
        };

        professorVideoRef.current.onloadedmetadata = () => {
          console.log("[LiveWatching] 교수자 카메라 메타데이터 로드됨");
          playVideo();
        };

        if (professorVideoRef.current.readyState >= 2) {
          playVideo();
        }
      } else if (professorVideoRef.current) {
        console.log("[LiveWatching] 교수자 카메라 스트림 없음, 비우기");
        professorVideoRef.current.srcObject = null;
      }
    } else {
      if (remoteParticipants.length === 0) {
        console.log("[LiveWatching] 원격 참여자 없음 (교수자 카메라)");
      }
      if (!professorVideoRef.current) {
        console.log("[LiveWatching] professorVideoRef.current 없음");
      }
      if (professorVideoRef.current) {
        professorVideoRef.current.srcObject = null;
      }
    }
  }, [remoteParticipants]);

  // WebRTC 오류 처리
  useEffect(() => {
    if (webrtcError) {
      setToast({ message: `WebRTC 오류: ${webrtcError}`, type: "error" });
    }
  }, [webrtcError]);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await getMyInfo();
        const userId =
          (response.user as typeof response.user & { _id?: string })._id ||
          response.user.id;
        setUserInfo({
          name: response.user.name,
          id: userId,
          role: response.user.user_type || "student",
        });
      } catch (error) {
        console.error("사용자 정보 조회 실패:", error);
      }
    };
    if (lectureInfo) {
      fetchUserInfo();
    }
  }, [lectureInfo]);

  // 질문 목록 가져오기
  const fetchQuestions = useCallback(async () => {
    if (!lectureInfo?.lectureId || !lectureInfo?.classId) return;
    setIsLoadingQuestions(true);
    try {
      const response = await getClassQuestions(
        lectureInfo.lectureId,
        lectureInfo.classId
      );
      setQuestions(response.questions || []);
    } catch (error) {
      console.error("질문 목록 조회 실패:", error);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [lectureInfo]);

  // 질문 목록 초기 로드
  useEffect(() => {
    if (lectureInfo?.lectureId && lectureInfo?.classId) {
      fetchQuestions();
    }
  }, [lectureInfo?.lectureId, lectureInfo?.classId, fetchQuestions]);

  // 교안 및 질문 모달 열기
  const handleOpenLessonQuestionModal = useCallback(async () => {
    if (!lectureInfo?.lectureId || !lectureInfo?.classId) {
      setToast({
        message: "클래스 정보를 찾을 수 없습니다.",
        type: "error",
      });
      return;
    }

    setIsLessonDetailLoading(true);
    try {
      const detail = await getClassDetail(
        lectureInfo.lectureId,
        lectureInfo.classId
      );
      const materials = detail.class?.materials as
        | Array<string | { url?: string; originalName?: string }>
        | undefined;

      // PDF URL 찾기
      let materialUrl: string | undefined;
      let materialName: string | undefined;

      if (materials && materials.length > 0) {
        const firstMaterial = materials[0];
        if (typeof firstMaterial === "string") {
          materialUrl = firstMaterial.startsWith("http")
            ? firstMaterial
            : `${getBaseUrl()}${firstMaterial}`;
          materialName = firstMaterial.split("/").pop() || "강의 자료";
        } else {
          materialUrl = firstMaterial.url
            ? firstMaterial.url.startsWith("http")
              ? firstMaterial.url
              : `${getBaseUrl()}${firstMaterial.url}`
            : undefined;
          materialName = firstMaterial.originalName || "강의 자료";
        }
      }

      // whiteboard pages 가져오기 시도
      let pages: WhiteboardPage[] | undefined;
      try {
        const pagesResponse = await getWhiteboardPages(
          lectureInfo.lectureId,
          lectureInfo.classId,
          "finalized"
        );
        pages = pagesResponse.pages || [];
      } catch (error) {
        console.error("Whiteboard pages 조회 실패:", error);
        pages = undefined;
      }

      setSelectedLesson({
        title: detail.class?.title || lectureInfo.classTitle || "강의 자료",
        fileName: materialName || "강의 자료",
        fileSize: "파일",
        url: materialUrl,
        lectureId: lectureInfo.lectureId,
        classId: lectureInfo.classId,
        pages: pages,
      });
      setIsLessonQuestionModalOpen(true);
    } catch (error) {
      console.error("클래스 정보 조회 실패:", error);
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "교안 정보를 불러오는데 실패했습니다.",
        type: "error",
      });
    } finally {
      setIsLessonDetailLoading(false);
    }
  }, [lectureInfo]);

  const handleSendChatMessage = useCallback(async () => {
    // 중복 전송 방지
    if (isSendingMessage) {
      return;
    }

    // 메시지가 비어있거나 필수 정보가 없으면 리턴
    if (!chatMessage.trim() || !lectureInfo || !chatSocketRef.current) {
      return;
    }

    // Socket.io 연결 확인
    if (!chatSocketRef.current.connected) {
      setToast({
        message: "서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.",
        type: "error",
      });
      return;
    }

    // 너무 빠른 연속 전송 방지 (최소 500ms 간격)
    const now = Date.now();
    if (now - lastMessageTimeRef.current < 500) {
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
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "메시지 전송에 실패했습니다.",
        type: "error",
      });
    } finally {
      // 전송 완료 후 약간의 지연을 두고 플래그 해제
      setTimeout(() => {
        setIsSendingMessage(false);
      }, 500);
    }
  }, [chatMessage, isSendingMessage, lectureInfo]);

  const attachStudentStream = useCallback((stream: MediaStream) => {
    console.log("[LiveWatching] attachStudentStream called", stream);
    if (studentVideoRef.current) {
      studentVideoRef.current.srcObject = stream;
      studentVideoRef.current.onloadedmetadata = () => {
        studentVideoRef.current?.play().catch(console.error);
      };
      // 이미 로드되어 있으면 바로 재생 시도
      if (studentVideoRef.current.readyState >= 2) {
        studentVideoRef.current.play().catch(console.error);
      }
    }
    setStudentLocalStream(stream);
  }, []);

  const stopStudentCamera = useCallback(() => {
    if (studentStreamRef.current) {
      // 모든 트랙 정지
      studentStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.onended = null;
      });
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
      // 카메라 끄기: 트랙만 비활성화 (스트림은 유지하여 WebRTC 연결 유지)
      if (studentStreamRef.current) {
        const videoTracks = studentStreamRef.current.getVideoTracks();
        videoTracks.forEach((track) => {
          track.enabled = false;
        });
        setIsStudentCameraOn(false);
      }
      return;
    }

    // 카메라 켜기
    try {
      if (!studentStreamRef.current) {
        // 스트림이 없으면 새로 생성
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        studentStreamRef.current = stream;
        attachStudentStream(stream);
        setIsStudentCameraOn(true);
        setIsStudentMicOn(
          stream.getAudioTracks().some((track) => track.enabled)
        );
      } else {
        // 스트림이 있으면 비디오 트랙만 활성화
        const videoTracks = studentStreamRef.current.getVideoTracks();
        if (videoTracks.length === 0) {
          // 비디오 트랙이 없으면 추가
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          videoStream.getVideoTracks().forEach((track) => {
            studentStreamRef.current!.addTrack(track);
          });
        } else {
          // 비디오 트랙이 있으면 활성화
          videoTracks.forEach((track) => {
            track.enabled = true;
          });
        }
        setIsStudentCameraOn(true);
        attachStudentStream(studentStreamRef.current);
      }
    } catch (error) {
      console.error("학생 카메라 시작 실패:", error);
      setToast({
        message: "카메라를 시작할 수 없습니다. 권한을 확인해주세요.",
        type: "error",
      });
    }
  }, [attachStudentStream, isStudentCameraOn]);

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

  // 채팅 메시지 조회 및 Socket.io 연결
  useEffect(() => {
    // 라이브가 활성화되어 있으면 liveId가 없어도 채팅 사용 가능
    if (!lectureInfo || !lectureInfo.isLiveActive) return;

    // 기존 소켓 연결 정리
    if (chatSocketRef.current) {
      chatSocketRef.current.disconnect();
      chatSocketRef.current = null;
    }

    // 기존 메시지 조회
    const loadMessages = async () => {
      try {
        const response = await getChatMessages({
          lecture_id: lectureInfo.lectureId,
          class_id: lectureInfo.classId,
          live_id: lectureInfo.liveId ?? null,
          limit: 50,
        });
        setChatMessages(response.messages);
        // 스크롤을 맨 아래로
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.error("메시지 조회 실패:", error);
      }
    };

    loadMessages();

    // Socket.io 연결
    const baseUrl = getBaseUrl();
    const token = localStorage.getItem("lecq.token");

    if (!token) {
      console.warn("[LiveWatching] No token found, skipping socket connection");
      return;
    }

    const socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    chatSocketRef.current = socket;

    // 연결 성공 시
    socket.on("connect", () => {
      console.log("[LiveWatching] Socket connected:", socket.id);
      const joinPayload = {
        lecture_id: lectureInfo.lectureId,
        class_id: lectureInfo.classId,
        live_id: lectureInfo.liveId ?? null,
        role: "student",
        user_id: user?.id,
      };
      console.log("[LiveWatching] live:join 전송:", joinPayload);
      socket.emit("live:join", joinPayload);
    });

    // 연결 에러 핸들링
    socket.on("connect_error", (error) => {
      console.error("[LiveWatching] Socket connect error:", error);
    });

    // 재연결 시도 중
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("[LiveWatching] Reconnection attempt:", attemptNumber);
    });

    // 재연결 성공
    socket.on("reconnect", (attemptNumber) => {
      console.log(
        "[LiveWatching] Reconnected after",
        attemptNumber,
        "attempts"
      );
      socket.emit("live:join", {
        lecture_id: lectureInfo.lectureId,
        class_id: lectureInfo.classId,
        live_id: lectureInfo.liveId ?? null,
        role: "student",
        user_id: user?.id,
      });
    });

    // 재연결 실패
    socket.on("reconnect_failed", () => {
      console.error("[LiveWatching] Reconnection failed");
    });

    // 실시간 메시지 수신
    const handleChatMessage = (message: ChatMessage) => {
      console.log("[LiveWatching] Received chat message:", message);
      setChatMessages((prev) => {
        // 중복 방지
        if (prev.some((m) => m._id === message._id)) {
          console.log("[LiveWatching] 중복 메시지 무시:", message._id);
          return prev;
        }
        console.log("[LiveWatching] 새 메시지 추가:", message._id);
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
    console.log("[LiveWatching] chat:message 리스너 등록 완료");

    // 질문 실시간 업데이트
    const handleQuestionNew = (question: ApiQuestion) => {
      console.log("[LiveWatching] question:new 이벤트 수신:", question);
      setQuestions((prev) => {
        if (prev.some((q) => q._id === question._id)) {
          return prev;
        }
        return [question, ...prev];
      });
    };

    const handleQuestionUpdated = (question: ApiQuestion) => {
      console.log("[LiveWatching] question:updated 이벤트 수신:", question);
      setQuestions((prev) =>
        prev.map((q) => (q._id === question._id ? question : q))
      );
    };

    const handleQuestionAnswer = (data: {
      question_id: string;
      answer: string;
      question: ApiQuestion;
    }) => {
      console.log("[LiveWatching] question:answer 이벤트 수신:", data);
      setQuestions((prev) => {
        const updated = prev.map((q) =>
          q._id === data.question_id ? { ...q, answer: data.answer } : q
        );
        if (!prev.some((q) => q._id === data.question_id)) {
          return [data.question, ...updated];
        }
        return updated;
      });
    };

    socket.on("question:new", handleQuestionNew);
    socket.on("question:updated", handleQuestionUpdated);
    socket.on("question:answer", handleQuestionAnswer);

    // PDF 공유 이벤트 수신
    socket.on("pdf:shared", (data: { pdf_url: string; pdf_name: string }) => {
      console.log("[LiveWatching] PDF 공유 수신:", data);
      setSharedPdf({
        url: data.pdf_url,
        name: data.pdf_name,
      });
    });

    socket.on("pdf:stopped", () => {
      console.log("[LiveWatching] PDF 공유 중지 수신");
      setSharedPdf(null);
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("reconnect_attempt");
      socket.off("reconnect");
      socket.off("reconnect_failed");
      socket.off("chat:message", handleChatMessage);
      socket.off("question:new", handleQuestionNew);
      socket.off("question:updated", handleQuestionUpdated);
      socket.off("question:answer", handleQuestionAnswer);
      socket.off("pdf:shared");
      socket.off("pdf:stopped");
      socket.disconnect();
      chatSocketRef.current = null;
    };
  }, [lectureInfo, user?.id]);

  useEffect(() => {
    const onBeforeUnload = () => {
      console.log("[LiveWatching] Before unload, cleaning up streams");
      stopStudentCamera();
    };

    const onPageHide = () => {
      console.log("[LiveWatching] Page hide, cleaning up streams");
      stopStudentCamera();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      stopStudentCamera();
    };
  }, [stopStudentCamera]);

  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex flex-1 overflow-hidden">
        {/* 메인 콘텐츠 영역 - 교수 레이아웃과 동일 */}
        <div className="flex-1 bg-white m-2 rounded-lg shadow-sm overflow-hidden">
          <div className="h-full flex flex-col overflow-hidden">
            {/* 강의 제목 - 교수 화면 스타일 매칭 */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-white via-white to-green-50">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-green-600 truncate">
                  {isLoading
                    ? "로딩 중..."
                    : lectureInfo
                      ? `${lectureInfo.classTitle} - ${lectureInfo.lectureName}`
                      : "강의 정보 없음"}
                </h1>
                {lectureInfo && !lectureInfo.liveId && (
                  <p className="text-xs text-gray-500">
                    현재 진행 중인 라이브 방송이 없습니다.
                  </p>
                )}
              </div>
            </div>

            {/* 상단 참여자(웹캠) 스트립 */}
            <StudentParticipantStrip
              professorCameraRef={professorVideoRef}
              studentVideoRef={studentVideoRef}
              isStudentCameraOn={isStudentCameraOn}
              remoteParticipants={remoteParticipants}
            />

            {/* 강의 콘텐츠(화면 공유 영역) - 교수자와 동일한 구조 */}
            <StudentScreenArea
              isLive={isLive}
              videoRef={videoRef}
              hasPdfOverlay={!!sharedPdf}
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
              connectionStatus={webrtcStatus}
            >
              <>
                {sharedPdf && (
                  <div className="absolute inset-4 z-20">
                    <StudentPdfViewer
                      pdfUrl={sharedPdf.url}
                      pdfName={sharedPdf.name}
                      socket={chatSocketRef.current}
                    />
                  </div>
                )}
                <StudentLiveControls
                  isMicOn={isStudentMicOn}
                  isCameraOn={isStudentCameraOn}
                  onToggleMic={toggleStudentMic}
                  onToggleCamera={toggleStudentCamera}
                />
              </>
            </StudentScreenArea>
          </div>
        </div>

        {/* 우측 채팅 패널 - 반응형 처리 */}
        <div className="hidden lg:block w-80 bg-white border-l border-gray-200">
          <div className="h-full flex flex-col">
            {/* 헤더 - 실시간 채팅 + 질문하기 버튼 */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-medium text-gray-900">실시간 채팅</h3>
              <button
                onClick={handleOpenLessonQuestionModal}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                질문하기
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
                    const isProfessor = msg.sender.role === "professor";
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
                                : "bg-white text-gray-900 border border-gray-200"
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
                        handleSendChatMessage();
                      }
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isSendingMessage) {
                      handleSendChatMessage();
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
    </div>
  );
};

export default LiveWatching;
