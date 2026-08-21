"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api-client";
import type { Group, Stage } from "@/types/models";

const UNASSIGNED = "__unassigned__";

export default function StandingsIndexPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiGet<Stage[]>("/stages"), apiGet<Group[]>("/groups")])
      .then(([s, g]) => {
        setStages(s);
        setGroups(g);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "讀取失敗"))
      .finally(() => setLoading(false));
  }, []);

  const groupsByStage = useMemo(() => {
    const m = new Map<string, Group[]>();
    for (const g of groups) {
      const key = g.stage_id != null ? String(g.stage_id) : UNASSIGNED;
      const arr = m.get(key) ?? [];
      arr.push(g);
      m.set(key, arr);
    }
    return m;
  }, [groups]);

  const unassigned = groupsByStage.get(UNASSIGNED) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">循環排名</h1>
        {isAdmin ? (
          <Link
            href="/admin/groups"
            className="rounded-full border border-cream-300 bg-cream-100 px-3 py-1.5 text-sm text-ink-soft hover:bg-cream-200"
          >
            編輯分組
          </Link>
        ) : null}
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
      ) : groups.length === 0 && stages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-12 text-center text-sm text-ink-muted">
          尚無分組。
          {isAdmin ? (
            <>
              {" "}
              請至{" "}
              <Link href="/admin/groups" className="text-brand hover:underline">
                循環賽分組
              </Link>{" "}
              建立。
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          {stages.map((s) => (
            <StageBlock
              key={s.id}
              title={s.name}
              groups={groupsByStage.get(String(s.id)) ?? []}
            />
          ))}
          {unassigned.length > 0 ? (
            <StageBlock title="未分類" muted groups={unassigned} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function StageBlock({
  title,
  muted,
  groups,
}: {
  title: string;
  muted?: boolean;
  groups: Group[];
}) {
  return (
    <section className="space-y-3">
      <h2 className={`text-lg font-semibold ${muted ? "text-ink-muted" : "text-ink"}`}>
        {title}
        <span className="ml-2 font-mono text-xs text-ink-muted">({groups.length})</span>
      </h2>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-6 text-center text-xs text-ink-muted">
          此大組尚無循環分組
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/standings/${g.id}`}
              className="group rounded-2xl border border-cream-200 bg-cream-100 p-5 shadow-card transition hover:border-ink/25 hover:shadow-pop"
            >
              <div className="text-base font-semibold text-ink">{g.name}</div>
              <div className="mt-3 text-xs text-ink-muted group-hover:text-brand">
                查看排名
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
