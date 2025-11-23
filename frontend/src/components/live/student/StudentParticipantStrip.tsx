import React, { useEffect, useState } from "react";
import type { RefObject, MutableRefObject } from "react";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  teacherName?: string;
  videoRef?: AnyVideoRef;
  studentVideoRef?: AnyVideoRef;
  isStudentCameraOn?: boolean;
}

const StudentParticipantStrip: React.FC<Props> = ({
  teacherName = "교수자",
  videoRef,
  studentVideoRef,
  isStudentCameraOn,
}) => {
  const placeholders = Array.from({ length: 4 }).map((_, i) => i);
  const [hasProfessorVideo, setHasProfessorVideo] = useState(false);
  const [professorStreamInfo, setProfessorStreamInfo] = useState<string>("");

  // 교수자 비디오 스트림 상태 확인
  useEffect(() => {
    if (!videoRef) {
      setHasProfessorVideo(false);
      setProfessorStreamInfo("videoRef 없음");
      return;
    }

    const checkVideo = () => {
      const videoElement = (videoRef as RefObject<HTMLVideoElement>).current;
      if (videoElement) {
        if (videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks();
          setHasProfessorVideo(true);
          setProfessorStreamInfo(
            `스트림 있음 (비디오: ${videoTracks.length}, 오디오: ${audioTracks.length})`
          );
        } else {
          setHasProfessorVideo(false);
          setProfessorStreamInfo("srcObject 없음");
        }
      } else {
        setHasProfessorVideo(false);
        setProfessorStreamInfo("videoElement 없음");
      }
    };

    checkVideo();
    const interval = setInterval(checkVideo, 500);

    return () => clearInterval(interval);
  }, [videoRef]);

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
        <div className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden">
          {videoRef && (
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          {!hasProfessorVideo && (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-xs text-gray-300 bg-gray-800 z-10">
              <div>강의자</div>
              <div className="text-[10px] text-gray-400 mt-1">{professorStreamInfo}</div>
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded z-20">
            {teacherName}
          </div>
        </div>

        <div className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden border border-blue-200">
          <video
            ref={studentVideoRef as React.RefObject<HTMLVideoElement>}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isStudentCameraOn ? "opacity-100" : "opacity-0"
            }`}
          />
          {!isStudentCameraOn && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 bg-gray-800">
              내 화면
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
            나
          </div>
        </div>

        {placeholders.map((i) => (
          <div
            key={i}
            className="flex-none w-28 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500"
          >
            학생 {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentParticipantStrip;

