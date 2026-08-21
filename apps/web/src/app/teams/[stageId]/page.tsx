"use client";

import { notFound } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api-client";
import type { Stage, Team } from "@/types/models";

export default function TeamsByStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = use(params);
  const parsed = Number(stageId);
  if (!Number.isFinite(parsed)) notFound();

  const [stage, setStage] = useState<Stage | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [stages, ts] = await Promise.all([
        apiGet<Stage[]>("/stages"),
        apiGet<Team[]>(`/teams?stage_id=${parsed}`),
      ]);
      const s = stages.find((x) => x.id === parsed) ?? null;
      setStage(s);
      setTeams(ts);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }, [parsed]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {stage ? `${stage.name}名單` : "團賽名單"}
        </h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-12 text-center text-sm text-ink-muted">
          讀取中⋯
        </div>
      ) : teams.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-12 text-center text-sm text-ink-muted">
          此大組尚無隊伍。
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
    <div className="flex flex-col gap-3 rounded-2xl border border-cream-200 bg-cream-100 p-5 shadow-card md:flex-row md:items-start md:gap-6">
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
