"use client";

import { useCallback, useEffect, useState } from "react";

import { StatusBadge } from "@/components/common/StatusBadge";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { TableItem } from "@/types/models";

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-2.5 py-1.5 text-sm text-ink focus:border-ink/40 focus:outline-none";

export default function AdminTablesPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTableNo, setNewTableNo] = useState("");
  const [newZone, setNewZone] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<TableItem[]>("/tables");
      setTables(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTableNo.trim()) return;
    try {
      await apiPost("/tables", { table_no: newTableNo.trim(), zone: newZone.trim() || null });
      setNewTableNo("");
      setNewZone("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "新增失敗");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("確定刪除此球檯？")) return;
    try {
      await apiDelete(`/tables/${id}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
            Admin / Tables
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">球檯管理</h1>
        </div>
        <button
          onClick={reload}
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

      <section className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          新增球檯
        </h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
          <input
            value={newTableNo}
            onChange={(e) => setNewTableNo(e.target.value)}
            placeholder="桌號，例如 T1"
            className={INPUT_CLASS + " max-w-[180px]"}
            required
          />
          <input
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            placeholder="區域（選填）"
            className={INPUT_CLASS + " max-w-[220px]"}
          />
          <button className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-cream-50 hover:bg-ink-soft">
            新增
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          已建立球檯 {tables.length > 0 ? `（${tables.length}）` : ""}
        </h2>
        {loading && tables.length === 0 ? (
          <div className="text-sm text-ink-muted">載入中⋯</div>
        ) : tables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-10 text-center text-sm text-ink-muted">
            尚未建立任何球檯。
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {tables.map((t) => (
              <TableAdminCard
                key={t.id}
                table={t}
                onChanged={reload}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TableAdminCard({
  table,
  onChanged,
  onDelete,
}: {
  table: TableItem;
  onChanged: () => Promise<void>;
  onDelete: () => void;
}) {
  const hasMatch = !!table.current_match;

  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-lg font-semibold text-ink">{table.table_no}</div>
          <div className="text-xs text-ink-muted">{table.zone ?? "—"}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={table.status} />
          {!hasMatch ? (
            <button onClick={onDelete} className="text-xs text-accent-coral hover:underline">
              刪除
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-cream-200 pt-4">
        <RefereesInput table={table} onChanged={onChanged} />
      </div>

      <div className="mt-4 border-t border-cream-200 pt-4">
        {hasMatch ? (
          <FinishMatchForm table={table} onChanged={onChanged} />
        ) : (
          <StartMatchForm table={table} onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}

const GROUP_OPTIONS = ["男單", "女單", "歡雙", "男團", "女團"] as const;
const STAGE_OPTIONS = ["預", "決"] as const;

function StartMatchForm({ table, onChanged }: { table: TableItem; onChanged: () => Promise<void> }) {
  const [group, setGroup] = useState<(typeof GROUP_OPTIONS)[number]>(GROUP_OPTIONS[0]);
  const [stage, setStage] = useState<(typeof STAGE_OPTIONS)[number]>(STAGE_OPTIONS[0]);
  const [session, setSession] = useState("");
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const combined = `${group}${stage}${session.trim()}`;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!playerA.trim() || !playerB.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await apiPost(`/tables/${table.id}/start-match`, {
        player_a_name: playerA.trim(),
        player_b_name: playerB.trim(),
        category_label: combined,
      });
      setSession("");
      setPlayerA("");
      setPlayerB("");
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "啟動失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleStart} className="space-y-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        開始比賽
      </div>
      <div className="grid grid-cols-[1fr_auto_1.2fr] gap-1.5">
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value as (typeof GROUP_OPTIONS)[number])}
          className={INPUT_CLASS}
        >
          {GROUP_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as (typeof STAGE_OPTIONS)[number])}
          className={INPUT_CLASS}
        >
          {STAGE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={session}
          onChange={(e) => setSession(e.target.value)}
          placeholder="場次（例：(二)）"
          className={INPUT_CLASS}
        />
      </div>
      <div className="text-xs text-ink-muted">
        將儲存為 <span className="font-medium text-ink">{combined}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={playerA}
          onChange={(e) => setPlayerA(e.target.value)}
          placeholder="選手 A"
          className={INPUT_CLASS}
          required
        />
        <input
          value={playerB}
          onChange={(e) => setPlayerB(e.target.value)}
          placeholder="選手 B"
          className={INPUT_CLASS}
          required
        />
      </div>
      {err ? <div className="text-xs text-accent-coral">{err}</div> : null}
      <button
        disabled={submitting}
        className="w-full rounded-full bg-accent-sky px-3 py-2 text-sm font-medium text-white hover:bg-accent-sky/90 disabled:opacity-50"
      >
        {submitting ? "啟動中⋯" : "開始比賽"}
      </button>
    </form>
  );
}

function FinishMatchForm({ table, onChanged }: { table: TableItem; onChanged: () => Promise<void> }) {
  const match = table.current_match!;
  const [scoreSummary, setScoreSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function finish(winnerSide: "A" | "B") {
    setSubmitting(true);
    setErr(null);
    try {
      await apiPost(`/tables/${table.id}/finish-match`, {
        winner_side: winnerSide,
        score_summary: scoreSummary.trim() || null,
      });
      setScoreSummary("");
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "結束失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          進行中
        </span>
        <span className="font-mono text-xs text-ink-muted">{match.match_no}</span>
        {match.category_label ? (
          <span className="text-xs font-medium text-ink">{match.category_label}</span>
        ) : null}
      </div>
      <div className="rounded-lg bg-cream-50 px-3 py-2 text-sm">
        <span className="font-medium text-ink">{match.player_a_name_manual}</span>
        <span className="mx-2 font-mono text-ink-muted">vs</span>
        <span className="font-medium text-ink">{match.player_b_name_manual}</span>
      </div>
      <input
        value={scoreSummary}
        onChange={(e) => setScoreSummary(e.target.value)}
        placeholder="比分摘要（選填，例如 3-1）"
        className={INPUT_CLASS}
      />
      {err ? <div className="text-xs text-accent-coral">{err}</div> : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={submitting}
          onClick={() => finish("A")}
          className="rounded-full bg-ink px-3 py-2 text-sm font-medium text-cream-50 hover:bg-ink-soft disabled:opacity-50"
        >
          A 勝
        </button>
        <button
          disabled={submitting}
          onClick={() => finish("B")}
          className="rounded-full bg-ink px-3 py-2 text-sm font-medium text-cream-50 hover:bg-ink-soft disabled:opacity-50"
        >
          B 勝
        </button>
      </div>
    </div>
  );
}

function RefereesInput({ table, onChanged }: { table: TableItem; onChanged: () => Promise<void> }) {
  const [value, setValue] = useState(table.referees_text ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = value !== (table.referees_text ?? "");

  async function handleSave() {
    setSaving(true);
    setErr(null);
    try {
      await apiPatch(`/tables/${table.id}`, {
        referees_text: value.trim() || null,
      });
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          裁判
        </span>
        {dirty ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium text-accent-sky hover:underline disabled:opacity-50"
          >
            {saving ? "儲存中⋯" : "儲存"}
          </button>
        ) : null}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="一行一位裁判（選填）"
        className={INPUT_CLASS}
      />
      {err ? <div className="text-xs text-accent-coral">{err}</div> : null}
    </div>
  );
}
