import { apiFetch } from "../auth/client";

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

export type GetClassPdfsResponse = {
  lecture_id: string;
  lecture_name: string;
  class_id: number;
  class_title: string;
  pdf_count: number;
  pdfs: string[];
};

export async function getClassPdfs(
  lectureId: string,
  classId: number
): Promise<GetClassPdfsResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetClassPdfsResponse>(
    `/api/professor/lectures/${lectureId}/classes/${classId}/pdf`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
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
