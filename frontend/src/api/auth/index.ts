import { apiFetch } from "./client";

export type RegisterRequest = {
  name: string;
  email: string;
  phone: string;
  password: string;
  user_type: "student" | "professor";
};

export type RegisterResponse = {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    user_type: string;
  };
};

export async function registerUser(payload: RegisterRequest) {
  return apiFetch<RegisterResponse>("/api/register", {
    method: "POST",
    json: payload,
  });
}

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    user_type: string;
  };
  token?: string;
};

export async function loginUser(payload: LoginRequest) {
  return apiFetch<LoginResponse>("/api/login", {
    method: "POST",
    json: payload,
  });
}

export type VerifyResponse = {
  code: number;
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    user_type: string;
  };
};

export async function verifyToken(token: string) {
  return apiFetch<VerifyResponse>("/api/verify", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export type MyInfoResponse = {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    user_type: string;
    profile_image: string;
  };
};

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
