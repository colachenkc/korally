"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api-client";
import type { Standings } from "@/types/models";

export default function StandingsGroupPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = Number(params.groupId);

  const [standings, setStandings] = useState<Standings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await apiGet<Standings>(`/groups/${groupId}/standings`);
      setStandings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取排名失敗");
      setStandings(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (Number.isFinite(groupId)) void load();
  }, [groupId, load]);

  const isTeam = standings?.match_kind === "team_tie";

  return (
    <div className="space-y-5">
      <div className="text-sm">
        <Link href="/standings" className="text-ink-muted hover:text-brand">
          全部分組
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {standings?.group_name ?? "循環排名"}
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
      ) : standings && standings.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-12 text-center text-sm text-ink-muted">
          此分組尚無已完成賽事。
        </div>
      ) : standings ? (
        <div className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-100 shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/60 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              <tr>
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">{isTeam ? "隊伍" : "選手"}</th>
                <th className="px-4 py-3 text-right">已賽</th>
                <th className="px-4 py-3 text-right">勝</th>
                <th className="px-4 py-3 text-right">負</th>
                <th className="px-4 py-3 text-right">勝率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200/60">
              {standings.rows.map((row, i) => (
                <tr
                  key={`${row.entity_kind}-${row.entity_id ?? row.name}`}
                  className="text-ink-soft"
                >
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-ink">{row.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {row.matches_played}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-ink">
                    {row.wins}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink-muted">{row.losses}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-soft">
                    {(row.win_rate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
