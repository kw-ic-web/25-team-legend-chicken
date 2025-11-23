import React, { useEffect, useState } from "react";
import type { RefObject, MutableRefObject } from "react";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  isLive: boolean;
  videoRef: AnyVideoRef;
  statusText?: string;
}

const StudentScreenArea: React.FC<Props> = ({
  isLive,
  videoRef,
  statusText = "방송 대기 중",
}) => {
  const [streamInfo, setStreamInfo] = useState<string>("");

  // 공유된 화면 스트림 상태 확인
  useEffect(() => {
    const checkStream = () => {
      const videoElement = (videoRef as RefObject<HTMLVideoElement>).current;
      if (videoElement) {
        if (videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();
          const trackLabels = videoTracks.map(t => t.label).join(", ");
          setStreamInfo(
            `스트림 있음 (비디오: ${videoTracks.length}, 오디오: ${audioTracks.length}) ${trackLabels}`
          );
        } else {
          setStreamInfo("srcObject 없음");
        }
      } else {
        setStreamInfo("videoElement 없음");
      }
    };

    checkStream();
    const interval = setInterval(checkStream, 500);

    return () => clearInterval(interval);
  }, [videoRef]);

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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <div>{statusText}</div>
              <div className="text-xs text-gray-400 mt-2">{streamInfo}</div>
            </div>
          )}
          {isLive && (
            <div className="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-1 rounded">
              {streamInfo || "스트림 정보 없음"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentScreenArea;


