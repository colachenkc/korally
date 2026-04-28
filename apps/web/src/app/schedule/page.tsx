"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { apiGet, assetUrl } from "@/lib/api-client";
import {
  SCHEDULE_CATEGORIES,
  SCHEDULE_GROUPS,
  type ScheduleCategory,
  type ScheduleDoc,
} from "@/types/models";

const DEFAULT_CATEGORY: ScheduleCategory = SCHEDULE_GROUPS[0].categories[0];

function groupForCategory(cat: ScheduleCategory) {
  return SCHEDULE_GROUPS.find((g) => (g.categories as readonly string[]).includes(cat)) ?? null;
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-muted">載入中⋯</div>}>
      <ScheduleBody />
    </Suspense>
  );
}

function ScheduleBody() {
  const params = useSearchParams();
  const urlCategory = params.get("c");

  const [docs, setDocs] = useState<ScheduleDoc[]>([]);
  const [active, setActive] = useState<ScheduleCategory>(DEFAULT_CATEGORY);
  const [error, setError] = useState<string | null>(null);

  // Sync active tab with URL query param
  useEffect(() => {
    if (urlCategory && (SCHEDULE_CATEGORIES as readonly string[]).includes(urlCategory)) {
      setActive(urlCategory as ScheduleCategory);
    }
  }, [urlCategory]);

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

  const byCategory = useMemo(() => {
    const map = new Map<string, ScheduleDoc>();
    for (const d of docs) map.set(d.title, d);
    return map;
  }, [docs]);

  const activeGroup = groupForCategory(active) ?? SCHEDULE_GROUPS[0];
  const activeDoc = byCategory.get(active);
  const activeUrl = assetUrl(activeDoc?.pdf_url);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
            Schedule
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">賽程表</h1>
        </div>
        {activeUrl ? (
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-ink/15 bg-white px-3 py-1 text-sm text-ink-soft hover:bg-cream-100"
          >
            新分頁開啟
          </a>
        ) : null}
      </header>

      {/* Top-level group tabs */}
      <div className="flex flex-wrap gap-2">
        {SCHEDULE_GROUPS.map((g) => {
          const isActive = g.key === activeGroup.key;
          return (
            <button
              key={g.key}
              onClick={() => setActive(g.categories[0])}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                isActive
                  ? "border-ink bg-ink text-cream-50"
                  : "border-cream-200 bg-white text-ink-soft hover:border-ink/30"
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs (only when group has multiple categories) */}
      {activeGroup.categories.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {activeGroup.categories.map((cat) => {
            const exists = byCategory.has(cat);
            const isActive = cat === active;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  isActive
                    ? "border-ink bg-cream-100 text-ink"
                    : exists
                      ? "border-cream-200 bg-white text-ink-soft hover:border-ink/30"
                      : "border-cream-100 bg-cream-100 text-ink-faint"
                }`}
              >
                {cat}
                {!exists ? <span className="ml-1 text-[10px]">（無）</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {activeUrl ? (
        <iframe
          src={activeUrl}
          title={`${active} PDF`}
          className="h-[82vh] w-full rounded-2xl border border-cream-200 bg-white shadow-card"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          「{active}」尚未上傳 PDF。請至 管理後台 → 賽程 PDF 管理 上傳。
        </div>
      )}
    </div>
  );
}
