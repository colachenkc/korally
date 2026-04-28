import { apiGet, apiPost } from "@/lib/api-client";
import { clearToken, setToken } from "@/lib/token";

export type Role = "admin" | "referee";
export type AuthStatus = {
  authenticated: boolean;
  role: Role | null;
  token?: string | null;
};

export const authApi = {
  me: () => apiGet<AuthStatus>("/auth/me"),
  login: async (password: string) => {
    const res = await apiPost<AuthStatus>("/auth/login", { password });
    if (res.token) setToken(res.token);
    return res;
  },
  logout: async () => {
    try {
      return await apiPost<AuthStatus>("/auth/logout");
    } finally {
      clearToken();
    }
  },
};
