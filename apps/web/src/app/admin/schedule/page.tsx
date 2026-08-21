"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiDelete, apiGet, apiUpload, assetUrl } from "@/lib/api-client";
import type { ScheduleDoc, Stage } from "@/types/models";

// Special legacy title with no Stage backing.
const SCHEDULE_TIMETABLE_TITLE = "時間表";

type Slot =
  | { kind: "stage"; stage: Stage; doc: ScheduleDoc | undefined }
  | { kind: "timetable"; doc: ScheduleDoc | undefined };

export default function AdminSchedulePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [docs, setDocs] = useState<ScheduleDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([
        apiGet<Stage[]>("/stages"),
        apiGet<ScheduleDoc[]>("/schedule-docs"),
      ]);
      setStages(s);
      setDocs(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slots: Slot[] = useMemo(() => {
    const timetableDoc = docs.find((d) => d.title === SCHEDULE_TIMETABLE_TITLE);
    const stageSlots: Slot[] = stages.map((s) => ({
      kind: "stage",
      stage: s,
      doc: docs.find((d) => d.stage_id === s.id) ?? docs.find((d) => d.title === s.name),
    }));
    return [{ kind: "timetable", doc: timetableDoc }, ...stageSlots];
  }, [stages, docs]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">賽程 PDF 管理</h1>
          <p className="mt-1 text-sm text-ink-muted">
            以「大組」上傳對應賽程 PDF。大組可到{" "}
            <a href="/admin/groups" className="text-brand hover:underline">
              循環賽分組
            </a>{" "}
            編輯。
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-full border border-cream-300 bg-cream-100 px-3 py-1 text-sm text-ink-soft hover:bg-cream-200"
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
        {slots.map((slot) => (
          <SlotCard
            key={slot.kind === "timetable" ? "timetable" : `stage-${slot.stage.id}`}
            slot={slot}
            onChanged={load}
          />
        ))}
      </div>
    </div>
  );
}

function SlotCard({ slot, onChanged }: { slot: Slot; onChanged: () => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const title = slot.kind === "timetable" ? SCHEDULE_TIMETABLE_TITLE : slot.stage.name;
  const doc = slot.doc;
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
      const fields: Record<string, string> =
        slot.kind === "stage"
          ? { stage_id: String(slot.stage.id) }
          : { title: SCHEDULE_TIMETABLE_TITLE };
      await apiUpload("/schedule-docs", file, { fields });
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
    if (!confirm(`確定刪除「${title}」的 PDF？`)) return;
    setErr(null);
    try {
      await apiDelete(`/schedule-docs/${doc.id}`);
      await onChanged();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "刪除失敗");
    }
  }

  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-100 p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-ink-muted">
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
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">
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
