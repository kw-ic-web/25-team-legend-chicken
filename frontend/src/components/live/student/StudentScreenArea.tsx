import React, { useEffect, useRef } from "react";
import type { RefObject, MutableRefObject } from "react";
import type { RemoteParticipant } from "../../../hooks/useLiveWebRTC";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  isLive: boolean;
  videoRef: AnyVideoRef;
  statusText?: string;
  remoteParticipants?: RemoteParticipant[];
}

const StudentScreenArea: React.FC<Props> = ({
  isLive,
  videoRef,
  statusText = "방송 대기 중",
  remoteParticipants = [],
}) => {
  const professorCameraRef = useRef<HTMLVideoElement | null>(null);

  // 교수자 카메라 스트림 찾기 및 연결
  useEffect(() => {
    // 모든 교수자 참여자 찾기
    const professorParticipants = remoteParticipants.filter(
      (p) => p.role === "professor"
    );

    if (professorParticipants.length > 0 && professorCameraRef.current) {
      // 교수자의 카메라 스트림 찾기 (화면 공유가 아닌 카메라)
      let cameraStream: MediaStream | null = null;

      for (const participant of professorParticipants) {
        const stream = participant.stream;
        const videoTracks = stream.getVideoTracks();
        
        if (videoTracks.length === 0) continue;

        // 화면 공유 트랙인지 확인
        const hasScreenTrack = videoTracks.some(
          (track) =>
            track.label === "screen" ||
            track.label.includes("screen") ||
            track.label.includes("Screen") ||
            track.getSettings().displaySurface === "monitor" ||
            track.getSettings().displaySurface === "window"
        );

        // 화면 공유 트랙이 없으면 카메라 스트림으로 간주
        if (!hasScreenTrack) {
          cameraStream = stream;
          break;
        }
      }

      // 카메라 스트림을 찾지 못했지만 교수자 스트림이 있으면, 
      // 화면 공유가 아닌 스트림을 찾아서 사용
      if (!cameraStream && professorParticipants.length > 0) {
        for (const participant of professorParticipants) {
          const stream = participant.stream;
          const videoTracks = stream.getVideoTracks();
          
          if (videoTracks.length === 0) continue;

          const hasScreenTrack = videoTracks.some(
            (track) =>
              track.label === "screen" ||
              track.label.includes("screen") ||
              track.label.includes("Screen") ||
              track.getSettings().displaySurface === "monitor" ||
              track.getSettings().displaySurface === "window"
          );

          if (!hasScreenTrack) {
            cameraStream = stream;
            break;
          }
        }
      }

      if (cameraStream && professorCameraRef.current) {
        console.log("[StudentScreenArea] 교수자 카메라 스트림 연결:", cameraStream);
        professorCameraRef.current.srcObject = cameraStream;
        
        // 비디오 재생 보장
        const playVideo = async () => {
          try {
            if (professorCameraRef.current) {
              await professorCameraRef.current.play();
              console.log("[StudentScreenArea] 교수자 카메라 재생 성공");
            }
          } catch (error) {
            console.error("[StudentScreenArea] 교수자 카메라 재생 실패:", error);
          }
        };

        professorCameraRef.current.onloadedmetadata = () => {
          playVideo();
        };

        if (professorCameraRef.current.readyState >= 2) {
          playVideo();
        }
      } else if (professorCameraRef.current) {
        console.log("[StudentScreenArea] 교수자 카메라 스트림 없음");
        professorCameraRef.current.srcObject = null;
      }
    } else if (professorCameraRef.current) {
      professorCameraRef.current.srcObject = null;
    }
  }, [remoteParticipants]);

  return (
    <div className="flex-1 relative px-4 pb-16 pt-4 overflow-hidden">
      <div className="w-full h-full flex items-center justify-center">
        {/* 화면 공유 영역 */}
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
            <span className="absolute inset-0 flex items-center justify-center text-gray-500">
              {statusText}
            </span>
          )}
        </div>
      </div>
      {/* 교수자 카메라를 위에 표시 (교수자 화면처럼) */}
      <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none z-30">
        <div className="inline-flex items-center px-3 py-2 rounded-2xl bg-white/80 backdrop-blur-lg border border-white/40 shadow-lg pointer-events-auto">
          <div className="min-w-[120px] w-28 h-20 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center relative">
            <video
              ref={professorCameraRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {(!professorCameraRef.current?.srcObject || 
              professorCameraRef.current.readyState === 0) && (
              <div className="absolute inset-0 w-full h-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs text-gray-400">카메라 대기 중</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentScreenArea;


