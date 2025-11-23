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
  localStorage.removeItem("lecq.auth");
  window.location.href = "/login";
}

// 토큰 갱신 중 Promise를 저장 (동시 갱신 방지)
let refreshPromise: Promise<boolean> | null = null;

// 토큰이 아직 유효한지 확인
function isTokenValid(): boolean {
  const expiresAt = localStorage.getItem("lecq.tokenExpiresAt");
  if (!expiresAt) {
    return false;
  }
  const expiresTime = parseInt(expiresAt, 10);
  // 만료 5분 전까지는 유효하다고 간주 (갱신 불필요)
  return Date.now() < expiresTime - 5 * 60 * 1000;
}

// 토큰 갱신 시도 (순환 참조 방지를 위해 직접 fetch 사용)
async function tryRefreshToken(): Promise<boolean> {
  // 이미 갱신 중이면 기존 Promise 반환
  if (refreshPromise) {
    return refreshPromise;
  }

  // 토큰이 아직 유효하면 갱신 불필요
  if (isTokenValid()) {
    return true;
  }

  const refreshToken = localStorage.getItem("lecq.refreshToken");
  if (!refreshToken) {
    return false;
  }

  // 갱신 Promise 생성
  refreshPromise = (async () => {
    try {
      const url = `${getBaseUrl()}/api/refresh`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const text = await resp.text();
      const data = text ? JSON.parse(text) : {};
      
      if (resp.ok && data.success && data.access_token) {
        localStorage.setItem("lecq.token", data.access_token);
        if (typeof data.expires_in === "number") {
          const expiresAt = Date.now() + data.expires_in * 1000;
          localStorage.setItem("lecq.tokenExpiresAt", String(expiresAt));
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("토큰 갱신 실패:", error);
      return false;
    } finally {
      // 갱신 완료 후 Promise 초기화
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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

  // Authorization 헤더 자동 추가
  const token = localStorage.getItem("lecq.token");
  const authHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const resp = await fetch(url, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders,
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
