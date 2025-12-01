import React, { useCallback, useEffect, useRef, useState } from "react";
import { VideoOff, X } from "lucide-react";
import type { RemoteParticipant } from "../../../hooks/useLiveWebRTC";

interface ParticipantStripProps {
  isCameraOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  remoteParticipants?: RemoteParticipant[];
  studentNameMap?: Map<string, string>;
  onClose?: () => void;
}

const ParticipantStrip: React.FC<ParticipantStripProps> = ({
  isCameraOn,
  videoRef,
  remoteParticipants = [],
  studentNameMap = new Map(),
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 학생 참여자 필터링 (role이 student이거나 교수자가 아닌 경우)
  // 디버깅을 위해 로그 출력
  useEffect(() => {
    console.log("[ParticipantStrip] ===== remoteParticipants 분석 =====");
    console.log("[ParticipantStrip] 총 참여자 수:", remoteParticipants.length);
    remoteParticipants.forEach((p, index) => {
      const videoTracks = p.stream?.getVideoTracks() || [];
      const audioTracks = p.stream?.getAudioTracks() || [];
      console.log(`[ParticipantStrip] 참여자 ${index + 1}:`, {
        socketId: p.socketId,
        role: p.role,
        userId: p.userId,
        streamId: p.stream?.id,
        streamExists: !!p.stream,
        videoTracksCount: videoTracks.length,
        audioTracksCount: audioTracks.length,
        videoTracksInfo: videoTracks.map(t => ({
          id: t.id,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      });
    });
  }, [remoteParticipants]);

  const studentParticipants = remoteParticipants.filter(
    (p) => {
      // role이 student이거나, role이 없거나 undefined인 경우 (교수자가 아닌 경우)
      // 교수자는 role이 "professor"로 명확히 설정되어야 함
      const isStudent = p.role === "student" || (p.role !== "professor" && (p.role === undefined || p.role === null));
      const hasVideoTrack = p.stream?.getVideoTracks().length > 0;
      
      if (isStudent) {
        console.log("[ParticipantStrip] 학생으로 필터링됨:", {
          socketId: p.socketId,
          role: p.role,
          userId: p.userId,
          hasVideoTrack: hasVideoTrack,
        });
      }
      
      return isStudent;
    }
  );

  useEffect(() => {
    console.log("[ParticipantStrip] 필터링된 학생 수:", studentParticipants.length);
    if (studentParticipants.length > 0) {
      console.log("[ParticipantStrip] 학생 목록:", studentParticipants.map(p => ({
        socketId: p.socketId,
        userId: p.userId,
        role: p.role,
      })));
    }
  }, [studentParticipants]);

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

  // 학생 참여자 카메라 컴포넌트
  const StudentVideoTile: React.FC<{ participant: RemoteParticipant }> = ({
    participant,
  }) => {
    const studentVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      if (studentVideoRef.current && participant.stream) {
        // 학생의 카메라 스트림 찾기 (화면 공유가 아닌 카메라)
        const videoTracks = participant.stream.getVideoTracks();
        
        // 화면 공유 트랙을 정확히 필터링
        const cameraTrack = videoTracks.find((track) => {
          try {
            const settings = track.getSettings();
            const label = track.label || "";
            const displaySurface = settings.displaySurface;
            const width = settings.width;
            const height = settings.height;
            
            // 화면 공유가 아닌 트랙만 선택
            const isScreen = (
              label.toLowerCase().includes("screen") ||
              label.toLowerCase().includes("화면") ||
              displaySurface === "monitor" ||
              displaySurface === "window" ||
              displaySurface === "browser" ||
              // 일반 카메라보다 큰 해상도면 화면 공유로 간주
              (width && height && width > 1280 && height > 720)
            );
            
            return !isScreen;
          } catch {
            // 예외 발생 시 label만으로 체크
            const label = track.label || "";
            return !label.toLowerCase().includes("screen") && !label.toLowerCase().includes("화면");
          }
        });

        if (cameraTrack && studentVideoRef.current) {
          const cameraStream = new MediaStream([cameraTrack]);
          if (participant.stream.getAudioTracks().length > 0) {
            cameraStream.addTrack(participant.stream.getAudioTracks()[0]);
          }
          studentVideoRef.current.srcObject = cameraStream;
          studentVideoRef.current
            .play()
            .catch((err) => {
              if (err && (err as DOMException).name !== "AbortError") {
                console.warn(
                  "[ParticipantStrip] 학생 비디오 재생 실패:",
                  err
                );
              }
            });
        } else if (studentVideoRef.current && videoTracks.length > 0) {
          // 화면 공유 트랙이 아닌 첫 번째 비디오 트랙 사용
          const nonScreenTrack = videoTracks.find((track) => {
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
              const label = track.label || "";
              return !label.toLowerCase().includes("screen") && !label.toLowerCase().includes("화면");
            }
          });
          
          if (nonScreenTrack) {
            const cameraStream = new MediaStream([nonScreenTrack]);
            if (participant.stream.getAudioTracks().length > 0) {
              cameraStream.addTrack(participant.stream.getAudioTracks()[0]);
            }
            studentVideoRef.current.srcObject = cameraStream;
            studentVideoRef.current
              .play()
              .catch((err) => {
                if (err && (err as DOMException).name !== "AbortError") {
                  console.warn(
                    "[ParticipantStrip] 학생 비디오 재생 실패:",
                    err
                  );
                }
              });
          } else {
            // 모든 트랙이 화면 공유인 경우에도 일단 표시
            studentVideoRef.current.srcObject = participant.stream;
            studentVideoRef.current
              .play()
              .catch((err) => {
                if (err && (err as DOMException).name !== "AbortError") {
                  console.warn(
                    "[ParticipantStrip] 학생 비디오 재생 실패:",
                    err
                  );
                }
              });
          }
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
          {participant.userId && studentNameMap.has(participant.userId)
            ? studentNameMap.get(participant.userId)
            : participant.userId || "학생"}
        </div>
      </div>
    );
  };

  const tiles = [
    {
      id: "professor",
      node: (
        <div className="min-w-[120px] w-28 h-20 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isCameraOn ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
            style={{ transform: "scaleX(-1)" }}
          />
          {!isCameraOn && (
            <div className="absolute inset-0 w-full h-full bg-gray-300 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">
            교수자
          </div>
        </div>
      ),
    },
    // 학생 카메라 추가
    ...studentParticipants.map((participant) => ({
      id: `student-${participant.socketId}`,
      node: <StudentVideoTile key={participant.socketId} participant={participant} />,
    })),
    // 플레이스홀더 (최대 10개까지)
    ...Array.from({ length: Math.max(0, 10 - studentParticipants.length) }).map(
      (_v, idx) => ({
        id: `placeholder-${idx}`,
        node: (
          <div className="min-w-[96px] w-24 h-18 bg-gray-100/70 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200/70">
            <VideoOff className="w-4 h-4 text-gray-300" />
          </div>
        ),
      })
    ),
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

export default ParticipantStrip;
