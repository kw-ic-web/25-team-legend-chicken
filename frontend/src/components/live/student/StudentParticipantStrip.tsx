import React, { useEffect, useState, useRef } from "react";
import { VideoOff } from "lucide-react";
import type { RefObject, MutableRefObject } from "react";
import { useAuth } from "../../../contexts/AuthContext";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  teacherName?: string;
  professorCameraRef?: AnyVideoRef;
  studentVideoRef?: AnyVideoRef;
  isStudentCameraOn?: boolean;
  remoteParticipants?: Array<{
    socketId: string;
    userId?: string;
    role?: string;
    stream: MediaStream;
  }>;
}

const StudentParticipantStrip: React.FC<Props> = ({
  teacherName = "교수자",
  professorCameraRef,
  studentVideoRef,
  isStudentCameraOn,
  remoteParticipants = [],
}) => {
  const { user } = useAuth();
  const [hasProfessorVideo, setHasProfessorVideo] = useState(false);
  const currentUserName = user?.name || "나";

  // 교수자 비디오 스트림 상태 확인
  useEffect(() => {
    if (!professorCameraRef) {
      setHasProfessorVideo(false);
      return;
    }

    const checkVideo = () => {
      const videoElement = (professorCameraRef as RefObject<HTMLVideoElement>).current;
      if (videoElement) {
        if (videoElement.srcObject) {
          setHasProfessorVideo(true);
        } else {
          setHasProfessorVideo(false);
        }
      } else {
        setHasProfessorVideo(false);
      }
    };

    checkVideo();
    const interval = setInterval(checkVideo, 500);

    return () => clearInterval(interval);
  }, [professorCameraRef]);

  // 학생 참여자 필터링 (role이 student인 것만)
  const studentParticipants = remoteParticipants.filter(
    (p) => p.role === "student"
  );

  // 학생 비디오 타일 컴포넌트
  const StudentVideoTile: React.FC<{ participant: typeof remoteParticipants[0] }> = ({
    participant,
  }) => {
    const studentVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      if (studentVideoRef.current && participant.stream) {
        // 학생의 카메라 스트림 찾기 (화면 공유가 아닌 카메라)
        const videoTracks = participant.stream.getVideoTracks();
        const cameraTrack = videoTracks.find(
          (track) => {
            try {
              const settings = track.getSettings();
              const label = track.label || "";
              const displaySurface = settings.displaySurface;
              const isScreen = (
                label.toLowerCase().includes("screen") ||
                label.toLowerCase().includes("화면") ||
                displaySurface === "monitor" ||
                displaySurface === "window" ||
                displaySurface === "browser"
              );
              return !isScreen;
            } catch {
              return !track.label?.toLowerCase().includes("screen");
            }
          }
        );

        if (cameraTrack && studentVideoRef.current) {
          const cameraStream = new MediaStream([cameraTrack]);
          if (participant.stream.getAudioTracks().length > 0) {
            cameraStream.addTrack(participant.stream.getAudioTracks()[0]);
          }
          studentVideoRef.current.srcObject = cameraStream;
          studentVideoRef.current.play().catch(console.error);
        } else if (studentVideoRef.current && videoTracks.length > 0) {
          studentVideoRef.current.srcObject = participant.stream;
          studentVideoRef.current.play().catch(console.error);
        }
      }
    }, [participant.stream]);

    const hasVideo = studentVideoRef.current?.srcObject !== null;

    return (
      <div className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden">
        <video
          ref={studentVideoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            hasVideo ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        />
        {!hasVideo && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center text-xs text-gray-300 bg-gray-800">
            <VideoOff className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded z-20">
          {participant.userId || "학생"}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
        {/* 교수자 카메라 */}
        <div className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden">
          {professorCameraRef && (
            <video
              ref={professorCameraRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          {!hasProfessorVideo && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center text-xs text-gray-300 bg-gray-800 z-10">
              <div>강의자</div>
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded z-20">
            {teacherName}
          </div>
        </div>

        {/* 내 카메라 */}
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
            {currentUserName}
          </div>
        </div>

        {studentParticipants.map((participant) => (
          <StudentVideoTile key={participant.socketId} participant={participant} />
        ))}
      </div>
    </div>
  );
};

export default StudentParticipantStrip;
