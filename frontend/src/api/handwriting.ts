import { apiFetch } from "./auth/client";

export interface AnalyzeHandwritingRequest {
  image_data: string; // base64 encoded image (필기만 포함)
  timestamp: number;
  lecture_id: string;
  class_id: number;
  page_number?: number;
  pdf_url?: string; // PDF URL (서버에서 PDF와 필기를 합치기 위해)
}

export interface AnalyzeHandwritingResponse {
  success: boolean;
  message: string;
  page_number?: number;
  file_name?: string;
  text_length?: number;
  is_page_changed?: boolean;
}

export interface SaveHandwritingRequest {
  lecture_id: string;
  class_id: number;
  images: Array<{
    index: number;
    file_path: string;
    page_number: number;
    timestamp: number;
  }>;
}

export interface SaveHandwritingResponse {
  success: boolean;
  message: string;
  saved_count: number;
  pages?: Array<{
    page_number: number;
    image_path: string;
    text: string;
  }>;
}

/**
 * 필기 분석 API 호출
 * base64 이미지를 서버로 전송하여 분석
 */
export async function analyzeHandwriting(
  request: AnalyzeHandwritingRequest
): Promise<AnalyzeHandwritingResponse> {
  return apiFetch<AnalyzeHandwritingResponse>("/api/handwriting/analyze-test", {
    method: "POST",
    json: {
      image_data: request.image_data,
      timestamp: request.timestamp,
      lecture_id: request.lecture_id,
      class_id: request.class_id,
      page_number: request.page_number,
      pdf_url: request.pdf_url,
    },
  });
}

/**
 * 필기 저장 API 호출
 */
export async function saveHandwriting(
  request: SaveHandwritingRequest
): Promise<SaveHandwritingResponse> {
  return apiFetch<SaveHandwritingResponse>("/api/handwriting/save", {
    method: "POST",
    json: request,
  });
}

