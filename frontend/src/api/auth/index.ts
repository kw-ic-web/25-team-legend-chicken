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
