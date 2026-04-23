"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { authApi } from "@/lib/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-muted">載入中⋯</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/admin";

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setErr(null);
    try {
      await authApi.login(password);
      router.replace(redirect);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "登入失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md">
      {/* Gradient outer border */}
      <div className="rounded-3xl bg-[linear-gradient(to_right,#fec796,#fb5646,#827acc,#2e79d8)] p-[2px] shadow-pop">
        <div className="rounded-[22px] bg-white px-8 py-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
            Admin
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">管理員登入</h1>
          <p className="mt-2 text-sm text-ink-muted">登入後台修改資料</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-sm font-medium text-ink-soft">
                密碼
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-cream-200 bg-cream-50 px-4 py-2.5 text-base text-ink focus:border-ink/40 focus:bg-white focus:outline-none"
                required
              />
            </div>

            {err ? (
              <div className="rounded-lg bg-accent-coral/10 px-3 py-2 text-xs text-accent-coral">
                {err}
              </div>
            ) : null}

            <button
              disabled={submitting}
              className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-ink-soft disabled:opacity-50"
            >
              {submitting ? "登入中⋯" : "登入"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
