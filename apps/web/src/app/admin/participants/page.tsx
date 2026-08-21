"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Participant, ParticipantCategory, Stage } from "@/types/models";

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none";

const UNASSIGNED = "__unassigned__";

type FormState = {
  stageId: number | "";
  name: string;
  student_id: string;
  team: string;
  pair_no: string;
  seed: string;
};

const EMPTY_FORM: FormState = {
  stageId: "",
  name: "",
  student_id: "",
  team: "",
  pair_no: "",
  seed: "",
};

// Heuristic: derive legacy `category` from stage name (mirrors backend logic).
function categoryFromStageName(name: string): ParticipantCategory | null {
  if (name.includes("雙")) return "doubles";
  if (name.includes("男")) return "men_singles";
  if (name.includes("女")) return "women_singles";
  return null;
}

export default function AdminParticipantsPage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [people, setPeople] = useState<Participant[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        apiGet<Stage[]>("/stages"),
        apiGet<Participant[]>("/participants"),
      ]);
      setStages(s);
      setPeople(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const peopleByStage = useMemo(() => {
    const m = new Map<string, Participant[]>();
    for (const p of people) {
      const key = p.stage_id != null ? String(p.stage_id) : UNASSIGNED;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return m;
  }, [people]);

  // Individual-type stages (name doesn't contain 團), plus any stage that has
  // at least one participant assigned.
  const indivStages = useMemo(
    () =>
      stages.filter(
        (s) => !s.name.includes("團") || (peopleByStage.get(String(s.id))?.length ?? 0) > 0,
      ),
    [stages, peopleByStage],
  );

  function startNew(stageId: number | "") {
    setEditingId("new");
    setForm({ ...EMPTY_FORM, stageId });
  }

  function startEdit(p: Participant) {
    setEditingId(p.id);
    setForm({
      stageId: p.stage_id ?? "",
      name: p.name,
      student_id: p.student_id ?? "",
      team: p.team ?? "",
      pair_no: p.pair_no != null ? String(p.pair_no) : "",
      seed: p.seed != null ? String(p.seed) : "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("姓名不可空白");
      return;
    }
    setBusy(true);
    setError(null);
    const stageId = form.stageId === "" ? null : Number(form.stageId);
    const stage = stageId != null ? stages.find((s) => s.id === stageId) : null;
    const category = stage ? categoryFromStageName(stage.name) : null;
    const payload = {
      stage_id: stageId,
      category,
      name: form.name.trim(),
      student_id: form.student_id.trim() || null,
      team: form.team.trim() || null,
      pair_no: form.pair_no.trim() ? Number(form.pair_no) : null,
      seed: form.seed.trim() ? Number(form.seed) : null,
    };
    try {
      if (editingId === "new") {
        await apiPost<Participant>("/participants", payload);
      } else if (typeof editingId === "number") {
        await apiPatch<Participant>(`/participants/${editingId}`, payload);
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
    if (!confirm("確定刪除這位選手？")) return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/participants/${id}`);
      if (editingId === id) cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    } finally {
      setBusy(false);
    }
  }

  const unassigned = peopleByStage.get(UNASSIGNED) ?? [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">參賽名單</h1>
        <p className="mt-1 text-sm text-ink-muted">
          選手依大組分區顯示。大組名稱可到{" "}
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
        {indivStages.map((stage) => (
          <ParticipantStageSection
            key={stage.id}
            title={stage.name}
            people={peopleByStage.get(String(stage.id)) ?? []}
            isDoubles={stage.name.includes("雙")}
            onAdd={() => startNew(stage.id)}
            onEdit={startEdit}
            onDelete={handleDelete}
            busy={busy}
          />
        ))}
        {unassigned.length > 0 ? (
          <ParticipantStageSection
            title="未分類"
            muted
            people={unassigned}
            isDoubles={false}
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
                  {editingId === "new" ? "新增選手" : `編輯選手 · ${form.name}`}
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
                  <Field label="姓名">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={INPUT_CLASS}
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="學號">
                    <input
                      value={form.student_id}
                      onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                      className={INPUT_CLASS}
                      placeholder="B11302001"
                    />
                  </Field>
                  <Field label="所屬單位" hint="例如：資工系">
                    <input
                      value={form.team}
                      onChange={(e) => setForm({ ...form, team: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="種子順位" hint="數字，選填">
                    <input
                      type="number"
                      value={form.seed}
                      onChange={(e) => setForm({ ...form, seed: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field label="雙打配對號" hint="雙打時同號 = 同組">
                    <input
                      type="number"
                      value={form.pair_no}
                      onChange={(e) => setForm({ ...form, pair_no: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>

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

function ParticipantStageSection({
  title,
  muted,
  people,
  isDoubles,
  onAdd,
  onEdit,
  onDelete,
  busy,
}: {
  title: string;
  muted?: boolean;
  people: Participant[];
  isDoubles: boolean;
  onAdd: () => void;
  onEdit: (p: Participant) => void;
  onDelete: (id: number) => void;
  busy: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className={`text-lg font-semibold ${muted ? "text-ink-muted" : "text-ink"}`}>
          {title}
          <span className="ml-2 font-mono text-xs text-ink-muted">({people.length})</span>
        </h2>
        <button
          onClick={onAdd}
          className="rounded-full border border-cream-300 bg-cream-100 px-3 py-1 text-xs text-ink-soft hover:bg-cream-200"
        >
          + 新增選手
        </button>
      </div>

      <ul className="space-y-2">
        {people.length === 0 ? (
          <li className="rounded-xl border border-dashed border-cream-200 bg-cream-100 p-4 text-center text-xs text-ink-muted">
            尚無選手
          </li>
        ) : (
          people.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-cream-200 bg-cream-100 p-3 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {p.name}
                    {isDoubles && p.pair_no != null ? (
                      <span className="ml-2 font-mono text-xs text-ink-muted">
                        · Pair {p.pair_no}
                      </span>
                    ) : null}
                    {!isDoubles && p.seed != null ? (
                      <span className="ml-2 font-mono text-xs text-ink-muted">#{p.seed}</span>
                    ) : null}
                  </div>
                  {(p.team || p.student_id) ? (
                    <div className="mt-0.5 truncate text-xs text-ink-muted">
                      {p.team ?? ""}
                      {p.team && p.student_id ? " · " : ""}
                      {p.student_id ? (
                        <span className="font-mono">{p.student_id}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 space-x-2 text-xs">
                  <button
                    onClick={() => onEdit(p)}
                    className="font-medium text-accent-sky hover:underline"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    disabled={busy}
                    className="font-medium text-accent-coral hover:underline disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>
              </div>
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
