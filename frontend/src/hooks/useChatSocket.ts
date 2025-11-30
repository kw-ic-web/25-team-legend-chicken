import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getBaseUrl } from "../api/auth/client";
import { getChatMessages, type ChatMessage } from "../api/chat";

interface UseChatSocketOptions {
  lectureId?: string;
  classId?: number;
  liveId?: number | null;
  role: "professor" | "student";
  userId?: string;
  enabled?: boolean;
  onMessage?: (message: ChatMessage) => void;
}

export function useChatSocket({
  lectureId,
  classId,
  liveId,
  role,
  userId,
  enabled = true,
  onMessage,
}: UseChatSocketOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageTimeRef = useRef<number>(0);

  // 메시지 전송
  const sendMessage = useCallback(
    async (text: string) => {
      if (isSending || !text.trim() || !socketRef.current?.connected) {
        return;
      }

      const now = Date.now();
      const minInterval = role === "professor" ? 300 : 500;
      if (now - lastMessageTimeRef.current < minInterval) {
        return;
      }

      setIsSending(true);
      lastMessageTimeRef.current = now;

      try {
        socketRef.current.emit("chat:send", { message: text.trim() });
      } catch (error) {
        console.error("메시지 전송 실패:", error);
        throw error;
      } finally {
        setTimeout(() => setIsSending(false), 500);
      }
    },
    [isSending, role]
  );

  // 스크롤을 맨 아래로
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // Socket.io 연결 및 메시지 관리
  useEffect(() => {
    if (!enabled || !lectureId || classId === undefined) {
      return;
    }

    // 기존 메시지 로드
    const loadMessages = async () => {
      try {
        const response = await getChatMessages({
          lecture_id: lectureId,
          class_id: classId,
          live_id: liveId ?? undefined,
          limit: 50,
        });
        setMessages(response.messages || []);
        scrollToBottom();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("404") && !errorMessage.includes("찾을 수 없습니다")) {
          console.warn("채팅 메시지 조회 중 오류:", errorMessage);
        }
      }
    };

    loadMessages();

    // Socket.io 연결
    const baseUrl = getBaseUrl();
    const token = localStorage.getItem("lecq.token");
    const socket = io(baseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    // 연결 성공 시 룸 입장
    const handleConnect = () => {
      socket.emit("live:join", {
        lecture_id: lectureId,
        class_id: classId,
        live_id: liveId ?? null,
        role,
        user_id: userId,
      });
    };

    socket.on("connect", handleConnect);

    // 재연결 시 룸 재입장
    socket.on("reconnect", () => {
      handleConnect();
    });

    // 메시지 수신
    const handleChatMessage = (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });
      scrollToBottom();
      onMessage?.(message);
    };

    socket.on("chat:message", handleChatMessage);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("reconnect", handleConnect);
      socket.off("chat:message", handleChatMessage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, lectureId, classId, liveId, role, userId, scrollToBottom, onMessage]);

  return {
    messages,
    sendMessage,
    isSending,
    socket: socketRef.current,
    containerRef,
  };
}

