import { apiFetch, getBaseUrl } from "../auth/client";

export type InviteStudentRequest = {
  student_email: string;
};

export type InviteStudentResponse = {
  message: string;
  student: {
    id: string;
    name: string;
    email: string;
  };
  current_count: number;
  max_count: number;
};

export type LectureClass = {
  id: number;
  title: string;
  description: string;
  date: string;
  materials: string[];
};

export type LectureReference = {
  title: string;
  author: string;
  publisher: string;
};

export type Lecture = {
  lecture_id: string;
  name: string;
  schedule: string;
  student_count: number;
  thumbnail?: string;
  professor_name: string;
  professor_email: string;
  professor_phone: string;
  lecture_description: string;
  learning_method: string;
  target_audience: string;
  references: LectureReference[];
  classes: LectureClass[];
  professor_id: string;
  student_id_list: string[];
};

export type GetLecturesResponse = {
  lectures: Lecture[];
};

export async function inviteStudent(
  lectureId: string,
  payload: InviteStudentRequest
): Promise<InviteStudentResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<InviteStudentResponse>(
    `/api/professor/lectures/${lectureId}/invite_student`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: payload,
    }
  );
}

export async function getLectures(): Promise<GetLecturesResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetLecturesResponse>("/api/professor/lectures/search", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export type GetClassesResponse = {
  lecture_id: string;
  lecture_name: string;
  classes: LectureClass[];
};

export async function getClasses(
  lectureId: string
): Promise<GetClassesResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetClassesResponse>(
    `/api/professor/lectures/${lectureId}/classes`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type GetClassDetailResponse = {
  lecture_id: string;
  lecture_name: string;
  class: LectureClass;
};

export async function getClassDetail(
  lectureId: string,
  classId: number
): Promise<GetClassDetailResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetClassDetailResponse>(
    `/api/professor/lectures/${lectureId}/classes/${classId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type AddClassRequest = {
  title: string;
  description: string;
  date: string;
  materials?: string[];
};

export type AddClassResponse = {
  message: string;
  lecture_id: string;
  class: LectureClass;
};

export async function addLectureClass(
  lectureId: string,
  payload: AddClassRequest
): Promise<AddClassResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<AddClassResponse>(
    `/api/professor/lectures/${lectureId}/classes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: payload,
    }
  );
}

export type UpdateClassesPayload = {
  classes: Array<{
    id: number;
    title: string;
    description: string;
    date: string;
    materials: string[];
  }>;
};

export type UpdateClassesResponse = {
  message: string;
  lecture_id: string;
  classes: LectureClass[];
};

export async function updateLectureClasses(
  lectureId: string,
  payload: UpdateClassesPayload
): Promise<UpdateClassesResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<UpdateClassesResponse>(
    `/api/professor/lectures/${lectureId}/classes`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      json: payload,
    }
  );
}

export type DeleteClassResponse = {
  message: string;
  lecture_id: string;
  deleted_class: LectureClass;
};

export async function deleteLectureClass(
  lectureId: string,
  classId: number
): Promise<DeleteClassResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<DeleteClassResponse>(
    `/api/professor/lectures/${lectureId}/classes/${classId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type GetClassPdfsResponse = {
  lecture_id: string;
  lecture_name: string;
  class_id: number;
  class_title: string;
  pdf_count: number;
  pdfs: Array<string | { url: string; originalName: string }>;
};

/**
 * @deprecated 통일된 API인 getMaterialPages를 사용하세요.
 * 하위 호환성을 위해 유지됩니다.
 */
export async function getClassPdfs(
  lectureId: string,
  classId: number
): Promise<GetClassPdfsResponse> {
  // 통일된 API 사용
  const { getMaterialPages } = await import("../materials");
  
  try {
    const response = await getMaterialPages(lectureId, classId, "finalized");
    
    // 기존 응답 형식으로 변환 (하위 호환성)
    return {
      lecture_id: response.lecture_id,
      lecture_name: response.lecture_name,
      class_id: response.class_id,
      class_title: response.class_title,
      pdf_count: response.total_pages,
      pdfs: response.original_materials.map((m) => ({
        url: m.url,
        originalName: m.originalName,
      })),
    };
  } catch (error) {
    // 404 에러는 PDF가 없는 경우이므로 조용히 처리
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("404") || errorMessage.includes("찾을 수 없습니다")) {
      // 빈 응답 반환
      return {
        lecture_id: lectureId,
        lecture_name: "",
        class_id: classId,
        class_title: "",
        pdf_count: 0,
        pdfs: [],
      };
    }
    // 다른 에러는 그대로 throw
    throw error;
  }
}

export type Student = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type GetMembersResponse = {
  lecture_id: string;
  lecture_name: string;
  student_count: number;
  max_students: number;
  students: Student[];
  invite_link: string;
};

export async function getMembers(
  lectureId: string
): Promise<GetMembersResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetMembersResponse>(
    `/api/professor/lectures/${lectureId}/check_member`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type CreateLectureRequest = {
  name: string;
  schedule: string;
  student_count: number;
  professor_name: string;
  professor_email: string;
  professor_phone: string;
  lecture_description: string;
  learning_method?: string;
  target_audience?: string;
  references?: LectureReference[];
  classes?: LectureClass[];
  thumbnail?: File | null;
};

export type CreateLectureResponse = {
  message: string;
  lecture: Lecture;
};

export async function createLecture(
  payload: CreateLectureRequest
): Promise<CreateLectureResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("schedule", payload.schedule);
  formData.append("student_count", payload.student_count.toString());
  formData.append("professor_name", payload.professor_name);
  formData.append("professor_email", payload.professor_email);
  formData.append("professor_phone", payload.professor_phone);
  formData.append("lecture_description", payload.lecture_description);

  if (payload.learning_method) {
    formData.append("learning_method", payload.learning_method);
  }
  if (payload.target_audience) {
    formData.append("target_audience", payload.target_audience);
  }
  if (payload.references) {
    formData.append("references", JSON.stringify(payload.references));
  }
  if (payload.classes) {
    formData.append("classes", JSON.stringify(payload.classes));
  }
  if (payload.thumbnail) {
    formData.append("thumbnail", payload.thumbnail);
  }

  return apiFetch<CreateLectureResponse>("/api/professor/lectures/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

export type LiveStatusClass = {
  class_id: number;
  class_title: string;
  isLiveActive: boolean;
  currentLiveId?: number | null;
  lives: Array<{
    liveId: number;
    status: string;
    startedAt: string;
    endedAt: string | null;
  }>;
};

export type LiveStatusResponse = {
  lecture_id: string;
  lecture_name: string;
  classes: LiveStatusClass[];
};

export type ClassQuestionPosition = {
  x: number;
  y: number;
};

export type ClassQuestionAuthor = {
  id?: string;
  name?: string;
};

export type ClassQuestion = {
  _id: string;
  lecture_id: string;
  class_id: number;
  live_id?: number | null;
  page?: number;
  section?: string;
  position?: ClassQuestionPosition;
  timestamp: string;
  type?: string;
  author?: ClassQuestionAuthor;
  text: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

export type GetClassQuestionsResponse = {
  lecture_id: string;
  class_id: number;
  count: number;
  questions: ClassQuestion[];
};

export type MyInfoUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  user_type: string;
  profile_image?: string;
};

export type MyInfoResponse = {
  success: boolean;
  user: MyInfoUser;
};

export async function getLiveStatus(
  lectureId: string
): Promise<LiveStatusResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<LiveStatusResponse>(
    `/api/professor/lectures/${lectureId}/live-status`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type LiveActionResponse = {
  message: string;
  lecture_id: string;
  class_id: number;
  live_id: number;
  started_at: string;
  ended_at?: string | null;
  live_path?: string;
};

export async function startLive(
  lectureId: string,
  classId: number
): Promise<LiveActionResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<LiveActionResponse>(
    `/api/professor/lectures/${lectureId}/classes/${classId}/live/start`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function endLive(
  lectureId: string,
  classId: number
): Promise<LiveActionResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<LiveActionResponse>(
    `/api/professor/lectures/${lectureId}/classes/${classId}/live/end`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function getClassQuestions(
  lectureId: string,
  classId: number,
  options?: { page?: number; limit?: number }
): Promise<GetClassQuestionsResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const params = new URLSearchParams();
  if (options?.page !== undefined) {
    params.set("page", String(options.page));
  }
  if (options?.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  const query = params.toString();

  return apiFetch<GetClassQuestionsResponse>(
    `/api/questions/lectures/${lectureId}/classes/${classId}${
      query ? `?${query}` : ""
    }`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export async function getMyInfo(): Promise<MyInfoResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<MyInfoResponse>("/api/myinfo", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export type WhiteboardPage = {
  page_number: number;
  image_path: string;
  pdf_path: string;
  text: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GetWhiteboardPagesResponse = {
  lecture_id: string;
  class_id: number;
  count: number;
  pages: WhiteboardPage[];
};

export async function getWhiteboardPages(
  lectureId: string,
  classId: number,
  status?: "draft" | "finalized"
): Promise<GetWhiteboardPagesResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  const query = params.toString();
  const url = `/api/lectures/${lectureId}/classes/${classId}/whiteboard/pages${
    query ? `?${query}` : ""
  }`;

  console.log("[DEBUG] getWhiteboardPages 호출:", {
    url,
    lectureId,
    classId,
    status,
  });

  try {
    const response = await apiFetch<GetWhiteboardPagesResponse>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("[DEBUG] getWhiteboardPages 응답:", response);
    return response;
  } catch (error) {
    console.error("[DEBUG] getWhiteboardPages 에러:", error);
    throw error;
  }
}

export type UploadPdfResponse = {
  success: boolean;
  message: string;
  lecture_id: string;
  class_id: number;
  total_pages?: number;
  pages?: Array<{
    page_number: number;
    image_path: string;
    pdf_path: string;
    text: string;
    status: string;
  }>;
  materials_count?: number;
  original_pdf_url: string;
  pdf_url?: string; // 호환성을 위해 유지
};

/**
 * @deprecated 통일된 API인 uploadMaterial을 사용하세요.
 * 하위 호환성을 위해 유지됩니다.
 */
export async function uploadClassPdf(
  lectureId: string,
  classId: number,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadPdfResponse> {
  // 통일된 API 사용
  const { uploadMaterial } = await import("../materials");
  
  const response = await uploadMaterial(lectureId, classId, file, onProgress);
  
  // 기존 응답 형식으로 변환 (하위 호환성)
  return {
    success: response.success,
    message: response.message,
    lecture_id: response.lecture_id,
    class_id: response.class_id,
    total_pages: response.total_pages,
    pages: response.pages,
    materials_count: response.total_pages,
    original_pdf_url: response.original_material.url,
    pdf_url: response.original_material.url, // 호환성
  };
}

/**
 * 필기본 다운로드
 * @param lectureId 강좌 ID
 * @param classId 클래스 ID
 * @returns Promise<Blob> 다운로드할 PDF 파일
 */
export async function downloadNotes(
  lectureId: string,
  classId: number
): Promise<Blob> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/lectures/${lectureId}/classes/${classId}/download-notes`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "다운로드 실패" }));
    throw new Error(errorData.message || "필기본 다운로드에 실패했습니다.");
  }

  return await response.blob();
}
