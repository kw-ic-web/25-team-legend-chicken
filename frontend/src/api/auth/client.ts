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
  const { json, headers, ...rest } = options;
  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body:
      json !== undefined ? JSON.stringify(json) : (options as RequestInit).body,
    ...rest,
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
