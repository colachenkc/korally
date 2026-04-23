import { apiGet, apiPost } from "@/lib/api-client";

export type AuthStatus = { authenticated: boolean };

export const authApi = {
  me: () => apiGet<AuthStatus>("/auth/me"),
  login: (password: string) => apiPost<AuthStatus>("/auth/login", { password }),
  logout: () => apiPost<AuthStatus>("/auth/logout"),
};
