"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

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
  return <>{children}</>;
}
