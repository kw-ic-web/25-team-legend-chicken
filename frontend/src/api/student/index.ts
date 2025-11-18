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

export type ParticipateResponse = {
  lecture_id: string;
  lecture_name: string;
  class_id: number;
  class_title: string;
  is_live_active: boolean;
  live_id: number | null;
  started_at: string | null;
  live_path: string | null;
};

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

export type StudentQuestion = {
  _id: string;
  lecture_id: string;
  lecture_name: string;
  class_id?: number;
  page?: number;
  section?: string;
  position?: {
    x: number;
    y: number;
  };
  timestamp?: string;
  type?: string;
  author: {
    id: string;
    name: string;
  };
  text: string;
  answer?: string;
  upvote_count?: number;
  metadata?: Record<string, unknown>;
  live_id?: number;
  created_at?: string;
  updated_at?: string;
};

export type GetMyQuestionsResponse = {
  student_id: string;
  student_name: string;
  total_count: number;
  questions: StudentQuestion[];
};

export type GetMyQuestionsParams = {
  lectureId?: string;
  classId?: number;
  limit?: number;
};

export async function getMyQuestions(
  params: GetMyQuestionsParams = {}
): Promise<GetMyQuestionsResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const searchParams = new URLSearchParams();
  if (params.lectureId) searchParams.set("lectureId", params.lectureId);
  if (typeof params.classId === "number")
    searchParams.set("classId", params.classId.toString());
  if (typeof params.limit === "number")
    searchParams.set("limit", Math.min(params.limit, 200).toString());

  const query = searchParams.toString();
  const url = `/api/student/my-questions${query ? `?${query}` : ""}`;

  return apiFetch<GetMyQuestionsResponse>(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export type { LectureClass };

