import React, { useMemo } from "react";
import {
  type RemoteParticipant,
  type WebRTCStatus,
} from "../../../hooks/useLiveWebRTC";

interface ScreenShareAreaProps {
  children?: React.ReactNode;
  isSharing: boolean;
  hasPdfOverlay?: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  connectionStatus?: WebRTCStatus;
  remoteParticipants?: RemoteParticipant[];
}

const ScreenShareArea: React.FC<ScreenShareAreaProps> = ({
  children,
  isSharing,
  hasPdfOverlay = false,
  videoRef,
  connectionStatus = "idle",
  remoteParticipants = [],
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
            muted
            playsInline
            className={`w-full h-full object-contain bg-black ${
              isSharing && !hasPdfOverlay ? "visible" : "hidden"
            }`}
          />
          {!isSharing && !hasPdfOverlay && (
            <span className="absolute inset-0 flex items-center justify-center text-gray-500">
              화면 공유 영역
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default ScreenShareArea;
