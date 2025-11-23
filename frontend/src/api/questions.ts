import { apiFetch } from "./auth/client";

export interface QuestionPosition {
  x: number;
  y: number;
}

export interface QuestionAuthor {
  id: string;
  name: string;
  role: string;
}

export interface QuestionMetadata {
  source?: string;
  device?: string;
  language?: string;
  [key: string]: unknown;
}

export interface Question {
  _id: string;
  lecture_id: string;
  class_id: number;
  live_id?: number | null;
  page: number;
  section?: string;
  position: QuestionPosition;
  timestamp: string;
  type?: string;
  author: QuestionAuthor;
  text: string;
  answer?: string | null; // GPT 답변 또는 교수자 답변
  metadata?: QuestionMetadata;
  upvote_count?: number;
  upvoted_by?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateQuestionRequest {
  lecture_id: string;
  class_id: number;
  page: number;
  section?: string;
  position: QuestionPosition;
  timestamp: string;
  type?: string;
  author?: QuestionAuthor;
  text: string;
  metadata?: QuestionMetadata;
}

export interface CreateQuestionResponse {
  message: string;
  question: Question;
}

export interface GetQuestionsResponse {
  lecture_id: string;
  class_id?: number;
  count?: number;
  questions: Question[];
}

export interface UpdateQuestionAnswerRequest {
  answer: string;
}

export interface UpdateQuestionAnswerResponse {
  message: string;
  question: Question;
}

export interface UpvoteQuestionResponse {
  message: string;
  upvoted: boolean;
  upvote_count: number;
}

// 질문 생성
export async function createQuestion(
  request: CreateQuestionRequest
): Promise<CreateQuestionResponse> {
  return apiFetch<CreateQuestionResponse>("/api/questions", {
    method: "POST",
    json: request,
  });
}

// 질문 목록 조회
export async function getQuestions(
  lectureId: string,
  classId?: number,
  page?: number,
  limit?: number
): Promise<GetQuestionsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set("lecture_id", lectureId);
  if (classId !== undefined) {
    queryParams.set("class_id", String(classId));
  }
  if (page !== undefined) {
    queryParams.set("page", String(page));
  }
  if (limit !== undefined) {
    queryParams.set("limit", String(limit));
  }

  return apiFetch<GetQuestionsResponse>(
    `/api/questions/list?${queryParams.toString()}`
  );
}

// 특정 강좌/클래스의 질문 조회
export async function getClassQuestions(
  lectureId: string,
  classId: number,
  page?: number,
  limit?: number
): Promise<GetQuestionsResponse> {
  const queryParams = new URLSearchParams();
  if (page !== undefined) {
    queryParams.set("page", String(page));
  }
  if (limit !== undefined) {
    queryParams.set("limit", String(limit));
  }

  return apiFetch<GetQuestionsResponse>(
    `/api/questions/lectures/${lectureId}/classes/${classId}?${queryParams.toString()}`
  );
}

// 질문 답변 업데이트 (교수자 대댓글)
export async function updateQuestionAnswer(
  questionId: string,
  answer: string
): Promise<UpdateQuestionAnswerResponse> {
  return apiFetch<UpdateQuestionAnswerResponse>(
    `/api/questions/${questionId}/answer`,
    {
      method: "POST",
      json: { answer },
    }
  );
}

// 질문 좋아요 토글
export async function upvoteQuestion(
  questionId: string
): Promise<UpvoteQuestionResponse> {
  return apiFetch<UpvoteQuestionResponse>(
    `/api/questions/${questionId}/upvote`,
    {
      method: "POST",
    }
  );
}

