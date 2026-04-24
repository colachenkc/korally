"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet, apiPatch } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import type { Match } from "@/types/models";

const ALL = "__all__" as const;
const OTHER = "其他";
const BASE_CATEGORIES = ["男單", "女單", "歡雙", "男團", "女團"] as const;

function baseCategoryOf(label: string | null | undefined): string {
  if (!label) return OTHER;
  for (const base of BASE_CATEGORIES) {
    if (label.startsWith(base)) return base;
  }
  return OTHER;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("zh-TW", { hour12: false });
}

function formatShortTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("zh-TW", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

export default function ResultsPage() {
  const { status: authStatus } = useAuth();
  const canEdit = authStatus === "authenticated";

  const [matches, setMatches] = useState<Match[]>([]);
  const [active, setActive] = useState<string>(ALL);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Match | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Match[]>("/matches?status=finished");
      setMatches(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      const key = baseCategoryOf(m.category_label);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const order = [...BASE_CATEGORIES, OTHER];
    return order
      .filter((c) => counts.has(c))
      .map((c) => [c, counts.get(c)!] as [string, number]);
  }, [matches]);

  const filtered = useMemo(() => {
    if (active === ALL) return matches;
    return matches.filter((m) => baseCategoryOf(m.category_label) === active);
  }, [matches, active]);

  return (
    <div className="space-y-5">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Results
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">賽果</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {matches.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          尚無已結束賽事。
        </div>
      ) : matches.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              label="全部"
              count={matches.length}
              active={active === ALL}
              onClick={() => setActive(ALL)}
            />
            {categories.map(([cat, count]) => (
              <FilterChip
                key={cat}
                label={cat}
                count={count}
                active={active === cat}
                onClick={() => setActive(cat)}
              />
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-8 text-center text-sm text-ink-muted">
              此分組無結果。
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card md:block">
                <table className="w-full text-sm">
                  <thead className="bg-cream-100/60 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">場次</th>
                      <th className="px-4 py-3">選手 A</th>
                      <th className="px-4 py-3">選手 B</th>
                      <th className="px-4 py-3">勝者</th>
                      <th className="px-4 py-3">比分</th>
                      <th className="px-4 py-3">開始</th>
                      <th className="px-4 py-3">結束</th>
                      {canEdit ? <th className="w-12 px-4 py-3" /> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200/60">
                    {filtered.map((m) => {
                      const winnerA = m.winner_name_manual === m.player_a_name_manual;
                      const winnerB = m.winner_name_manual === m.player_b_name_manual;
                      return (
                        <tr key={m.id} className="text-ink-soft">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-ink">{m.match_no}</div>
                            {m.category_label ? (
                              <div className="text-xs text-ink-muted">{m.category_label}</div>
                            ) : null}
                          </td>
                          <td className={`px-4 py-3 ${winnerA ? "font-semibold text-ink" : ""}`}>
                            {m.player_a_name_manual ?? "—"}
                          </td>
                          <td className={`px-4 py-3 ${winnerB ? "font-semibold text-ink" : ""}`}>
                            {m.player_b_name_manual ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-ink">
                            {m.winner_name_manual ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-ink-muted">
                            {m.score_summary ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                            {formatTime(m.actual_start_time)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                            {formatTime(m.actual_end_time)}
                          </td>
                          {canEdit ? (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => setEditing(m)}
                                className="text-xs font-medium text-accent-sky hover:underline"
                              >
                                編輯
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="space-y-3 md:hidden">
                {filtered.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    canEdit={canEdit}
                    onEdit={() => setEditing(m)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : null}

      {editing ? (
        <EditMatchModal
          match={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-ink bg-ink text-cream-50"
          : "border-cream-200 bg-white text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
      <span className={`ml-1.5 font-mono text-xs ${active ? "text-cream-50/70" : "text-ink-muted"}`}>
        {count}
      </span>
    </button>
  );
}

function MatchCard({
  match,
  canEdit,
  onEdit,
}: {
  match: Match;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const winnerA = match.winner_name_manual === match.player_a_name_manual;
  const winnerB = match.winner_name_manual === match.player_b_name_manual;
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-ink">{match.match_no}</div>
          {match.category_label ? (
            <div className="text-xs text-ink-muted">{match.category_label}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {match.score_summary ? (
            <div className="font-mono text-lg font-semibold text-ink">{match.score_summary}</div>
          ) : null}
          {canEdit ? (
            <button onClick={onEdit} className="text-xs font-medium text-accent-sky hover:underline">
              編輯
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-cream-200/70 pt-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${winnerA ? "bg-ink" : "bg-cream-200"}`}
          />
          <span className={`text-sm ${winnerA ? "font-semibold text-ink" : "text-ink-soft"}`}>
            {match.player_a_name_manual ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${winnerB ? "bg-ink" : "bg-cream-200"}`}
          />
          <span className={`text-sm ${winnerB ? "font-semibold text-ink" : "text-ink-soft"}`}>
            {match.player_b_name_manual ?? "—"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-ink-muted">
        <span>開始 {formatShortTime(match.actual_start_time)}</span>
        <span>結束 {formatShortTime(match.actual_end_time)}</span>
      </div>
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none";

function EditMatchModal({
  match,
  onClose,
  onSaved,
}: {
  match: Match;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [category, setCategory] = useState(match.category_label ?? "");
  const [playerA, setPlayerA] = useState(match.player_a_name_manual ?? "");
  const [playerB, setPlayerB] = useState(match.player_b_name_manual ?? "");
  const initialWinnerSide: "A" | "B" | null =
    match.winner_name_manual && match.winner_name_manual === match.player_a_name_manual
      ? "A"
      : match.winner_name_manual && match.winner_name_manual === match.player_b_name_manual
        ? "B"
        : null;
  const [winnerSide, setWinnerSide] = useState<"A" | "B" | null>(initialWinnerSide);
  const [score, setScore] = useState(match.score_summary ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const trimmedA = playerA.trim();
      const trimmedB = playerB.trim();
      const payload = {
        category_label: category.trim() || null,
        player_a_name_manual: trimmedA || null,
        player_b_name_manual: trimmedB || null,
        score_summary: score.trim() || null,
        winner_name_manual:
          winnerSide === "A" ? trimmedA || null : winnerSide === "B" ? trimmedB || null : null,
      };
      await apiPatch(`/matches/${match.id}`, payload);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-6 shadow-pop"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
              Edit / {match.match_no}
            </div>
            <h2 className="mt-1 text-xl font-semibold text-ink">編輯賽果</h2>
          </div>
          <button onClick={onClose} className="text-sm text-ink-muted hover:text-ink">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="場次類別">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={INPUT_CLASS}
              placeholder="例如：男單預(二)"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="選手 A">
              <input
                value={playerA}
                onChange={(e) => setPlayerA(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="選手 B">
              <input
                value={playerB}
                onChange={(e) => setPlayerB(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <Field label="勝者">
            <div className="grid grid-cols-2 gap-2">
              <WinnerOption
                label={`A · ${playerA || "—"}`}
                selected={winnerSide === "A"}
                onClick={() => setWinnerSide("A")}
              />
              <WinnerOption
                label={`B · ${playerB || "—"}`}
                selected={winnerSide === "B"}
                onClick={() => setWinnerSide("B")}
              />
            </div>
          </Field>

          <Field label="比分摘要" hint="選填，例如 3-1">
            <input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className={INPUT_CLASS}
              placeholder="3-1"
            />
          </Field>

          {err ? (
            <div className="rounded-lg bg-accent-coral/10 px-3 py-2 text-xs text-accent-coral">
              {err}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-sm text-ink-soft hover:bg-cream-100"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-ink px-5 py-1.5 text-sm font-medium text-cream-50 hover:bg-ink-soft disabled:opacity-50"
            >
              {saving ? "儲存中⋯" : "儲存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-ink-soft">{label}</label>
        {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function WinnerOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm transition ${
        selected
          ? "border-ink bg-ink text-cream-50"
          : "border-cream-200 bg-white text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}
