"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type { CallSide, MainDesk, TableItem } from "@/types/models";

const REFRESH_MS = 5000;

const SIDE_LABEL: Record<CallSide, string> = {
  A: "A 方",
  B: "B 方",
  BOTH: "兩位",
};

export default function LivePage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [mainDesks, setMainDesks] = useState<MainDesk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [callTarget, setCallTarget] = useState<TableItem | null>(null);
  const [busyTableId, setBusyTableId] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { status: authStatus } = useAuth();
  const isAuthed = authStatus === "authenticated";

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

  async function submitCall(tableId: number, side: CallSide) {
    setBusyTableId(tableId);
    try {
      await apiPost(`/tables/${tableId}/call`, { side });
      setCallTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "唱名失敗");
    } finally {
      setBusyTableId(null);
    }
  }

  async function markBroadcasted(tableId: number) {
    setBusyTableId(tableId);
    try {
      await apiPost(`/tables/${tableId}/call/broadcast`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "標記廣播失敗");
    } finally {
      setBusyTableId(null);
    }
  }

  async function clearCall(tableId: number) {
    setBusyTableId(tableId);
    try {
      await apiDelete(`/tables/${tableId}/call`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "清除唱名失敗");
    } finally {
      setBusyTableId(null);
    }
  }

  const summary = {
    total: tables.length,
    inProgress: tables.filter((t) => t.status === "in_progress").length,
    idle: tables.filter((t) => t.status === "idle").length,
  };

  const pendingBroadcast = tables.filter((t) => t.call_side && !t.call_broadcasted_at);

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

      {pendingBroadcast.length > 0 ? (
        <CallBanner
          tables={pendingBroadcast}
          isAuthed={isAuthed}
          busyTableId={busyTableId}
          onBroadcast={markBroadcasted}
        />
      ) : null}

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
                <LiveTableCard
                  key={t.id}
                  table={t}
                  isAuthed={isAuthed}
                  busy={busyTableId === t.id}
                  onCall={() => setCallTarget(t)}
                  onClearCall={() => clearCall(t.id)}
                />
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

      {callTarget ? (
        <CallModal
          table={callTarget}
          busy={busyTableId === callTarget.id}
          onClose={() => setCallTarget(null)}
          onSubmit={(side) => submitCall(callTarget.id, side)}
        />
      ) : null}
    </div>
  );
}

function CallBanner({
  tables,
  isAuthed,
  busyTableId,
  onBroadcast,
}: {
  tables: TableItem[];
  isAuthed: boolean;
  busyTableId: number | null;
  onBroadcast: (id: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-accent-coral/40 bg-accent-coral/10 p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent-coral">
          請廣播 / Call players
        </span>
        <span className="font-mono text-xs text-accent-coral/80">{tables.length}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {tables.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/70 px-4 py-2.5"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-base font-semibold text-ink">{t.table_no}</span>
              <span className="text-sm text-ink-muted">
                {t.call_side ? SIDE_LABEL[t.call_side] : ""} 唱名未到
              </span>
              <span className="text-base font-semibold text-ink">{t.call_player_name}</span>
              {t.call_created_at ? (
                <span className="font-mono text-xs text-ink-faint">
                  <CallElapsed since={t.call_created_at} />
                </span>
              ) : null}
            </div>
            {isAuthed ? (
              <button
                onClick={() => onBroadcast(t.id)}
                disabled={busyTableId === t.id}
                className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream-50 hover:bg-ink-soft disabled:opacity-50"
              >
                {busyTableId === t.id ? "處理中⋯" : "已廣播"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
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

function LiveTableCard({
  table,
  isAuthed,
  busy,
  onCall,
  onClearCall,
}: {
  table: TableItem;
  isAuthed: boolean;
  busy: boolean;
  onCall: () => void;
  onClearCall: () => void;
}) {
  const match = table.current_match;
  const refs = table.referees_text?.trim();
  const calling = !!table.call_side;
  const callPending = calling && !table.call_broadcasted_at;

  const accentBar = callPending
    ? "before:bg-accent-coral"
    : calling
      ? "before:bg-accent-butter"
      : table.status === "in_progress"
        ? "before:bg-accent-sky"
        : table.status === "delayed"
          ? "before:bg-accent-coral"
          : "before:bg-cream-200";

  const cardBg = callPending
    ? "bg-accent-coral/10"
    : calling
      ? "bg-accent-butter/15"
      : "bg-white";

  return (
    <div
      className={`relative flex min-h-[135px] flex-col overflow-hidden rounded-xl border border-cream-200 ${cardBg} p-2.5 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-1 ${accentBar}`}
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

      {calling ? (
        <div
          className={`mt-1.5 rounded-lg border px-2 py-1.5 ${
            table.call_broadcasted_at
              ? "border-accent-butter bg-accent-butter/30"
              : "border-accent-coral/40 bg-white/70"
          }`}
        >
          <div
            className={`font-mono text-[10px] uppercase tracking-widest ${
              table.call_broadcasted_at ? "text-ink-soft" : "text-accent-coral"
            }`}
          >
            {table.call_broadcasted_at ? "已廣播 · 等選手到" : "唱名未到 · 待廣播"}
            {table.call_side ? ` · ${SIDE_LABEL[table.call_side]}` : ""}
          </div>
          <div className="truncate text-sm font-semibold text-ink">
            {table.call_player_name}
          </div>
          {isAuthed ? (
            <button
              onClick={onClearCall}
              disabled={busy}
              className="mt-1.5 w-full rounded-md bg-ink px-2 py-1 text-xs font-medium text-cream-50 hover:bg-ink-soft disabled:opacity-50"
            >
              {busy ? "⋯" : "選手已到"}
            </button>
          ) : null}
        </div>
      ) : isAuthed && match ? (
        <button
          onClick={onCall}
          disabled={busy}
          className="mt-1.5 w-full rounded-md border border-accent-coral/40 bg-accent-coral/10 px-2 py-1 text-xs font-medium text-accent-coral hover:bg-accent-coral/20 disabled:opacity-50"
        >
          🔔 唱名未到
        </button>
      ) : null}

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

function CallModal({
  table,
  busy,
  onClose,
  onSubmit,
}: {
  table: TableItem;
  busy: boolean;
  onClose: () => void;
  onSubmit: (side: CallSide) => void;
}) {
  const match = table.current_match;
  const nameA = match?.player_a_name_manual?.trim() || "選手 A";
  const nameB = match?.player_b_name_manual?.trim() || "選手 B";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
          {table.table_no} · 唱名未到
        </div>
        <div className="mt-1 text-base font-medium text-ink">請選擇未到的選手</div>

        <div className="mt-4 space-y-2">
          <CallChoiceButton
            disabled={busy}
            onClick={() => onSubmit("A")}
            tag="A"
            name={nameA}
          />
          <CallChoiceButton
            disabled={busy}
            onClick={() => onSubmit("B")}
            tag="B"
            name={nameB}
          />
          <CallChoiceButton
            disabled={busy}
            onClick={() => onSubmit("BOTH")}
            tag="A+B"
            name="兩位都未到"
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function CallChoiceButton({
  tag,
  name,
  onClick,
  disabled,
}: {
  tag: string;
  name: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-cream-200 bg-cream-50 px-4 py-3 text-left transition hover:border-accent-coral/40 hover:bg-accent-coral/10 disabled:opacity-50"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">{tag}</span>
      <span className="flex-1 truncate text-sm font-medium text-ink">{name}</span>
      <span className="text-xs text-accent-coral">唱名未到 →</span>
    </button>
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

function CallElapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const start = new Date(since).getTime();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  if (diffSec < 60) return <span>剛剛</span>;
  const mm = Math.floor(diffSec / 60);
  return <span>{mm} 分前</span>;
}
