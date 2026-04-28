"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { authApi, type Role } from "@/lib/auth";
import { clearToken } from "@/lib/token";

export type AuthState = {
  status: "loading" | "authenticated" | "anonymous";
  role: Role | null;
  refresh: () => Promise<void>;
};

export function useAuth(): AuthState {
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [role, setRole] = useState<Role | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.me();
      setStatus(res.authenticated ? "authenticated" : "anonymous");
      setRole(res.role);
      // Drop stale token so we don't keep sending an expired Bearer header.
      if (!res.authenticated) clearToken();
    } catch {
      setStatus("anonymous");
      setRole(null);
      clearToken();
    }
  }, []);

  // Re-check on every navigation so Header reflects login/logout immediately.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  return { status, role, refresh };
}
