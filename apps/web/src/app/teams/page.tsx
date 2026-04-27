"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet } from "@/lib/api-client";
import { TEAM_DIVISION_LABEL, type Team, type TeamDivision } from "@/types/models";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [active, setActive] = useState<TeamDivision>("men");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Team[]>("/teams");
      setTeams(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { men: 0, women: 0 } as Record<TeamDivision, number>;
    for (const t of teams) c[t.division] += 1;
    return c;
  }, [teams]);

  const filtered = useMemo(
    () => teams.filter((t) => t.division === active),
    [teams, active],
  );

  return (
    <div className="space-y-5">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Teams
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">團賽名單</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2">
        <DivisionTab
          label={TEAM_DIVISION_LABEL.men}
          count={counts.men}
          active={active === "men"}
          onClick={() => setActive("men")}
        />
        <DivisionTab
          label={TEAM_DIVISION_LABEL.women}
          count={counts.women}
          active={active === "women"}
          onClick={() => setActive("women")}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          {teams.length === 0 ? "尚未建立任何隊伍。" : "此組別尚無隊伍。"}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function DivisionTab({
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
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active
          ? "border-ink bg-ink text-cream-50"
          : "border-cream-200 bg-white text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 font-mono text-xs ${active ? "text-cream-50/70" : "text-ink-muted"}`}
      >
        {count}
      </span>
    </button>
  );
}

function TeamCard({ team }: { team: Team }) {
  const members = team.members_text?.trim();
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">{team.name}</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {TEAM_DIVISION_LABEL[team.division]}
        </span>
      </div>
      {team.department ? (
        <div className="mt-0.5 text-sm text-ink-muted">{team.department}</div>
      ) : null}
      {members ? (
        <div className="mt-3 border-t border-cream-200/70 pt-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            隊員
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-soft">
            {members}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
