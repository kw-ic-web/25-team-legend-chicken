import React, { useCallback, useEffect, useRef, useState } from "react";
import { VideoOff } from "lucide-react";
import type { RemoteParticipant } from "../../../hooks/useLiveWebRTC";

interface ParticipantStripProps {
  isCameraOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  remoteParticipants?: RemoteParticipant[];
}

const ParticipantStrip: React.FC<ParticipantStripProps> = ({
  isCameraOn,
  videoRef,
  remoteParticipants = [],
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // 학생 참여자 카메라 컴포넌트
  const StudentVideoTile: React.FC<{ participant: RemoteParticipant }> = ({
    participant,
  }) => {
    const studentVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      if (studentVideoRef.current && participant.stream) {
        // 학생의 카메라 스트림 찾기 (화면 공유가 아닌 카메라)
        const videoTracks = participant.stream.getVideoTracks();
        const cameraTrack = videoTracks.find(
          (track) => track.kind === "video" && track.label !== "screen"
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
