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

export type Student = {
  id: string;
  name: string;
  email: string;
  phone?: string;
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
