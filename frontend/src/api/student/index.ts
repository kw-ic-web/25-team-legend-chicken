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

export type { LectureClass };

