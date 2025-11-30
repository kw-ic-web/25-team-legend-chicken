import { apiFetch } from "../auth/client";
import { getClasses as getProfessorClasses, type GetClassesResponse, type LectureClass } from "../professor";

export type JoinLectureResponse = {
  message: string;
  lecture: {
    lecture_id: string;
    name: string;
    schedule: string;
    professor_name: string;
    professor_email: string;
  };
  current_count: number;
  max_count: number;
};

export async function joinLecture(
  lectureId: string
): Promise<JoinLectureResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }
  return apiFetch<JoinLectureResponse>(
    `/api/student/join-lecture/${lectureId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type StudentLecture = {
  lecture_id: string;
  name: string;
  schedule: string;
  professor_name: string;
  professor_email: string;
  professor_phone: string;
  lecture_description: string;
  thumbnail?: string;
};

export type GetMyLecturesResponse = {
  student_name: string;
  student_email: string;
  lecture_count: number;
  lectures: StudentLecture[];
};

export async function getMyLectures(): Promise<GetMyLecturesResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }
  return apiFetch<GetMyLecturesResponse>("/api/student/my-lectures", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export type GetLectureDetailResponse = {
  lecture_id: string;
  name: string;
  schedule: string;
  professor_name: string;
  professor_email: string;
  professor_phone: string;
  lecture_description: string;
  student_count: number;
  student_id_list: string[];
};

export async function getLectureDetail(
  lectureId: string
): Promise<GetLectureDetailResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }
  const myLectures = await getMyLectures();
  const lecture = myLectures.lectures.find(
    (lec) => lec.lecture_id === lectureId
  );
  if (!lecture) {
    throw new Error("강의를 찾을 수 없습니다.");
  }
  // 교수 API를 사용하여 전체 정보 가져오기
  const professorLectures = await apiFetch<{
    lectures: Array<{
      lecture_id: string;
      name: string;
      schedule: string;
      professor_name: string;
      professor_email: string;
      professor_phone: string;
      lecture_description: string;
      student_count: number;
      student_id_list: string[];
    }>;
  }>("/api/professor/lectures/search", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const fullLecture = professorLectures.lectures.find(
    (lec) => lec.lecture_id === lectureId
  );
  if (!fullLecture) {
    return {
      lecture_id: lecture.lecture_id,
      name: lecture.name,
      schedule: lecture.schedule,
      professor_name: lecture.professor_name,
      professor_email: lecture.professor_email,
      professor_phone: lecture.professor_phone,
      lecture_description: lecture.lecture_description,
      student_count: 0,
      student_id_list: [],
    };
  }
  return {
    lecture_id: fullLecture.lecture_id,
    name: fullLecture.name,
    schedule: fullLecture.schedule,
    professor_name: fullLecture.professor_name,
    professor_email: fullLecture.professor_email,
    professor_phone: fullLecture.professor_phone,
    lecture_description: fullLecture.lecture_description,
    student_count: fullLecture.student_count,
    student_id_list: fullLecture.student_id_list,
  };
}

export async function getClasses(
  lectureId: string
): Promise<GetClassesResponse> {
  // 교수 API 재사용 (학생도 접근 가능)
  return getProfessorClasses(lectureId);
}

/**
 * 학생 라이브 참여 정보 조회 응답 타입
 * GET /api/student/participate
 */
export type ParticipateResponse = {
  lecture_id: string;
  lecture_name: string;
  class_id: number;
  class_title: string;
  is_live_active: boolean;
  live_id: number | null;
  started_at: string | null; // ISO 8601 형식 (예: "2025-11-18T09:14:18.468Z")
  live_path: string | null; // 라이브 참여 경로 (예: "/student/participate?lectureId=LEC-32AEBA14&classId=1")
};

/**
 * 학생이 특정 강좌의 특정 클래스에 참여하기 위한 라이브 방송 정보를 조회합니다.
 * 현재 활성 라이브 상태, 라이브 ID, 시작 시간, 입장 경로 등을 반환합니다.
 * 
 * @param lectureId - 강좌 ID (필수)
 * @param classId - 클래스 ID (필수)
 * @returns 라이브 참여 정보
 * @throws {Error} 인증 토큰이 없거나 API 호출 실패 시
 */
export async function getParticipateInfo(
  lectureId: string,
  classId: number
): Promise<ParticipateResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }
  return apiFetch<ParticipateResponse>(
    `/api/student/participate?lectureId=${lectureId}&classId=${classId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type { LectureClass };

// 라이브 상태 조회 (교수 API와 동일한 엔드포인트 사용)
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

export type GetClassMaterialsResponse = {
  success: boolean;
  lecture_id: string;
  lecture_name: string;
  class_id: number;
  class_title: string;
  pdf_count: number;
  pdfs: string[];
  materials: Array<{
    fileId?: string;
    url: string;
    originalName: string;
  }>;
};

export async function getClassMaterials(
  lectureId: string,
  classId: number
): Promise<GetClassMaterialsResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<GetClassMaterialsResponse>(
    `/api/student/lectures/${lectureId}/classes/${classId}/materials`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export type MyQuestionItem = {
  _id: string;
  lecture_id: string;
  lecture_name: string | null;
  class_id: number;
  page: number;
  section?: string | null;
  position: {
    x: number;
    y: number;
  };
  timestamp: string;
  type: string;
  author: {
    id: string;
    name: string;
  };
  text: string;
  answer: string | null;
  upvote_count: number;
  metadata: Record<string, unknown>;
  live_id: number | null;
  created_at: string;
  updated_at: string;
};

export type GetMyQuestionsResponse = {
  student_id: string;
  student_name: string;
  total_count: number;
  questions: MyQuestionItem[];
};

export async function getMyQuestions(
  lectureId?: string,
  classId?: number,
  limit?: number
): Promise<GetMyQuestionsResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const queryParams = new URLSearchParams();
  if (lectureId) {
    queryParams.set("lectureId", lectureId);
  }
  if (classId !== undefined) {
    queryParams.set("classId", String(classId));
  }
  if (limit !== undefined) {
    queryParams.set("limit", String(limit));
  }

  const queryString = queryParams.toString();
  const url = `/api/student/my-questions${queryString ? `?${queryString}` : ""}`;

  return apiFetch<GetMyQuestionsResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

