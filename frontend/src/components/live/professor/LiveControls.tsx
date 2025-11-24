import React from "react";
import {
  FileText,
  Mic,
  MicOff,
  Monitor,
  UserPlus,
  Video,
  VideoOff,
} from "lucide-react";

interface LiveControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isSharing: boolean;
  isPdfSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleShare: () => void;
  onSharePdf: () => void;
  onOpenPersonnel: () => void;
  onEnd: () => void;
}

const LiveControls: React.FC<LiveControlsProps> = ({
  isMicOn,
  isCameraOn,
  isSharing,
  isPdfSharing,
  onToggleMic,
  onToggleCamera,
  onToggleShare,
  onSharePdf,
  onOpenPersonnel,
  onEnd,
}) => {
  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
      <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-xl rounded-3xl px-3 py-2.5 shadow-lg border border-white/30">
        <button
          onClick={onToggleMic}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            isMicOn
              ? "bg-blue-500/10 text-blue-600"
              : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/50"
          }`}
          title={isMicOn ? "마이크 끄기" : "마이크 켜기"}
        >
          {isMicOn ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={onToggleCamera}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            isCameraOn
              ? "bg-blue-500/10 text-blue-600"
              : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/50"
          }`}
          title={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
        >
          {isCameraOn ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={onToggleShare}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            isSharing
              ? "bg-blue-500/10 text-blue-600"
              : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/50"
          }`}
          title={isSharing ? "화면 공유 중지" : "화면 공유 시작"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        <button
          onClick={onSharePdf}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            isPdfSharing
              ? "bg-blue-500/10 text-blue-600"
              : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/50"
          }`}
          title="PDF 공유"
        >
          <FileText className="w-5 h-5" />
        </button>

        <button
          onClick={onOpenPersonnel}
          className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gray-100/50 text-gray-600 hover:bg-gray-200/50 transition-all duration-200"
          title="강의 인원 관리"
        >
          <UserPlus className="w-5 h-5" />
        </button>

        <button
          onClick={onEnd}
          className="h-11 px-4 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all duration-200 shadow-sm"
        >
          방송 종료
        </button>
      </div>
    </div>
  );
};

export default LiveControls;
