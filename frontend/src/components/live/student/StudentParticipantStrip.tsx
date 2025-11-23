import React, { useEffect, useRef, useMemo } from "react";
import type { RefObject, MutableRefObject } from "react";
import type { RemoteParticipant } from "../../../hooks/useLiveWebRTC";

type AnyVideoRef =
  | RefObject<HTMLVideoElement | null>
  | MutableRefObject<HTMLVideoElement | null>;

interface Props {
  teacherName?: string;
  professorCameraRef?: AnyVideoRef;
  studentVideoRef?: AnyVideoRef;
  isStudentCameraOn?: boolean;
  remoteParticipants?: RemoteParticipant[];
  currentUserId?: string;
  currentUserName?: string;
}

const StudentParticipantStrip: React.FC<Props> = ({
  teacherName = "교수자",
  professorCameraRef,
  studentVideoRef,
  isStudentCameraOn,
  remoteParticipants = [],
  currentUserId,
  currentUserName = "나",
}) => {
  // 교수자 카메라 스트림 찾기 (socketId로 구분)
  const professorParticipant = useMemo(() => {
    return remoteParticipants.find((p) => {
      return p.role === "professor" && p.socketId.includes("-camera");
    });
  }, [remoteParticipants]);

  const otherStudents = useMemo(() => {
    return remoteParticipants.filter((p) => {
      // 학생이어야 하고, 현재 사용자가 아니어야 하며, 카메라 스트림이어야 함 (화면 공유 제외)
      if (p.role !== "student" || p.userId === currentUserId) return false;
      // socketId에 -screen이 포함되어 있으면 제외 (화면 공유는 학생이 보내지 않음)
      if (p.socketId.includes("-screen")) return false;
      return true;
    });
  }, [remoteParticipants, currentUserId]);

  // 동적 학생 비디오 refs 관리
  const studentVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // 교수자 카메라 스트림 연결
  useEffect(() => {
    const videoElement = professorCameraRef
      ? (professorCameraRef as React.RefObject<HTMLVideoElement>).current
      : null;
    
    if (videoElement && professorParticipant?.stream) {
      console.log("[StudentParticipantStrip] Setting professor camera stream");
      videoElement.srcObject = professorParticipant.stream;
      videoElement.play().catch((err) => {
        console.error("[StudentParticipantStrip] Professor camera play error:", err);
      });
    } else if (videoElement) {
      videoElement.srcObject = null;
    }
  }, [professorCameraRef, professorParticipant]);

  // 다른 학생들의 스트림 연결
  useEffect(() => {
    otherStudents.forEach((participant) => {
      const videoElement = studentVideoRefs.current.get(participant.socketId);
      if (videoElement && participant.stream) {
        videoElement.srcObject = participant.stream;
        videoElement.play().catch(console.error);
      }
    });
  }, [otherStudents]);

  // 빈 슬롯 개수 계산 (최대 4개까지 표시)
  const maxSlots = 4;
  const totalSlots = 1 + 1 + otherStudents.length; // 교수자 + 나 + 다른 학생들
  const emptySlots = Math.max(0, maxSlots - totalSlots);

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
        {/* 교수자 카메라 */}
        <div className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden">
          {professorCameraRef && professorParticipant?.stream ? (
            <video
              ref={professorCameraRef as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-300 bg-gray-800">
              강의자
            </div>
          )}
          <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
            {professorParticipant?.userId ? teacherName : "교수자"}
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

        {/* 다른 학생들의 카메라 */}
        {otherStudents.map((participant) => (
          <div
            key={participant.socketId}
            className="flex-none w-28 h-20 rounded-lg bg-gray-900 text-white relative overflow-hidden"
          >
            <video
              ref={(el) => {
                if (el) {
                  studentVideoRefs.current.set(participant.socketId, el);
                } else {
                  studentVideoRefs.current.delete(participant.socketId);
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute left-1 bottom-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
              학생
            </div>
          </div>
        ))}

        {/* 빈 슬롯 */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex-none w-28 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500"
          >
            빈 슬롯
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentParticipantStrip;
