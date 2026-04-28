"use client";

import { notFound } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import {
  PARTICIPANT_CATEGORY_LABEL,
  type Participant,
  type ParticipantCategory,
} from "@/types/models";

const VALID: ParticipantCategory[] = ["men_singles", "women_singles", "doubles"];

function isCategory(value: string): value is ParticipantCategory {
  return (VALID as readonly string[]).includes(value);
}

export default function ParticipantsByCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  if (!isCategory(category)) {
    notFound();
  }

  const [people, setPeople] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { status: authStatus, role } = useAuth();
  const canCheckIn = authStatus === "authenticated";
  const canUndo = role === "admin";

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Participant[]>(`/participants?category=${category}`);
      setPeople(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCheckIn(id: number) {
    setBusyId(id);
    try {
      await apiPost(`/participants/${id}/check-in`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "報到失敗");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUndo(id: number) {
    setBusyId(id);
    try {
      await apiDelete(`/participants/${id}/check-in`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消失敗");
    } finally {
      setBusyId(null);
    }
  }

  const summary = useMemo(() => {
    const total = people.length;
    const checked = people.filter((p) => p.checked_in).length;
    return { total, checked };
  }, [people]);

  const isDoubles = category === "doubles";

  // For doubles, group rows by pair_no into pairs of 2.
  const pairs = useMemo(() => {
    if (!isDoubles) return null;
    const groups = new Map<number, Participant[]>();
    for (const p of people) {
      const key = p.pair_no ?? -1;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    // Sort by pair_no asc; -1 (unpaired) at end.
    return Array.from(groups.entries())
      .sort(([a], [b]) => (a < 0 ? 1 : b < 0 ? -1 : a - b))
      .map(([pair_no, members]) => ({ pair_no, members }));
  }, [people, isDoubles]);

  return (
    <div className="space-y-5">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Participants · {category.replace("_", " ").toUpperCase()}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {PARTICIPANT_CATEGORY_LABEL[category]}參賽名單
        </h1>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <Chip label="總人數" value={summary.total} />
        <Chip label="已報到" value={summary.checked} tone="green" />
        <Chip label="未報到" value={summary.total - summary.checked} tone="cream" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {people.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          此組別尚無參賽名單。
        </div>
      ) : isDoubles ? (
        <div className="space-y-2">
          {pairs!.map(({ pair_no, members }) => (
            <PairRow
              key={pair_no}
              pairNo={pair_no}
              members={members}
              actions={{ busyId, canCheckIn, canUndo, onCheckIn: handleCheckIn, onUndo: handleUndo }}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card">
          <ul className="divide-y divide-cream-200/60">
            {people.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                actions={{ busyId, canCheckIn, canUndo, onCheckIn: handleCheckIn, onUndo: handleUndo }}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  value,
  tone = "cream",
}: {
  label: string;
  value: number;
  tone?: "cream" | "green";
}) {
  const toneClass =
    tone === "green"
      ? "bg-accent-sky/10 text-accent-sky"
      : "bg-cream-100 text-ink-soft";
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${toneClass}`}>
      <span className="text-xs">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}

type RowActions = {
  busyId: number | null;
  canCheckIn: boolean;
  canUndo: boolean;
  onCheckIn: (id: number) => void;
  onUndo: (id: number) => void;
};

function PersonRow({ person, actions }: { person: Participant; actions: RowActions }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-base font-medium text-ink md:text-lg">{person.name}</div>
        <PersonMeta team={person.team} studentId={person.student_id} />
      </div>
      <CheckInControl person={person} actions={actions} />
    </li>
  );
}

function PairRow({
  pairNo,
  members,
  actions,
}: {
  pairNo: number;
  members: Participant[];
  actions: RowActions;
}) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          {pairNo > 0 ? `Pair ${pairNo}` : "未配對"}
        </span>
      </div>
      <ul className="divide-y divide-cream-200/60">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-base font-medium text-ink md:text-lg">{m.name}</div>
              <PersonMeta team={m.team} studentId={m.student_id} />
            </div>
            <CheckInControl person={m} actions={actions} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonMeta({
  team,
  studentId,
}: {
  team: string | null;
  studentId: string | null;
}) {
  if (!team && !studentId) return null;
  return (
    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {team ? (
        <span className="text-xs text-ink-muted md:text-sm">{team}</span>
      ) : null}
      {studentId ? (
        <span className="font-mono text-[11px] text-ink-faint md:text-xs">{studentId}</span>
      ) : null}
    </div>
  );
}

function CheckInControl({
  person,
  actions,
}: {
  person: Participant;
  actions: RowActions;
}) {
  const busy = actions.busyId === person.id;
  const checked = person.checked_in;
  const clickable = checked ? actions.canUndo : actions.canCheckIn;

  const checkedClass =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-sky/15 px-3 py-1 text-xs font-medium text-accent-sky";
  const uncheckedClass =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-xs font-medium text-ink-faint";

  const inner = checked ? (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      已報到
    </>
  ) : (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
      未報到
    </>
  );

  if (!clickable) {
    return <span className={checked ? checkedClass : uncheckedClass}>{inner}</span>;
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => (checked ? actions.onUndo(person.id) : actions.onCheckIn(person.id))}
      title={checked ? "點此取消報到" : "點此標記報到"}
      className={`${checked ? checkedClass : uncheckedClass} cursor-pointer transition hover:brightness-95 disabled:opacity-50`}
    >
      {busy ? <span className="font-mono">⋯</span> : inner}
    </button>
  );
}
