/**
 * Bearer token storage in localStorage. Used as the primary auth mechanism so
 * Safari (ITP) and other browsers' cross-origin cookie blocking don't break login.
 * The HTTP cookie is still set as a fallback for first-party flows.
 */
const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}
