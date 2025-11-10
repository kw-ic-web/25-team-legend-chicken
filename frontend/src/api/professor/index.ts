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

