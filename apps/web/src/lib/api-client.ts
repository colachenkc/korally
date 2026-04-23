export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
export const API_V1 = `${API_BASE}/api/v1`;

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_V1}${path}`, {
    method,
    cache: "no-store",
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err);
    } catch {
      detail = await res.text();
    }
    throw new Error(`${method} ${path} failed: ${res.status} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
export const apiPatch = <T>(path: string, body?: unknown) => request<T>("PATCH", path, body);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);

export async function apiUpload<T>(
  path: string,
  file: File,
  options: { fieldName?: string; fields?: Record<string, string> } = {},
): Promise<T> {
  const form = new FormData();
  form.append(options.fieldName ?? "file", file);
  for (const [k, v] of Object.entries(options.fields ?? {})) {
    form.append(k, v);
  }
  const res = await fetch(`${API_V1}${path}`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err);
    } catch {
      detail = await res.text();
    }
    throw new Error(`Upload ${path} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

export function assetUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (/^https?:/i.test(relativePath)) return relativePath;
  return `${API_BASE}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
}
