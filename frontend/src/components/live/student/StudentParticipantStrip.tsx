import React from "react";
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

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
        <div className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden">
          {videoRef ? (
            <video
              ref={videoRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">
              강의자
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
            {teacherName}
          </div>
        </div>

        <div className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden border border-blue-200">
          {studentVideoRef && isStudentCameraOn ? (
            <video
              ref={studentVideoRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-300 bg-gray-800">
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

