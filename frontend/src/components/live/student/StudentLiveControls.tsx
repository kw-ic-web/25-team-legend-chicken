import React from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

interface Props {
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}

const StudentLiveControls: React.FC<Props> = ({
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
}) => {
  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
      <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-xl rounded-3xl px-3 py-2.5 shadow-lg border border-white/30 pointer-events-auto">
        <button
          onClick={onToggleMic}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 ${
            isMicOn
              ? "bg-blue-500/10 text-blue-600"
              : "bg-gray-100/50 text-gray-600 hover:bg-gray-200/50"
          }`}
          title={isMicOn ? "마이크 끄기" : "마이크 켜기"}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
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
          {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default StudentLiveControls;

