/**
 * 통일된 교안(Materials) API
 * 페이지별 교안 관리 및 실시간 필기 저장을 위한 API
 */

import { apiFetch } from "./auth/client";

// ==================== 타입 정의 ====================

export type MaterialPage = {
  page_number: number;
  image_path: string;
  pdf_path: string;
  original_pdf_path?: string | null; // 원본 교안 PDF (교안 및 질문 보기용)
  text: string;
  status: "draft" | "finalized";
  createdAt: string;
  updatedAt: string;
};

export type GetMaterialPagesResponse = {
  success: boolean;
  lecture_id: string;
  lecture_name: string;
  class_id: number;
  class_title: string;
  total_pages: number;
  pages: MaterialPage[];
  original_materials: Array<{
    url: string;
    originalName: string;
  }>;
};

export type GetMaterialPageResponse = {
  success: boolean;
  lecture_id: string;
  class_id: number;
  page: MaterialPage;
};

export type GetHandwritingHistoryResponse = {
  success: boolean;
  lecture_id: string;
  class_id: number;
  page_number: number;
  current_page: MaterialPage | null;
  history: Array<MaterialPage & { text_length: number }>;
  total_versions: number;
};

export type UploadMaterialResponse = {
  success: boolean;
  message: string;
  lecture_id: string;
  class_name: string;
  class_id: number;
  class_title: string;
  total_pages: number;
  pages: MaterialPage[];
  original_material: {
    url: string;
    originalName: string;
  };
};

export type SaveHandwritingResponse = {
  success: boolean;
  message: string;
  page_number: number;
  is_writing_increased: boolean;
  previous_text_length: number;
  current_text_length: number;
  similarity: number;
  saved_page: {
    page_number: number;
    image_path: string;
    pdf_path: string;
    text_length: number;
    status: string;
  };
};

// ==================== API 함수 ====================

/**
 * 페이지별 교안 조회
 */
export async function getMaterialPages(
  lectureId: string,
  classId: number,
  status?: "draft" | "finalized"
): Promise<GetMaterialPagesResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const queryParams = status ? `?status=${status}` : "";
  
  return apiFetch<GetMaterialPagesResponse>(
    `/api/lectures/${lectureId}/classes/${classId}/materials/pages${queryParams}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * 특정 페이지의 교안 조회
 */
export async function getMaterialPage(
  lectureId: string,
  classId: number,
  pageNumber: number
): Promise<GetMaterialPageResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetMaterialPageResponse>(
    `/api/lectures/${lectureId}/classes/${classId}/materials/pages/${pageNumber}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * PDF 업로드 및 자동 페이지 분할
 */
export async function uploadMaterial(
  lectureId: string,
  classId: number,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadMaterialResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const formData = new FormData();
  formData.append("pdf", file);

  const { getBaseUrl } = await import("./auth/client");
  const baseUrl = getBaseUrl();
  
  // XMLHttpRequest를 사용하여 진행 상황 추적
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 진행 상황 이벤트 리스너
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error("응답 파싱 실패"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || "PDF 업로드에 실패했습니다."));
        } catch {
          reject(new Error(`PDF 업로드 실패 (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("네트워크 오류가 발생했습니다."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("업로드가 취소되었습니다."));
    });

    xhr.open("POST", `${baseUrl}/api/lectures/${lectureId}/classes/${classId}/materials/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * 특정 페이지의 필기 내역 조회
 */
export async function getHandwritingHistory(
  lectureId: string,
  classId: number,
  pageNumber: number
): Promise<GetHandwritingHistoryResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetHandwritingHistoryResponse>(
    `/api/lectures/${lectureId}/classes/${classId}/materials/pages/${pageNumber}/handwriting`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

/**
 * 페이지별 실시간 필기 저장
 */
export async function saveHandwriting(
  lectureId: string,
  classId: number,
  pageNumber: number,
  imageData: string,
  timestamp: number,
  pdfUrl?: string
): Promise<SaveHandwritingResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<SaveHandwritingResponse>(
    `/api/lectures/${lectureId}/classes/${classId}/materials/pages/${pageNumber}/handwriting`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      json: {
        image_data: imageData,
        timestamp: timestamp,
        pdf_url: pdfUrl,
      },
    }
  );
}

/**
 * 페이지의 draft 필기를 finalized로 변경
 */
export async function finalizePage(
  lectureId: string,
  classId: number,
  pageNumber: number
): Promise<{ success: boolean; message: string; page_number: number; page: MaterialPage }> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch(
    `/api/lectures/${lectureId}/classes/${classId}/materials/pages/${pageNumber}/finalize`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

