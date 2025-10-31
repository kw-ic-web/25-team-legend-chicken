import React from "react";
import { VideoOff } from "lucide-react";

interface ParticipantStripProps {
  isCameraOn: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const ParticipantStrip: React.FC<ParticipantStripProps> = ({
  isCameraOn,
  videoRef,
}) => {
  return (
    <div className="px-6 py-3 border-b border-gray-200">
      <div className="flex items-center space-x-3 overflow-x-auto">
        {/* 교수자 타일 */}
        <div className="min-w-[160px] w-40 h-28 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
          {isCameraOn ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        {/* 참가자 플레이스홀더 타일들 */}
        {[1, 2, 3, 4, 5, 6].map((id) => (
          <div
            key={id}
            className="min-w-[160px] w-40 h-28 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border"
          >
            <VideoOff className="w-6 h-6 text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantStrip;
