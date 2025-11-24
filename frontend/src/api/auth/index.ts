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
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function loginUser(payload: LoginRequest) {
  return apiFetch<LoginResponse>("/api/login", {
    method: "POST",
    json: payload,
  });
}

export type RefreshTokenResponse = {
  success: boolean;
  message: string;
  access_token?: string;
  expires_in?: number;
};

export async function refreshAccessToken(refreshToken: string) {
  return apiFetch<RefreshTokenResponse>("/api/refresh", {
    method: "POST",
    json: { refresh_token: refreshToken },
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

export type UpdateMyInfoPayload = {
  name?: string;
  phone?: string;
  password?: string;
  profile_image?: File | null;
};

export type UpdateMyInfoResponse = {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    user_type: string;
    profile_image: string;
  };
};

export async function updateMyInfo(
  payload: UpdateMyInfoPayload
): Promise<UpdateMyInfoResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  const formData = new FormData();
  if (payload.name !== undefined) {
    formData.append("name", payload.name);
  }
  if (payload.phone !== undefined) {
    formData.append("phone", payload.phone);
  }
  if (payload.password) {
    formData.append("password", payload.password);
  }
  if (payload.profile_image) {
    formData.append("profile_image", payload.profile_image);
  }

  return apiFetch<UpdateMyInfoResponse>("/api/myinfo", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

export type LogoutResponse = {
  success: boolean;
  message: string;
};

export async function logoutUser(): Promise<LogoutResponse> {
  const token = localStorage.getItem("lecq.token");
  if (!token) {
    throw new Error("인증 토큰이 필요합니다.");
  }

  return apiFetch<LogoutResponse>("/api/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
