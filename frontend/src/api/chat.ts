import { apiFetch } from "./auth/client";

export interface ChatMessage {
  _id: string;
  lecture_id: string;
  class_id: number;
  live_id: number | null;
  text: string;
  sender: {
    id: string;
    name: string;
    role: "student" | "professor" | "assistant" | "guest";
  };
  timestamp: string;
  created_at: string;
  like_count?: number;
  liked_by?: string[];
}

export interface SendChatMessageRequest {
  lecture_id: string;
  class_id: number;
  live_id?: number | null;
  text: string;
  meta?: Record<string, unknown>;
}

export interface SendChatMessageResponse {
  message: string;
  data: ChatMessage;
}

export interface GetChatMessagesResponse {
  count: number;
  messages: ChatMessage[];
}

export interface GetChatMessagesParams {
  lecture_id: string;
  class_id: number;
  live_id?: number | null;
  limit?: number;
  before?: string;
  since?: string;
}

// 채팅 메시지 전송
export async function sendChatMessage(
  request: SendChatMessageRequest
): Promise<SendChatMessageResponse> {
  return apiFetch<SendChatMessageResponse>("/api/chat", {
    method: "POST",
    json: request,
  });
}

// 채팅 메시지 조회
export async function getChatMessages(
  params: GetChatMessagesParams
): Promise<GetChatMessagesResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set("lecture_id", params.lecture_id);
  queryParams.set("class_id", String(params.class_id));
  if (params.live_id !== undefined && params.live_id !== null) {
    queryParams.set("live_id", String(params.live_id));
  }
  if (params.limit) {
    queryParams.set("limit", String(params.limit));
  }
  if (params.before) {
    queryParams.set("before", params.before);
  }
  if (params.since) {
    queryParams.set("since", params.since);
  }

  return apiFetch<GetChatMessagesResponse>(
    `/api/chat?${queryParams.toString()}`
  );
}

// 채팅 메시지 좋아요 토글
export async function toggleChatMessageUpvote(
  messageId: string
): Promise<{ message: string; like_count: number; liked: boolean }> {
  return apiFetch(`/api/chat/${messageId}/upvote`, {
    method: "POST",
  });
}

// 채팅 메시지 삭제
export async function deleteChatMessage(
  messageId: string
): Promise<{ message: string }> {
  return apiFetch(`/api/chat/${messageId}`, {
    method: "DELETE",
  });
}

