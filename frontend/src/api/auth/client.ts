export const getBaseUrl = (): string => {
  const fromEnv = (import.meta as unknown as { env?: Record<string, string> })
    .env?.VITE_BACKEND_API_KEY as string | undefined;
  const base =
    fromEnv && fromEnv.trim().length > 0 ? fromEnv : "localhost:8080";
  // allow http(s) prefix omitted values
  if (base.startsWith("http://") || base.startsWith("https://")) return base;
  return `http://${base}`;
};

// 로그아웃 처리 함수
function handleLogout() {
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
  
  // 토큰 만료 또는 인증 실패 처리
  if (resp.status === 401 || resp.status === 419) {
    // 원래 요청에 Authorization 헤더가 있었는지 확인
    let hasAuthHeader = false;
    if (headers) {
      if (headers instanceof Headers) {
        hasAuthHeader = headers.has("Authorization");
      } else if (typeof headers === "object") {
        hasAuthHeader = "Authorization" in headers;
      }
    }
    
    // 리프레시 토큰으로 갱신 시도
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // 토큰 갱신 성공 시 원래 요청 재시도 (Authorization 헤더가 있었던 경우만)
      if (hasAuthHeader) {
        const newToken = localStorage.getItem("lecq.token");
        if (newToken) {
          // Headers 객체 또는 일반 객체 처리
          let newHeaders: HeadersInit;
          if (headers instanceof Headers) {
            const headersObj = new Headers(headers);
            headersObj.set("Authorization", `Bearer ${newToken}`);
            newHeaders = headersObj;
          } else if (headers && typeof headers === "object") {
            newHeaders = {
              ...(headers as Record<string, string>),
              Authorization: `Bearer ${newToken}`,
            };
          } else {
            newHeaders = {
              Authorization: `Bearer ${newToken}`,
            };
          }
          
          // Headers 객체인 경우와 일반 객체인 경우 분리 처리
          let retryHeaders: HeadersInit;
          if (newHeaders instanceof Headers) {
            if (!isFormData) {
              newHeaders.set("Content-Type", "application/json");
            }
            retryHeaders = newHeaders;
          } else {
            retryHeaders = {
              ...(isFormData ? {} : { "Content-Type": "application/json" }),
              ...newHeaders,
            };
          }
          
          const retryResp = await fetch(url, {
            ...rest,
            headers: retryHeaders,
            body,
          });
          const retryText = await retryResp.text();
          const retryData = retryText
            ? (JSON.parse(retryText) as T)
            : ({} as T);
          if (!retryResp.ok) {
            const message =
              (retryData as unknown as { message?: string })?.message ||
              `Request failed: ${retryResp.status}`;
            throw new Error(message);
          }
          return retryData;
        }
      } else {
        // Authorization 헤더가 없었던 경우 원래 에러 반환
        const message =
          (data as unknown as { message?: string })?.message ||
          `Request failed: ${resp.status}`;
        throw new Error(message);
      }
    } else {
      // 토큰 갱신 실패 시 로그아웃 처리
      handleLogout();
      const message =
        (data as unknown as { message?: string })?.message ||
        "인증이 만료되었습니다. 다시 로그인해주세요.";
      throw new Error(message);
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
