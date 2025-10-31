import React from "react";
import { Mic, MicOff, Monitor, UserPlus, Video, VideoOff } from "lucide-react";

interface LiveControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleShare: () => void;
  onOpenPersonnel: () => void;
  onEnd: () => void;
}

const LiveControls: React.FC<LiveControlsProps> = ({
  isMicOn,
  isCameraOn,
  isSharing,
  onToggleMic,
  onToggleCamera,
  onToggleShare,
  onOpenPersonnel,
  onEnd,
}) => {
  return (
    <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleMic}
          className="w-28 h-20 rounded-2xl shadow-sm flex items-center justify-center bg-white"
          title={isMicOn ? "마이크 끄기" : "마이크 켜기"}
        >
          {isMicOn ? (
            <Mic className="w-8 h-8 text-gray-500" />
          ) : (
            <MicOff className="w-8 h-8 text-gray-500" />
          )}
        </button>

        <button
          onClick={onToggleCamera}
          className="w-28 h-20 rounded-2xl shadow-sm flex items-center justify-center bg-white"
          title={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
        >
          {isCameraOn ? (
            <Video className="w-8 h-8 text-gray-500" />
          ) : (
            <VideoOff className="w-8 h-8 text-gray-500" />
          )}
        </button>

        <button
          onClick={onToggleShare}
          className="w-28 h-20 rounded-2xl shadow-sm flex items-center justify-center bg-white"
          title={isSharing ? "화면 공유 중지" : "화면 공유 시작"}
        >
          <Monitor className={`w-8 h-8 ${isSharing ? "text-blue-600" : "text-gray-500"}`} />
        </button>

        <button
          onClick={onOpenPersonnel}
          className="w-28 h-20 rounded-2xl shadow-sm flex items-center justify-center bg-white"
          title="강의 인원 관리"
        >
          <UserPlus className="w-8 h-8 text-gray-500" />
        </button>

        <button
          onClick={onEnd}
          className="h-20 px-8 rounded-2xl shadow-sm bg-red-600 text-white text-lg font-semibold"
        >
          방송 종료
        </button>
      </div>
    </div>
  );
};

export default LiveControls;


