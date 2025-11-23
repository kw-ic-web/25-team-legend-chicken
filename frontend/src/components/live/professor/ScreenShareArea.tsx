import React, { useEffect, useMemo, useRef } from "react";
import {
  type RemoteParticipant,
  type WebRTCStatus,
} from "../../../hooks/useLiveWebRTC";

interface ScreenShareAreaProps {
  children?: React.ReactNode;
  isSharing: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  connectionStatus?: WebRTCStatus;
  remoteParticipants?: RemoteParticipant[];
}

const ScreenShareArea: React.FC<ScreenShareAreaProps> = ({
  children,
  isSharing,
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
        return {
          label: "대기 중",
          className: "bg-gray-100 text-gray-600 border border-gray-200",
        };
    }
  }, [connectionStatus]);

  const previewParticipants = remoteParticipants.slice(0, 3);

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
            muted
            playsInline
            className={`w-full h-full object-contain bg-black ${isSharing ? "visible" : "hidden"}`}
          />
          {!isSharing && (
            <span className="absolute inset-0 flex items-center justify-center text-gray-500">
              화면 공유 영역
            </span>
          )}
          {!!previewParticipants.length && (
            <div className="absolute bottom-4 right-4 flex items-center space-x-2 z-20">
              {previewParticipants.map((participant) => (
                <RemoteStreamPreview
                  key={participant.socketId}
                  participant={participant}
                />
              ))}
              {remoteParticipants.length > previewParticipants.length && (
                <div className="w-12 h-20 rounded-lg bg-black/60 text-white text-xs font-semibold flex items-center justify-center border border-white/10">
                  +{remoteParticipants.length - previewParticipants.length}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

const RemoteStreamPreview: React.FC<{ participant: RemoteParticipant }> = ({
  participant,
}) => {
  const previewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (
      previewRef.current &&
      previewRef.current.srcObject !== participant.stream
    ) {
      previewRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="w-28 h-20 rounded-lg overflow-hidden bg-black/70 border border-white/10 shadow-lg relative">
      <video
        ref={previewRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover opacity-90"
      />
      <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white/90 font-medium truncate">
        {participant.role === "professor"
          ? "교수자"
          : participant.userId || `참여자 ${participant.socketId.slice(-4)}`}
      </span>
    </div>
  );
};

export default ScreenShareArea;
