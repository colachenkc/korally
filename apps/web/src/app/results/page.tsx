"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import type { Group, Match, MatchKind, Team } from "@/types/models";
import { MATCH_KIND_LABEL } from "@/types/models";

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

type SideNames = {
  a: string;
  b: string;
  winner: string;
};

function sideNamesOf(m: Match, teamsById: Map<number, Team>): SideNames {
  if (m.match_kind === "team_tie") {
    const teamA = m.team_a_id ? teamsById.get(m.team_a_id) : null;
    const teamB = m.team_b_id ? teamsById.get(m.team_b_id) : null;
    const winner = m.winner_team_id ? teamsById.get(m.winner_team_id) : null;
    return {
      a: teamA?.name ?? m.player_a_name_manual ?? "—",
      b: teamB?.name ?? m.player_b_name_manual ?? "—",
      winner: winner?.name ?? m.winner_name_manual ?? "—",
    };
  }
  return {
    a: m.player_a_name_manual ?? "—",
    b: m.player_b_name_manual ?? "—",
    winner: m.winner_name_manual ?? "—",
  };
}

export default function ResultsPage() {
  const { role } = useAuth();
  const canEdit = role === "admin";

  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [active, setActive] = useState<string>(ALL);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Match | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const load = useCallback(async () => {
    try {
      const [m, t, g] = await Promise.all([
        apiGet<Match[]>("/matches?status=finished"),
        apiGet<Team[]>("/teams"),
        apiGet<Group[]>("/groups"),
      ]);
      setMatches(m);
      setTeams(t);
      setGroups(g);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(
    async (m: Match) => {
      const label = m.match_no || `#${m.id}`;
      if (!window.confirm(`確定刪除賽果 ${label}？此動作無法復原。`)) return;
      setDeletingId(m.id);
      try {
        await apiDelete(`/matches/${m.id}`);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "刪除失敗");
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">賽果</h1>
        </div>
        {canEdit ? (
          <button
            onClick={() => setCreating(true)}
            className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-cream-50 hover:bg-ink-soft"
          >
            + 新增賽果
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {matches.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-12 text-center text-sm text-ink-muted">
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
            <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-8 text-center text-sm text-ink-muted">
              此分組無結果。
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-cream-200 bg-cream-100 shadow-card md:block">
                <table className="w-full text-sm">
                  <thead className="bg-cream-100/60 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">場次</th>
                      <th className="px-4 py-3">類型</th>
                      <th className="px-4 py-3">A 方</th>
                      <th className="px-4 py-3">B 方</th>
                      <th className="px-4 py-3">勝方</th>
                      <th className="px-4 py-3">比分</th>
                      <th className="px-4 py-3">開始</th>
                      <th className="px-4 py-3">結束</th>
                      {canEdit ? <th className="w-24 px-4 py-3" /> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200/60">
                    {filtered.map((m) => {
                      const names = sideNamesOf(m, teamsById);
                      const winnerIsA = m.match_kind === "team_tie"
                        ? m.winner_team_id != null && m.winner_team_id === m.team_a_id
                        : names.winner === names.a && names.a !== "—";
                      const winnerIsB = m.match_kind === "team_tie"
                        ? m.winner_team_id != null && m.winner_team_id === m.team_b_id
                        : names.winner === names.b && names.b !== "—";
                      return (
                        <tr key={m.id} className="text-ink-soft">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-ink">{m.match_no}</div>
                            {m.category_label ? (
                              <div className="text-xs text-ink-muted">{m.category_label}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-xs text-ink-muted">
                            {MATCH_KIND_LABEL[m.match_kind] ?? m.match_kind}
                          </td>
                          <td className={`px-4 py-3 ${winnerIsA ? "font-semibold text-ink" : ""}`}>
                            {names.a}
                          </td>
                          <td className={`px-4 py-3 ${winnerIsB ? "font-semibold text-ink" : ""}`}>
                            {names.b}
                          </td>
                          <td className="px-4 py-3 font-medium text-ink">{names.winner}</td>
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
                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => setEditing(m)}
                                  className="text-xs font-medium text-accent-sky hover:underline"
                                >
                                  編輯
                                </button>
                                <button
                                  onClick={() => handleDelete(m)}
                                  disabled={deletingId === m.id}
                                  className="text-xs font-medium text-accent-coral hover:underline disabled:opacity-50"
                                >
                                  {deletingId === m.id ? "刪除中⋯" : "刪除"}
                                </button>
                              </div>
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
                    teamsById={teamsById}
                    canEdit={canEdit}
                    deleting={deletingId === m.id}
                    onEdit={() => setEditing(m)}
                    onDelete={() => handleDelete(m)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : null}

      {editing ? (
        <MatchFormModal
          mode="edit"
          match={editing}
          teams={teams}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : null}

      {creating ? (
        <MatchFormModal
          mode="create"
          match={null}
          teams={teams}
          groups={groups}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
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
          : "border-cream-200 bg-cream-100 text-ink-soft hover:border-ink/30"
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
  teamsById,
  canEdit,
  deleting,
  onEdit,
  onDelete,
}: {
  match: Match;
  teamsById: Map<number, Team>;
  canEdit: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const names = sideNamesOf(match, teamsById);
  const winnerIsA = match.match_kind === "team_tie"
    ? match.winner_team_id != null && match.winner_team_id === match.team_a_id
    : names.winner === names.a && names.a !== "—";
  const winnerIsB = match.match_kind === "team_tie"
    ? match.winner_team_id != null && match.winner_team_id === match.team_b_id
    : names.winner === names.b && names.b !== "—";
  return (
    <div className="rounded-2xl border border-cream-200 bg-cream-100 p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-ink">{match.match_no}</div>
          <div className="text-xs text-ink-muted">
            {MATCH_KIND_LABEL[match.match_kind] ?? match.match_kind}
            {match.category_label ? ` · ${match.category_label}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {match.score_summary ? (
            <div className="font-mono text-lg font-semibold text-ink">{match.score_summary}</div>
          ) : null}
          {canEdit ? (
            <>
              <button onClick={onEdit} className="text-xs font-medium text-accent-sky hover:underline">
                編輯
              </button>
              <button
                onClick={onDelete}
                disabled={deleting}
                className="text-xs font-medium text-accent-coral hover:underline disabled:opacity-50"
              >
                {deleting ? "刪除中⋯" : "刪除"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-cream-200/70 pt-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${winnerIsA ? "bg-ink" : "bg-cream-200"}`} />
          <span className={`text-sm ${winnerIsA ? "font-semibold text-ink" : "text-ink-soft"}`}>
            {names.a}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${winnerIsB ? "bg-ink" : "bg-cream-200"}`} />
          <span className={`text-sm ${winnerIsB ? "font-semibold text-ink" : "text-ink-soft"}`}>
            {names.b}
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

type FormMode = "create" | "edit";

function MatchFormModal({
  mode,
  match,
  teams,
  groups,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  match: Match | null;
  teams: Team[];
  groups: Group[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<MatchKind>(match?.match_kind ?? "singles");
  const [category, setCategory] = useState(match?.category_label ?? "");
  const [groupId, setGroupId] = useState<number | "">(match?.group_id ?? "");

  const [playerA, setPlayerA] = useState(match?.player_a_name_manual ?? "");
  const [playerB, setPlayerB] = useState(match?.player_b_name_manual ?? "");
  const [teamAId, setTeamAId] = useState<number | "">(match?.team_a_id ?? "");
  const [teamBId, setTeamBId] = useState<number | "">(match?.team_b_id ?? "");

  const initialWinnerSide: "A" | "B" | null =
    match == null
      ? null
      : kind === "team_tie"
        ? match.winner_team_id != null && match.winner_team_id === match.team_a_id
          ? "A"
          : match.winner_team_id != null && match.winner_team_id === match.team_b_id
            ? "B"
            : null
        : match.winner_name_manual && match.winner_name_manual === match.player_a_name_manual
          ? "A"
          : match.winner_name_manual && match.winner_name_manual === match.player_b_name_manual
            ? "B"
            : null;
  const [winnerSide, setWinnerSide] = useState<"A" | "B" | null>(initialWinnerSide);

  const [score, setScore] = useState(match?.score_summary ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isTeam = kind === "team_tie";

  const winnerLabelA = isTeam
    ? teams.find((t) => t.id === teamAId)?.name ?? "A"
    : `A · ${playerA || "—"}`;
  const winnerLabelB = isTeam
    ? teams.find((t) => t.id === teamBId)?.name ?? "B"
    : `B · ${playerB || "—"}`;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const trimmedA = playerA.trim();
      const trimmedB = playerB.trim();
      const payload: Record<string, unknown> = {
        match_kind: kind,
        category_label: category.trim() || null,
        group_id: groupId === "" ? null : Number(groupId),
        score_summary: score.trim() || null,
      };
      if (isTeam) {
        payload.team_a_id = teamAId === "" ? null : Number(teamAId);
        payload.team_b_id = teamBId === "" ? null : Number(teamBId);
        payload.winner_team_id =
          winnerSide === "A"
            ? (teamAId === "" ? null : Number(teamAId))
            : winnerSide === "B"
              ? (teamBId === "" ? null : Number(teamBId))
              : null;
        // Clear player fields when switching to team_tie
        payload.player_a_name_manual = null;
        payload.player_b_name_manual = null;
        payload.winner_name_manual = null;
      } else {
        payload.player_a_name_manual = trimmedA || null;
        payload.player_b_name_manual = trimmedB || null;
        payload.winner_name_manual =
          winnerSide === "A" ? trimmedA || null : winnerSide === "B" ? trimmedB || null : null;
        payload.team_a_id = null;
        payload.team_b_id = null;
        payload.winner_team_id = null;
      }
      if (mode === "create") {
        payload.status = "finished";
        await apiPost("/matches", payload);
      } else if (match) {
        await apiPatch(`/matches/${match.id}`, payload);
      }
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-cream-200 bg-cream-100 p-6 shadow-pop"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              {mode === "create" ? "新增賽果" : "編輯賽果"}
            </h2>
          </div>
          <button onClick={onClose} className="text-sm text-ink-muted hover:text-ink">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Field label="類型">
            <div className="grid grid-cols-3 gap-2">
              {(["singles", "doubles", "team_tie"] as MatchKind[]).map((k) => (
                <KindOption
                  key={k}
                  label={MATCH_KIND_LABEL[k]}
                  selected={kind === k}
                  onClick={() => {
                    setKind(k);
                    setWinnerSide(null);
                  }}
                />
              ))}
            </div>
          </Field>

          <Field label="場次類別">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={INPUT_CLASS}
              placeholder="例如：男單A循環 / 男團循環"
            />
          </Field>

          <Field label="所屬分組" hint="選填；若要進排名表，選一個分組">
            <select
              value={groupId === "" ? "" : String(groupId)}
              onChange={(e) => setGroupId(e.target.value === "" ? "" : Number(e.target.value))}
              className={INPUT_CLASS}
            >
              <option value="">— 不歸類 —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          {isTeam ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="A 隊">
                <select
                  value={teamAId === "" ? "" : String(teamAId)}
                  onChange={(e) => setTeamAId(e.target.value === "" ? "" : Number(e.target.value))}
                  className={INPUT_CLASS}
                >
                  <option value="">— 請選擇 —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.division === "men" ? "男" : "女"})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="B 隊">
                <select
                  value={teamBId === "" ? "" : String(teamBId)}
                  onChange={(e) => setTeamBId(e.target.value === "" ? "" : Number(e.target.value))}
                  className={INPUT_CLASS}
                >
                  <option value="">— 請選擇 —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.division === "men" ? "男" : "女"})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : (
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
          )}

          <Field label="勝方">
            <div className="grid grid-cols-2 gap-2">
              <WinnerOption
                label={winnerLabelA}
                selected={winnerSide === "A"}
                onClick={() => setWinnerSide("A")}
              />
              <WinnerOption
                label={winnerLabelB}
                selected={winnerSide === "B"}
                onClick={() => setWinnerSide("B")}
              />
            </div>
          </Field>

          <Field label="比分摘要" hint={isTeam ? "團體大比分，例如 3-2" : "選填，例如 3-1"}>
            <input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className={INPUT_CLASS}
              placeholder={isTeam ? "3-2" : "3-1"}
            />
          </Field>

          {err ? (
            <div className="rounded-lg bg-accent-coral/10 px-3 py-2 text-xs text-accent-coral">{err}</div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink/15 bg-cream-100 px-4 py-1.5 text-sm text-ink-soft hover:bg-cream-100"
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

function KindOption({
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
          : "border-cream-200 bg-cream-100 text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
    </button>
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
          : "border-cream-200 bg-cream-100 text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}
