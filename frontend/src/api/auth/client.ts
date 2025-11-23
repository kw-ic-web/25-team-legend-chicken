export const getBaseUrl = (): string => {
  const fromEnv = (import.meta as unknown as { env?: Record<string, string> })
    .env?.VITE_BACKEND_API_KEY as string | undefined;
  const base =
    fromEnv && fromEnv.trim().length > 0 ? fromEnv : "localhost:8080";
  // allow http(s) prefix omitted values
  if (base.startsWith("http://") || base.startsWith("https://")) return base;
  return `http://${base}`;
};

// 토큰 만료 시 처리 함수
function handleTokenExpiration() {
  // 모든 인증 관련 데이터 정리
  localStorage.removeItem("lecq.auth");
  localStorage.removeItem("lecq.token");
  localStorage.removeItem("lecq.refreshToken");
  localStorage.removeItem("lecq.tokenExpiresAt");
  
  // 현재 경로 확인
  const currentPath = window.location.pathname;
  const isLoginOrRegister = 
    currentPath === "/login" || 
    currentPath === "/register" || 
    currentPath.startsWith("/register/");
  
  // 로그인/회원가입 페이지가 아니면 로그인 페이지로 리다이렉트
  if (!isLoginOrRegister) {
    window.location.href = "/login";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const { json, headers, body: originalBody, ...rest } = options;
  const body =
    json !== undefined
      ? JSON.stringify(json)
      : (originalBody as BodyInit | null | undefined);
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const resp = await fetch(url, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(headers || {}),
    },
    body,
  });

  const text = await resp.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  
  // 토큰 만료 또는 인증 오류 처리
  if (resp.status === 419 || resp.status === 401) {
    // 로그인/회원가입 관련 API는 제외
    const isAuthPath = path.includes("/login") || path.includes("/register") || path.includes("/refresh");
    if (!isAuthPath) {
      handleTokenExpiration();
    }
  }
  
  if (!resp.ok) {
    const message =
      (data as unknown as { message?: string })?.message ||
      `Request failed: ${resp.status}`;
    throw new Error(message);
  }
  return data;
}
