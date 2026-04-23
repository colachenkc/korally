"use client";

import { useState } from "react";

import { apiPost } from "@/lib/api-client";

export function ResetMatchesButton() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleClick() {
    const ok = confirm(
      "將刪除所有比賽紀錄（含進行中、已結束、比分、裁判指派、進度紀錄），\n並把所有球檯回到空閒狀態。\n\n球檯設定、裁判名單、大會桌、公告皆不會動。\n\n確定要執行嗎？",
    );
    if (!ok) return;

    setSubmitting(true);
    setErr(null);
    setResult(null);
    try {
      const res = await apiPost<{ deleted_matches: number }>("/admin/reset-matches");
      setResult(`已清除 ${res.deleted_matches} 場比賽紀錄`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleClick}
        disabled={submitting}
        className="rounded-full border border-accent-coral bg-white px-4 py-1.5 text-sm font-medium text-accent-coral hover:bg-accent-coral hover:text-white disabled:opacity-50"
      >
        {submitting ? "執行中⋯" : "清除所有比賽紀錄"}
      </button>
      {result ? <span className="text-xs text-ink-soft">{result}</span> : null}
      {err ? <span className="text-xs text-accent-coral">{err}</span> : null}
    </div>
  );
}
