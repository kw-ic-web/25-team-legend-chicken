import React, { useMemo } from "react";
import type { RefObject, MutableRefObject } from "react";
import type { WebRTCStatus } from "../../../hooks/useLiveWebRTC";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  isLive: boolean;
  videoRef: AnyVideoRef;
  hasPdfOverlay?: boolean;
  statusText?: string;
  connectionStatus?: WebRTCStatus;
  children?: React.ReactNode;
}

const StudentScreenArea: React.FC<Props> = ({
  isLive,
  videoRef,
  hasPdfOverlay = false,
  statusText = "방송 대기 중",
  connectionStatus = "idle",
  children,
}) => {
  const statusBadge = useMemo(() => {
    switch (connectionStatus) {
      case "connecting":
        return {
          label: "연결 중...",
          className: "bg-amber-100 text-amber-700 border border-amber-200",
        };
      case "connected":
        return {
          label: "연결 완료",
          className: "bg-emerald-500 text-white border border-emerald-400",
        };
      case "error":
        return {
          label: "연결 오류",
          className: "bg-red-100 text-red-700 border border-red-200",
        };
      default:
        return null;
    }
  }, [connectionStatus]);

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
          {statusBadge && (
            <div
              className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold shadow ${statusBadge.className}`}
            >
              {statusBadge.label}
            </div>
          )}
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain bg-black ${
              isLive && !hasPdfOverlay ? "visible" : "hidden"
            }`}
          />
          {!isLive && !hasPdfOverlay && (
            <span className="absolute inset-0 flex items-center justify-center text-gray-500">
              {statusText}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default StudentScreenArea;
