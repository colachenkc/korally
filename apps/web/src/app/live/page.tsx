"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { apiGet } from "@/lib/api-client";
import type { MainDesk, TableItem } from "@/types/models";

const REFRESH_MS = 5000;

export default function LivePage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [mainDesks, setMainDesks] = useState<MainDesk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, md] = await Promise.all([
        apiGet<TableItem[]>("/tables"),
        apiGet<MainDesk[]>("/main-desk"),
      ]);
      setTables(t);
      setMainDesks(md);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(load, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const summary = {
    total: tables.length,
    inProgress: tables.filter((t) => t.status === "in_progress").length,
    idle: tables.filter((t) => t.status === "idle").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
            Live
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">球檯即時監控</h1>
        </div>
        <div className="font-mono text-[11px] text-ink-muted">
          {lastUpdated ? `updated ${lastUpdated.toLocaleTimeString()}` : "loading…"}
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <SummaryChip label="總桌數" value={summary.total} />
        <SummaryChip label="進行中" value={summary.inProgress} tone="sky" />
        <SummaryChip label="空閒" value={summary.idle} tone="cream" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {tables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          尚未建立任何球檯。請至 管理後台 → 球檯管理 新增。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[1380px] auto-rows-fr grid-cols-7 gap-x-2 gap-y-3">
            {[...tables]
              .sort((a, b) => a.id - b.id)
              .map((t) => (
                <LiveTableCard key={t.id} table={t} />
              ))}
          </div>
        </div>
      )}

      {mainDesks.length > 0 ? (
        <div className="flex justify-center pt-2">
          {mainDesks.map((md) => (
            <MainDeskCard key={md.id} desk={md} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone = "cream",
}: {
  label: string;
  value: number;
  tone?: "cream" | "sky";
}) {
  const toneClass =
    tone === "sky" ? "bg-accent-sky/10 text-accent-sky" : "bg-cream-100 text-ink-soft";
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${toneClass}`}>
      <span className="text-xs">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}

function MainDeskCard({ desk }: { desk: MainDesk }) {
  const members = desk.members_text?.trim();
  return (
    <div className="w-full max-w-xs rounded-2xl border border-accent-butter/60 bg-accent-butter/25 p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
            Main desk
          </div>
          <div className="mt-0.5 truncate text-base font-semibold text-ink">{desk.name}</div>
          {desk.location ? (
            <div className="truncate text-xs text-ink-muted">{desk.location}</div>
          ) : null}
        </div>
        {desk.status_text ? (
          <div className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-ink">
            {desk.status_text}
          </div>
        ) : null}
      </div>
      {members ? (
        <div className="mt-3 border-t border-accent-butter/70 pt-3">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            目前輪班
          </div>
          <pre className="whitespace-pre-wrap font-sans text-base font-medium leading-relaxed text-ink">
            {members}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function LiveTableCard({ table }: { table: TableItem }) {
  const match = table.current_match;
  const refs = table.referees_text?.trim();

  const accentBar =
    table.status === "in_progress"
      ? "before:bg-accent-sky"
      : table.status === "delayed"
        ? "before:bg-accent-coral"
        : "before:bg-cream-200";

  return (
    <div
      className={`relative flex min-h-[135px] flex-col overflow-hidden rounded-xl border border-cream-200 bg-white p-2.5 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-1 ${accentBar}`}
    >
      <div className="flex items-start justify-between gap-1 border-b border-cream-200/70 pb-1.5">
        <div className="font-mono text-lg font-semibold leading-tight tracking-tight text-ink">
          {table.table_no}
        </div>
        <StatusBadge status={table.status} />
      </div>

      {match ? (
        <div className="mt-1.5 flex flex-1 flex-col gap-0.5">
          {match.category_label ? (
            <div className="text-base font-bold text-ink">{match.category_label}</div>
          ) : null}
          <div className="truncate text-sm font-medium text-ink-soft">
            {match.player_a_name_manual ?? "—"}
          </div>
          <div className="truncate text-sm font-medium text-ink-soft">
            {match.player_b_name_manual ?? "—"}
          </div>
          {match.actual_start_time ? (
            <div className="pt-0.5 font-mono text-xs text-ink-muted">
              <Elapsed since={match.actual_start_time} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-1.5 flex-1 text-xs text-ink-faint">目前無比賽</div>
      )}

      {refs ? (
        <div className="mt-1.5 border-t border-cream-200/70 pt-1.5">
          <span className="mr-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            裁判
          </span>
          <span className="whitespace-pre-wrap text-base font-semibold text-ink">{refs}</span>
        </div>
      ) : null}
    </div>
  );
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const start = new Date(since).getTime();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  const mm = String(Math.floor(diffSec / 60)).padStart(2, "0");
  const ss = String(diffSec % 60).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {mm}:{ss}
    </span>
  );
}
