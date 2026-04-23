"use client";

import { useCallback, useEffect, useState } from "react";

import { apiDelete, apiGet, apiUpload, assetUrl } from "@/lib/api-client";
import {
  SCHEDULE_CATEGORIES,
  type ScheduleCategory,
  type ScheduleDoc,
} from "@/types/models";

export default function AdminSchedulePage() {
  const [docs, setDocs] = useState<ScheduleDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<ScheduleDoc[]>("/schedule-docs");
      setDocs(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function docFor(cat: ScheduleCategory): ScheduleDoc | undefined {
    return docs.find((d) => d.title === cat);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
            Admin / Schedule PDFs
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">賽程 PDF 管理</h1>
        </div>
        <button
          onClick={load}
          className="rounded-full border border-ink/15 bg-white px-3 py-1 text-sm text-ink-soft hover:bg-cream-100"
        >
          重新整理
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {SCHEDULE_CATEGORIES.map((cat) => (
          <CategoryCard key={cat} category={cat} doc={docFor(cat)} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  doc,
  onChanged,
}: {
  category: ScheduleCategory;
  doc: ScheduleDoc | undefined;
  onChanged: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const url = assetUrl(doc?.pdf_url);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setErr("只能上傳 PDF 檔");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      await apiUpload("/schedule-docs", file, { fields: { title: category } });
      await onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "上傳失敗");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemove() {
    if (!doc) return;
    if (!confirm(`確定刪除「${category}」的 PDF？`)) return;
    setErr(null);
    try {
      await apiDelete(`/schedule-docs/${doc.id}`);
      await onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "刪除失敗");
    }
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{category}</h2>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            {doc ? "uploaded" : "empty"}
          </p>
        </div>
        {doc ? (
          <button onClick={handleRemove} className="text-xs text-accent-coral hover:underline">
            移除
          </button>
        ) : null}
      </div>

      {url ? (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-cream-50 px-3 py-2 text-sm">
          <span className="truncate font-mono text-xs text-ink-muted">
            {doc ? new Date(doc.created_at).toLocaleString("zh-TW", { hour12: false }) : "—"}
          </span>
          <a href={url} target="_blank" rel="noreferrer" className="text-accent-sky hover:underline">
            開啟
          </a>
        </div>
      ) : null}

      <label className="mt-3 block">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          {doc ? "更換檔案" : "上傳檔案"}
        </span>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-cream-50 hover:file:bg-ink-soft disabled:opacity-50"
        />
      </label>

      {uploading ? <div className="mt-2 text-xs text-ink-muted">上傳中⋯</div> : null}
      {err ? <div className="mt-2 text-xs text-accent-coral">{err}</div> : null}
    </div>
  );
}
