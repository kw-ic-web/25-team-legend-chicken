import React, { useEffect, useState, useRef, useCallback } from "react";
import { VideoOff, X } from "lucide-react";
import type { RefObject, MutableRefObject } from "react";
import { useAuth } from "../../../contexts/AuthContext";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  teacherName?: string;
  professorCameraRef?: AnyVideoRef;
  studentVideoRef?: AnyVideoRef;
  isStudentCameraOn?: boolean;
  remoteParticipants?: Array<{
    socketId: string;
    userId?: string;
    role?: string;
    stream: MediaStream;
  }>;
  onClose?: () => void;
}

const StudentParticipantStrip: React.FC<Props> = ({
  teacherName = "교수자",
  professorCameraRef,
  studentVideoRef,
  isStudentCameraOn,
  remoteParticipants = [],
  onClose,
}) => {
  const { user } = useAuth();
  const [hasProfessorVideo, setHasProfessorVideo] = useState(false);
  const currentUserName = user?.name || "나";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 교수자 비디오 스트림 상태 확인
  useEffect(() => {
    if (!professorCameraRef) {
      setHasProfessorVideo(false);
      return;
    }

    const checkVideo = () => {
      const videoElement = (professorCameraRef as RefObject<HTMLVideoElement>).current;
      if (videoElement) {
        if (videoElement.srcObject) {
          setHasProfessorVideo(true);
        } else {
          setHasProfessorVideo(false);
        }
      } else {
        setHasProfessorVideo(false);
      }
    };

    checkVideo();
    const interval = setInterval(checkVideo, 500);

    return () => clearInterval(interval);
  }, [professorCameraRef]);

  // 학생 참여자 필터링 (role이 student인 것만)
  const studentParticipants = remoteParticipants.filter(
    (p) => p.role === "student"
  );

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollLeft, clientWidth, scrollWidth } = container;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;
    if (!container) return;
    const handleResize = () => updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", handleResize);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateScrollState, studentParticipants.length]);

  const scrollByDelta = (delta: number) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  // 학생 비디오 타일 컴포넌트
  const StudentVideoTile: React.FC<{ participant: typeof remoteParticipants[0] }> = ({
    participant,
  }) => {
    const studentVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      if (studentVideoRef.current && participant.stream) {
        // 학생의 카메라 스트림 찾기 (화면 공유가 아닌 카메라)
        const videoTracks = participant.stream.getVideoTracks();
        const cameraTrack = videoTracks.find(
          (track) => {
            try {
              const settings = track.getSettings();
              const label = track.label || "";
              const displaySurface = settings.displaySurface;
              const isScreen = (
                label.toLowerCase().includes("screen") ||
                label.toLowerCase().includes("화면") ||
                displaySurface === "monitor" ||
                displaySurface === "window" ||
                displaySurface === "browser"
              );
              return !isScreen;
            } catch {
              return !track.label?.toLowerCase().includes("screen");
            }
          }
        );

        if (cameraTrack && studentVideoRef.current) {
          const cameraStream = new MediaStream([cameraTrack]);
          if (participant.stream.getAudioTracks().length > 0) {
            cameraStream.addTrack(participant.stream.getAudioTracks()[0]);
          }
          studentVideoRef.current.srcObject = cameraStream;
          studentVideoRef.current.play().catch(console.error);
        } else if (studentVideoRef.current && videoTracks.length > 0) {
          studentVideoRef.current.srcObject = participant.stream;
          studentVideoRef.current.play().catch(console.error);
        }
      }
    }, [participant.stream]);

    const hasVideo = studentVideoRef.current?.srcObject !== null;

    return (
      <div className="min-w-[120px] w-28 h-20 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative">
        <video
          ref={studentVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            hasVideo ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        />
        {!hasVideo && (
          <div className="absolute inset-0 w-full h-full bg-gray-300 flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">
          {participant.userId || "학생"}
        </div>
      </div>
    );
  };

  const tiles = [
    {
      id: "professor",
      node: (
        <div className="min-w-[120px] w-28 h-20 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative">
          {professorCameraRef && (
            <video
              ref={professorCameraRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                hasProfessorVideo ? "opacity-100 visible" : "opacity-0 invisible"
              }`}
            />
          )}
          {!hasProfessorVideo && (
            <div className="absolute inset-0 w-full h-full bg-gray-300 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">
            {teacherName}
          </div>
        </div>
      ),
    },
    {
      id: "student-self",
      node: (
        <div className="min-w-[120px] w-28 h-20 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative border border-blue-300">
          <video
            ref={studentVideoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isStudentCameraOn ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
          />
          {!isStudentCameraOn && (
            <div className="absolute inset-0 w-full h-full bg-gray-300 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">
            {currentUserName}
          </div>
        </div>
      ),
    },
    ...studentParticipants.map((participant) => ({
      id: `student-${participant.socketId}`,
      node: <StudentVideoTile key={participant.socketId} participant={participant} />,
    })),
  ];

  return (
    <div className="pointer-events-none">
      <div className="inline-flex items-center px-3 py-2 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/40 shadow-lg pointer-events-auto relative">
        {onClose && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-900 transition-colors shadow-lg z-10"
            aria-label="카메라 목록 닫기"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => scrollByDelta(-140)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border bg-white text-gray-500 shadow transition-opacity ${
            canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-label="참가자 왼쪽으로 이동"
        >
          ‹
        </button>
        <div
          ref={scrollRef}
          className="flex items-center space-x-2 overflow-x-auto scrollbar-hide max-w-lg"
        >
          {tiles.map((tile) => (
            <div key={tile.id} className="flex-shrink-0">
              {tile.node}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollByDelta(140)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-7 rounded-full border bg-white text-gray-500 shadow transition-opacity ${
            canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          aria-label="참가자 오른쪽으로 이동"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default StudentParticipantStrip;
