"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, role } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login?redirect=/admin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="text-sm text-ink-muted">驗證登入狀態⋯</div>;
  }
  if (status === "anonymous") {
    return <div className="text-sm text-ink-muted">正在導向登入⋯</div>;
  }
  if (role !== "admin") {
    return (
      <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-6 text-sm text-accent-coral">
        此區域僅限大會帳號使用。請改用大會密碼登入。
      </div>
    );
  }
  return <>{children}</>;
}
