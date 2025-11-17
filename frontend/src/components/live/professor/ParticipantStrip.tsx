import React, { useEffect, useRef, useState } from "react";
import { VideoOff } from "lucide-react";

interface ParticipantStripProps {
  isCameraOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const ParticipantStrip: React.FC<ParticipantStripProps> = ({
  isCameraOn,
  videoRef,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollLeft, clientWidth, scrollWidth } = container;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollByDelta = (delta: number) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({ left: delta, behavior: "smooth" });
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
        </div>
      ),
    },
    ...Array.from({ length: 10 }).map((_v, idx) => ({
      id: `placeholder-${idx}`,
      node: (
        <div className="min-w-[96px] w-24 h-18 bg-gray-100/70 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200/70">
          <VideoOff className="w-4 h-4 text-gray-300" />
        </div>
      ),
    })),
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
