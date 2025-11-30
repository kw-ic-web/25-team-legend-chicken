import React from "react";
import type { RefObject, MutableRefObject } from "react";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  isLive: boolean;
  videoRef: AnyVideoRef;
  statusText?: string;
  children?: React.ReactNode;
}

const StudentScreenArea: React.FC<Props> = ({
  isLive,
  videoRef,
  statusText = "방송 대기 중",
  children,
}) => {
  return (
    <div className="flex-1 relative px-4 pb-16 pt-4 overflow-hidden">
      <div className="w-full h-full flex items-center justify-center">
        {/* 화면 공유 영역 - 16:9 비율 고정, 높이 우선 제한 */}
        <div
          className="w-full max-w-5xl max-h-full aspect-video rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden relative shadow-lg"
          style={{
            maxHeight: "100%",
          }}
        >
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain bg-black ${isLive ? "visible" : "hidden"}`}
          />
          {!isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <div>{statusText}</div>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default StudentScreenArea;


