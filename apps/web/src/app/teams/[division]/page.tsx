"use client";

import { notFound } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api-client";
import { TEAM_DIVISION_LABEL, type Team, type TeamDivision } from "@/types/models";

const VALID: TeamDivision[] = ["men", "women"];

function isDivision(value: string): value is TeamDivision {
  return (VALID as readonly string[]).includes(value);
}

export default function TeamsByDivisionPage({
  params,
}: {
  params: Promise<{ division: string }>;
}) {
  const { division } = use(params);
  if (!isDivision(division)) {
    notFound();
  }

  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Team[]>(`/teams?division=${division}`);
      setTeams(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, [division]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Teams · {division.toUpperCase()}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {TEAM_DIVISION_LABEL[division]}名單
        </h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {teams.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          此組別尚無隊伍。
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((t) => (
            <TeamRow key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({ team }: { team: Team }) {
  const members = (team.members_text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-cream-200 bg-white p-5 shadow-card md:flex-row md:items-start md:gap-6">
      <div className="md:w-52 md:shrink-0 md:border-r md:border-cream-200/70 md:pr-6">
        <h2 className="text-lg font-semibold text-ink">{team.name}</h2>
        {team.department ? (
          <div className="mt-0.5 text-sm text-ink-muted">{team.department}</div>
        ) : null}
      </div>
      {members.length > 0 ? (
        <div className="flex flex-1 flex-wrap gap-x-5 gap-y-2 md:items-center">
          {members.map((m, i) => (
            <span key={i} className="text-base text-ink md:text-lg">
              {m}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-sm text-ink-faint">尚未提供名單</div>
      )}
    </div>
  );
}
