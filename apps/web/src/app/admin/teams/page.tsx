"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Stage, Team, TeamDivision } from "@/types/models";

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none";

const UNASSIGNED = "__unassigned__";

type FormState = {
  stageId: number | "";
  division: TeamDivision;
  name: string;
  department: string;
  members_text: string;
  display_order: string;
};

const EMPTY_FORM: FormState = {
  stageId: "",
  division: "men",
  name: "",
  department: "",
  members_text: "",
  display_order: "0",
};

// Heuristic: derive men/women (legacy `division` column) from a stage name so
// admins picking custom stages ("教職員男團") still populate the column correctly.
function divisionFromStageName(name: string): TeamDivision {
  if (name.includes("女")) return "women";
  return "men";
}

export default function AdminTeamsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([
        apiGet<Stage[]>("/stages"),
        apiGet<Team[]>("/teams"),
      ]);
      setStages(s);
      setTeams(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teamsByStage = useMemo(() => {
    const m = new Map<string, Team[]>();
    for (const t of teams) {
      const key = t.stage_id != null ? String(t.stage_id) : UNASSIGNED;
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    return m;
  }, [teams]);

  // Show team-relevant stages: has teams OR name contains 團.
  const teamStages = useMemo(
    () =>
      stages.filter(
        (s) => (teamsByStage.get(String(s.id))?.length ?? 0) > 0 || s.name.includes("團"),
      ),
    [stages, teamsByStage],
  );

  function startNew(stageId: number | "") {
    const stage = typeof stageId === "number" ? stages.find((s) => s.id === stageId) : null;
    setEditingId("new");
    setForm({
      ...EMPTY_FORM,
      stageId,
      division: stage ? divisionFromStageName(stage.name) : "men",
    });
  }

  function startEdit(t: Team) {
    setEditingId(t.id);
    setForm({
      stageId: t.stage_id ?? "",
      division: t.division,
      name: t.name,
      department: t.department ?? "",
      members_text: t.members_text ?? "",
      display_order: String(t.display_order),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("隊名不可空白");
      return;
    }
    setBusy(true);
    setError(null);
    const stageId = form.stageId === "" ? null : Number(form.stageId);
    const stage = stageId != null ? stages.find((s) => s.id === stageId) : null;
    const division = stage ? divisionFromStageName(stage.name) : form.division;
    const payload = {
      stage_id: stageId,
      division,
      name: form.name.trim(),
      department: form.department.trim() || null,
      members_text: form.members_text.trim() || null,
      display_order: Number.parseInt(form.display_order, 10) || 0,
    };
    try {
      if (editingId === "new") {
        await apiPost<Team>("/teams", payload);
      } else if (typeof editingId === "number") {
        await apiPatch<Team>(`/teams/${editingId}`, payload);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("確定刪除這支隊伍？")) return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/teams/${id}`);
      if (editingId === id) cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setBusy(false);
    }
  }

  const unassigned = teamsByStage.get(UNASSIGNED) ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">團賽名單</h1>
        <p className="mt-1 text-sm text-ink-muted">
          隊伍會依「大組」分區顯示。大組名稱可到{" "}
          <a href="/admin/groups" className="text-brand hover:underline">
            循環賽分組
          </a>{" "}
          修改。
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {teamStages.map((stage) => (
          <TeamStageSection
            key={stage.id}
            title={stage.name}
            teams={teamsByStage.get(String(stage.id)) ?? []}
            onAdd={() => startNew(stage.id)}
            onEdit={startEdit}
            onDelete={handleDelete}
            busy={busy}
          />
        ))}
        {unassigned.length > 0 ? (
          <TeamStageSection
            title="未分類"
            muted
            teams={unassigned}
            onAdd={() => startNew("")}
            onEdit={startEdit}
            onDelete={handleDelete}
            busy={busy}
          />
        ) : null}
      </div>

      {editingId !== null ? (
        <div
          className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 p-4 pt-16 backdrop-blur-[2px]"
          onClick={cancelEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[calc(100vh-5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-cream-200 bg-cream-100 shadow-pop"
          >
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">
                  {editingId === "new" ? "新增隊伍" : `編輯隊伍 · ${form.name}`}
                </h2>
                <button onClick={cancelEdit} className="text-sm text-ink-muted hover:text-ink">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3">
                <div className="grid grid-cols-[minmax(180px,1fr)_2fr] gap-3">
                  <Field label="大組">
                    <select
                      value={form.stageId === "" ? "" : String(form.stageId)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          stageId: e.target.value === "" ? "" : Number(e.target.value),
                        })
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
                  </Field>
                  <Field label="隊名">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={INPUT_CLASS}
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <Field label="系所" hint="例如：資工系">
                    <input
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="顯示順序">
                    <input
                      type="number"
                      value={form.display_order}
                      onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                      className={`${INPUT_CLASS} w-20`}
                    />
                  </Field>
                </div>

                <Field label="隊員資料" hint="一行一位，可寫姓名、學號、位置等">
                  <textarea
                    value={form.members_text}
                    onChange={(e) => setForm({ ...form, members_text: e.target.value })}
                    rows={4}
                    className={INPUT_CLASS}
                    placeholder={"張小明 B11302001\n李大華 B11302002\n…"}
                  />
                </Field>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-full border border-ink/15 bg-cream-100 px-4 py-1.5 text-sm text-ink-soft hover:bg-cream-200"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full bg-ink px-5 py-1.5 text-sm font-medium text-cream-50 hover:bg-ink-soft disabled:opacity-50"
                  >
                    {busy ? "儲存中⋯" : "儲存"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TeamStageSection({
  title,
  muted,
  teams,
  onAdd,
  onEdit,
  onDelete,
  busy,
}: {
  title: string;
  muted?: boolean;
  teams: Team[];
  onAdd: () => void;
  onEdit: (t: Team) => void;
  onDelete: (id: number) => void;
  busy: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-semibold ${muted ? "text-ink-muted" : "text-ink"}`}>
          {title}
          <span className="ml-2 font-mono text-xs text-ink-muted">({teams.length})</span>
        </h2>
        <button
          onClick={onAdd}
          className="rounded-full border border-cream-300 bg-cream-100 px-3 py-1 text-xs text-ink-soft hover:bg-cream-200"
        >
          + 新增隊伍
        </button>
      </div>

      <ul className="space-y-2">
        {teams.length === 0 ? (
          <li className="rounded-xl border border-dashed border-cream-200 bg-cream-100 p-4 text-center text-xs text-ink-muted">
            尚無隊伍
          </li>
        ) : (
          teams.map((t) => (
            <li key={t.id} className="rounded-xl border border-cream-200 bg-cream-100 p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{t.name}</div>
                  {t.department ? (
                    <div className="truncate text-xs text-ink-muted">{t.department}</div>
                  ) : null}
                </div>
                <div className="shrink-0 space-x-2 text-xs">
                  <button
                    onClick={() => onEdit(t)}
                    className="font-medium text-accent-sky hover:underline"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    disabled={busy}
                    className="font-medium text-accent-coral hover:underline disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>
              </div>
              {t.members_text ? (
                <pre className="mt-2 whitespace-pre-wrap border-t border-cream-200/70 pt-2 font-sans text-xs leading-relaxed text-ink-soft">
                  {t.members_text}
                </pre>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
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
