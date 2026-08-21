"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { apiGet, assetUrl } from "@/lib/api-client";
import type { ScheduleDoc, Stage } from "@/types/models";

// Special sentinel for the tournament-wide timetable PDF (has no Stage).
const TIMETABLE_KEY = "timetable";
const TIMETABLE_TITLE = "時間表";

type Tab = { key: string; label: string; stageId: number | null };

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-muted">載入中⋯</div>}>
      <ScheduleBody />
    </Suspense>
  );
}

function ScheduleBody() {
  const params = useSearchParams();
  const urlKey = params.get("s");

  const [stages, setStages] = useState<Stage[]>([]);
  const [docs, setDocs] = useState<ScheduleDoc[]>([]);
  const [active, setActive] = useState<string>(TIMETABLE_KEY);
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

  const tabs: Tab[] = useMemo(() => {
    const stageTabs: Tab[] = stages.map((s) => ({
      key: `s${s.id}`,
      label: s.name,
      stageId: s.id,
    }));
    return [{ key: TIMETABLE_KEY, label: TIMETABLE_TITLE, stageId: null }, ...stageTabs];
  }, [stages]);

  // Sync active tab with URL query param (?s=timetable or ?s=<stageId>).
  useEffect(() => {
    if (!urlKey || tabs.length === 0) return;
    const key = urlKey === TIMETABLE_KEY ? TIMETABLE_KEY : `s${urlKey}`;
    if (tabs.some((t) => t.key === key)) setActive(key);
  }, [urlKey, tabs]);

  const docFor = useCallback(
    (tab: Tab): ScheduleDoc | undefined => {
      if (tab.stageId == null) {
        return docs.find((d) => d.title === TIMETABLE_TITLE);
      }
      return (
        docs.find((d) => d.stage_id === tab.stageId) ??
        docs.find((d) => {
          const stage = stages.find((s) => s.id === tab.stageId);
          return stage ? d.title === stage.name : false;
        })
      );
    },
    [docs, stages],
  );

  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];
  const activeDoc = activeTab ? docFor(activeTab) : undefined;
  const activeUrl = assetUrl(activeDoc?.pdf_url);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">賽程表</h1>
        </div>
        {activeUrl ? (
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-cream-300 bg-cream-100 px-3 py-1 text-sm text-ink-soft hover:bg-cream-200"
          >
            新分頁開啟
          </a>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isActive = t.key === active;
          const exists = !!docFor(t);
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                isActive
                  ? "border-ink bg-ink text-cream-50"
                  : exists
                    ? "border-cream-300 bg-cream-100 text-ink-soft hover:border-ink/30"
                    : "border-cream-200 bg-cream-100 text-ink-faint"
              }`}
            >
              {t.label}
              {!exists && !isActive ? <span className="ml-1 text-[10px]">（無）</span> : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {activeUrl ? (
        <>
          <iframe
            src={activeUrl}
            title={`${activeTab?.label} PDF`}
            className="hidden h-[82vh] w-full rounded-2xl border border-cream-200 bg-cream-100 shadow-card md:block"
          />
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-2xl border border-cream-200 bg-cream-100 p-8 text-center shadow-card transition hover:bg-cream-50 md:hidden"
          >
            <div className="text-[10px] uppercase tracking-[0.28em] text-ink-muted">
              {activeTab?.label}
            </div>
            <div className="mt-2 text-base font-medium text-ink">點此開啟 PDF</div>
            <div className="mt-1 text-xs text-ink-muted">
              手機版以系統 PDF 檢視器開啟，可雙指縮放與滑動翻頁
            </div>
          </a>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-12 text-center text-sm text-ink-muted">
          「{activeTab?.label}」尚未上傳 PDF。請至 管理後台 → 賽程 PDF 管理 上傳。
        </div>
      )}
    </div>
  );
}
