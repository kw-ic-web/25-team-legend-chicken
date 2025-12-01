import React from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "../../../api/chat";

interface ChatPanelProps {
  messages: ChatMessage[];
  currentMessage: string;
  onMessageChange: (message: string) => void;
  onSend: () => void;
  isSending: boolean;
  currentUserId?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentMessage,
  onMessageChange,
  onSend,
  isSending,
  currentUserId,
  containerRef,
}) => {
  const formatTime = (timestamp: string | Date) => {
    const time = new Date(timestamp);
    return `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto" ref={containerRef}>
        <div className="p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              채팅 메시지가 없습니다.
            </div>
          ) : (
            messages.map((msg) => {
              const isProfessor =
                msg.sender.role === "professor" ||
                msg.sender.role === "assistant";
              const isOwnMessage = msg.sender.id === currentUserId;
              const timeStr = formatTime(msg.timestamp || msg.created_at);

              return (
                <div
                  key={msg._id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-2 ${
                      isOwnMessage
                        ? "bg-blue-600 text-white"
                        : isProfessor
                          ? "bg-green-100 text-gray-900"
                          : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium ${
                          isOwnMessage
                            ? "text-blue-100"
                            : isProfessor
                              ? "text-green-700"
                              : "text-gray-600"
                        }`}
                      >
                        {isOwnMessage
                          ? "나"
                          : isProfessor
                            ? "교수자"
                            : msg.sender.name}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isOwnMessage ? "text-blue-200" : "text-gray-500"
                        }`}
                      >
                        {timeStr}
                      </span>
                    </div>
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="채팅 입력 (Enter)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                if (!isSending) {
                  onSend();
                }
              }
            }}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isSending) {
                onSend();
              }
            }}
            disabled={isSending}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
