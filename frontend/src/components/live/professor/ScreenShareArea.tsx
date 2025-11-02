import React from "react";

interface ScreenShareAreaProps {
  children?: React.ReactNode;
  isSharing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const ScreenShareArea: React.FC<ScreenShareAreaProps> = ({
  children,
  isSharing,
  videoRef,
}) => {
  return (
    <div className="flex-1 p-6 relative">
      <div className="w-full h-full flex items-center justify-center">
        {/* 화면 공유 영역 - 16:9 비율 고정 */}
        <div className="w-full max-w-full aspect-video rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden relative">
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-contain bg-black ${isSharing ? "visible" : "hidden"}`}
          />
          {!isSharing && (
            <span className="absolute inset-0 flex items-center justify-center text-gray-500">
              화면 공유 영역
            </span>
          )}
          {isSharing && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-sm z-10">
              공유 중
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default ScreenShareArea;
