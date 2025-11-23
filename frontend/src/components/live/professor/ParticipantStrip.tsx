import React, { useCallback, useEffect, useRef, useState } from "react";
import { VideoOff } from "lucide-react";
import type { RemoteParticipant } from "../../../hooks/useLiveWebRTC";

interface ParticipantStripProps {
  isCameraOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  remoteParticipants?: RemoteParticipant[];
  currentUserId?: string;
}

const ParticipantStrip: React.FC<ParticipantStripProps> = ({
  isCameraOn,
  videoRef,
  remoteParticipants = [],
  currentUserId,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 학생들만 필터링 (교수자 자신 제외, 화면 공유 제외)
  const studentParticipants = remoteParticipants.filter((p) => {
    if (p.role !== "student" || p.userId === currentUserId) return false;
    // socketId에 -screen이 포함되어 있으면 제외 (화면 공유는 학생이 보내지 않음)
    if (p.socketId.includes("-screen")) return false;
    return true;
  });

  // 동적 학생 비디오 refs 관리
  const studentVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // 학생들의 스트림 연결
  useEffect(() => {
    studentParticipants.forEach((participant) => {
      const videoElement = studentVideoRefs.current.get(participant.socketId);
      if (videoElement && participant.stream) {
        videoElement.srcObject = participant.stream;
        videoElement.play().catch(console.error);
      }
    });
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

  // 교수자 자신의 카메라
  const professorTile = {
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
          나
        </div>
      </div>
    ),
  };

  // 학생들의 카메라
  const studentTiles = studentParticipants.map((participant) => ({
    id: participant.socketId,
    node: (
      <div className="min-w-[96px] w-24 h-18 bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center relative">
        <video
          ref={(el) => {
            if (el) {
              studentVideoRefs.current.set(participant.socketId, el);
            } else {
              studentVideoRefs.current.delete(participant.socketId);
            }
          }}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">
          학생
        </div>
      </div>
    ),
  }));

  // 빈 슬롯 (최대 10개까지)
  const maxSlots = 10;
  const totalSlots = 1 + studentParticipants.length; // 교수자 + 학생들
  const emptySlots = Math.max(0, maxSlots - totalSlots);
  const emptyTiles = Array.from({ length: emptySlots }).map((_, idx) => ({
    id: `placeholder-${idx}`,
    node: (
      <div className="min-w-[96px] w-24 h-18 bg-gray-100/70 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200/70">
        <VideoOff className="w-4 h-4 text-gray-300" />
      </div>
    ),
  }));

  const tiles = [professorTile, ...studentTiles, ...emptyTiles];

  return (
    <div className="pointer-events-none">
      <div className="inline-flex items-center px-3 py-2 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/40 shadow-lg pointer-events-auto relative">
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
