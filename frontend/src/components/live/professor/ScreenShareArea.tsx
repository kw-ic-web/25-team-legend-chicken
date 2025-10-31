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
      <div className="w-full h-full rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
        {isSharing ? (
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <span className="text-gray-500">화면 공유 영역</span>
        )}
      </div>
      {children}
    </div>
  );
};

export default ScreenShareArea;
