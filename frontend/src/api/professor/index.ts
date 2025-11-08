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
