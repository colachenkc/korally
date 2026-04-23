"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { authApi } from "@/lib/auth";

export type AuthState = {
  status: "loading" | "authenticated" | "anonymous";
  refresh: () => Promise<void>;
};

export function useAuth(): AuthState {
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.me();
      setStatus(res.authenticated ? "authenticated" : "anonymous");
    } catch {
      setStatus("anonymous");
    }
  }, []);

  // Re-check on every navigation so Header reflects login/logout immediately.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  return { status, refresh };
}
