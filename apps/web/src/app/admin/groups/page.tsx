"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Group, Stage } from "@/types/models";

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-2.5 py-1.5 text-sm text-ink focus:border-ink/40 focus:outline-none";

const UNASSIGNED = "__unassigned__";

export default function AdminGroupsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newStageName, setNewStageName] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupOrder, setNewGroupOrder] = useState("");
  const [newGroupStageId, setNewGroupStageId] = useState<number | "">("");

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

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, g] = await Promise.all([
        apiGet<Stage[]>("/stages"),
        apiGet<Group[]>("/groups"),
      ]);
      setStages(s);
      setGroups(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createStage(e: React.FormEvent) {
    e.preventDefault();
    const name = newStageName.trim();
    if (!name) return;
    try {
      await apiPost("/stages", { name, sort_order: stages.length });
      setNewStageName("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "新增大組失敗");
    }
  }

  async function renameStage(s: Stage) {
    const next = window.prompt("新名稱", s.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === s.name) return;
    try {
      await apiPatch(`/stages/${s.id}`, { name: trimmed });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失敗");
    }
  }

  async function reorderStage(s: Stage, delta: number) {
    try {
      await apiPatch(`/stages/${s.id}`, { sort_order: s.sort_order + delta });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失敗");
    }
  }

  async function deleteStage(s: Stage) {
    const groupCount = groupsByStage.get(String(s.id))?.length ?? 0;
    const msg = groupCount
      ? `「${s.name}」底下有 ${groupCount} 個循環分組，刪除後這些循環分組會變成「未分類」。確定刪除大組？`
      : `確定刪除大組「${s.name}」？`;
    if (!window.confirm(msg)) return;
    try {
      await apiDelete(`/stages/${s.id}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await apiPost("/groups", {
        name,
        display_order: newGroupOrder.trim() ? Number(newGroupOrder) : 0,
        stage_id: newGroupStageId === "" ? null : Number(newGroupStageId),
      });
      setNewGroupName("");
      setNewGroupOrder("");
      // Keep stage selection so multiple groups in one stage are quick to add.
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "新增循環分組失敗");
    }
  }

  async function renameGroup(g: Group) {
    const next = window.prompt("新名稱", g.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === g.name) return;
    try {
      await apiPatch(`/groups/${g.id}`, { name: trimmed });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失敗");
    }
  }

  async function moveGroup(g: Group) {
    const next = window.prompt(
      "移到大組（輸入數字 id，留空 = 未分類）\n" +
        stages.map((s) => `${s.id} = ${s.name}`).join("\n"),
      g.stage_id != null ? String(g.stage_id) : "",
    );
    if (next === null) return;
    const stageId = next.trim() === "" ? null : Number(next.trim());
    if (stageId !== null && !stages.some((s) => s.id === stageId)) {
      setError("找不到該大組 id");
      return;
    }
    try {
      await apiPatch(`/groups/${g.id}`, { stage_id: stageId });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失敗");
    }
  }

  async function deleteGroup(g: Group) {
    if (!window.confirm(`確定刪除循環分組「${g.name}」？已建立的賽果不會被刪，只是脫離此分組。`))
      return;
    try {
      await apiDelete(`/groups/${g.id}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    }
  }

  const unassigned = groupsByStage.get(UNASSIGNED) ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">循環賽分組</h1>
          <p className="mt-1 text-sm text-ink-muted">
            大組（公開男單 / 男團…）→ 底下多個循環分組（A 組 / B 組）→ 各分組收集賽果並算排名。
          </p>
        </div>
        <button
          onClick={reload}
          className="rounded-full border border-cream-300 bg-cream-100 px-3 py-1 text-sm text-ink-soft hover:bg-cream-200"
        >
          重新整理
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {/* Stage CRUD */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">大組</h2>
        <form
          onSubmit={createStage}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-cream-200 bg-cream-100 p-4"
        >
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">大組名稱</label>
            <input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className={INPUT_CLASS}
              placeholder="例如：公開男單"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-1.5 text-sm font-semibold text-cream-50 hover:brightness-110"
          >
            + 新增大組
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-100">
          <table className="w-full text-sm">
            <thead className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              <tr>
                <th className="px-4 py-3">名稱</th>
                <th className="w-32 px-4 py-3">底下分組</th>
                <th className="w-24 px-4 py-3">排序</th>
                <th className="w-40 px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200/60">
              {stages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-ink-muted">
                    尚無大組。
                  </td>
                </tr>
              ) : (
                stages.map((s) => (
                  <tr key={s.id} className="text-ink-soft">
                    <td className="px-4 py-3 text-sm font-medium text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {groupsByStage.get(String(s.id))?.length ?? 0} 個
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => reorderStage(s, -1)}
                          className="rounded border border-cream-300 px-1.5 text-ink-soft hover:bg-cream-200"
                        >
                          ▲
                        </button>
                        <span>{s.sort_order}</span>
                        <button
                          onClick={() => reorderStage(s, +1)}
                          className="rounded border border-cream-300 px-1.5 text-ink-soft hover:bg-cream-200"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => renameStage(s)}
                          className="text-xs font-medium text-accent-sky hover:underline"
                        >
                          改名
                        </button>
                        <button
                          onClick={() => deleteStage(s)}
                          className="text-xs font-medium text-accent-coral hover:underline"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Group CRUD */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">循環分組</h2>
        <form
          onSubmit={createGroup}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-cream-200 bg-cream-100 p-4"
        >
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-ink-soft">大組</label>
            <select
              value={newGroupStageId === "" ? "" : String(newGroupStageId)}
              onChange={(e) =>
                setNewGroupStageId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={INPUT_CLASS}
            >
              <option value="">— 未分類 —</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">分組名稱</label>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className={INPUT_CLASS}
              placeholder="例如：A 組 / 循環一"
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-ink-soft">排序</label>
            <input
              value={newGroupOrder}
              onChange={(e) => setNewGroupOrder(e.target.value)}
              className={INPUT_CLASS}
              placeholder="0"
              inputMode="numeric"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-1.5 text-sm font-semibold text-cream-50 hover:brightness-110"
          >
            + 新增循環分組
          </button>
        </form>

        {loading && groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cream-200 bg-cream-100 p-8 text-center text-sm text-ink-muted">
            讀取中⋯
          </div>
        ) : (
          <div className="space-y-4">
            {stages.map((s) => (
              <GroupSection
                key={s.id}
                title={s.name}
                groups={groupsByStage.get(String(s.id)) ?? []}
                onRename={renameGroup}
                onMove={moveGroup}
                onDelete={deleteGroup}
              />
            ))}
            {unassigned.length > 0 ? (
              <GroupSection
                title="未分類"
                muted
                groups={unassigned}
                onRename={renameGroup}
                onMove={moveGroup}
                onDelete={deleteGroup}
              />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function GroupSection({
  title,
  muted,
  groups,
  onRename,
  onMove,
  onDelete,
}: {
  title: string;
  muted?: boolean;
  groups: Group[];
  onRename: (g: Group) => void;
  onMove: (g: Group) => void;
  onDelete: (g: Group) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-100">
      <div className="border-b border-cream-200 px-4 py-2 text-sm font-semibold text-ink">
        {muted ? <span className="text-ink-muted">{title}</span> : title}
        <span className="ml-2 font-mono text-xs text-ink-muted">({groups.length})</span>
      </div>
      {groups.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-ink-muted">尚無分組</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            <tr>
              <th className="px-4 py-2.5">名稱</th>
              <th className="w-16 px-4 py-2.5">排序</th>
              <th className="w-52 px-4 py-2.5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200/60">
            {groups.map((g) => (
              <tr key={g.id} className="text-ink-soft">
                <td className="px-4 py-2.5 text-sm text-ink">{g.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">{g.display_order}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => onRename(g)}
                      className="text-xs font-medium text-accent-sky hover:underline"
                    >
                      改名
                    </button>
                    <button
                      onClick={() => onMove(g)}
                      className="text-xs font-medium text-ink-soft hover:underline"
                    >
                      移到大組
                    </button>
                    <button
                      onClick={() => onDelete(g)}
                      className="text-xs font-medium text-accent-coral hover:underline"
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
