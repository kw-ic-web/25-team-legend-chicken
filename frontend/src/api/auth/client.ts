export const getBaseUrl = (): string => {
  const fromEnv = (import.meta as unknown as { env?: Record<string, string> })
    .env?.VITE_BACKEND_API_KEY as string | undefined;
  const base =
    fromEnv && fromEnv.trim().length > 0 ? fromEnv : "localhost:8080";
  // allow http(s) prefix omitted values
  if (base.startsWith("http://") || base.startsWith("https://")) return base;
  return `http://${base}`;
};

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
  if (!resp.ok) {
    const message =
      (data as unknown as { message?: string })?.message ||
      `Request failed: ${resp.status}`;
    throw new Error(message);
  }
  return data;
}
