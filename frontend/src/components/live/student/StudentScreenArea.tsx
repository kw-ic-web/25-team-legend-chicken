// 변경 전: import React, { RefObject } from "react";
// 변경 후:
import React from "react";
import type { RefObject, MutableRefObject } from "react";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  isLive: boolean;
  videoRef: AnyVideoRef;      // <- 여기 수정
  statusText?: string;
}

const StudentScreenArea: React.FC<Props> = ({
  isLive,
  videoRef,
  statusText = "방송 대기 중",
}) => {
  return (
    <div className="flex-1 p-6 relative">
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="max-w-full rounded-lg border border-gray-200 bg-black flex items-center justify-center overflow-hidden relative"
          style={{
            height: "60vh",
            width: "calc(60vh * 16 / 9)",
            maxHeight: "calc(100% - 3rem)",
            maxWidth: "100%",
          }}
        >
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>} // TS 만족용 캐스팅
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${isLive ? "opacity-100" : "opacity-0"}`}
          />
          {!isLive && (
            <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              {statusText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentScreenArea;


