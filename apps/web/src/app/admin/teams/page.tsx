"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { TEAM_DIVISION_LABEL, type Team, type TeamDivision } from "@/types/models";

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none";

type FormState = {
  division: TeamDivision;
  name: string;
  department: string;
  members_text: string;
  display_order: string;
};

const EMPTY_FORM: FormState = {
  division: "men",
  name: "",
  department: "",
  members_text: "",
  display_order: "0",
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const grouped = useMemo(() => {
    const g: Record<TeamDivision, Team[]> = { men: [], women: [] };
    for (const t of teams) g[t.division].push(t);
    return g;
  }, [teams]);

  function startNew(division: TeamDivision) {
    setEditingId("new");
    setForm({ ...EMPTY_FORM, division });
  }

  function startEdit(t: Team) {
    setEditingId(t.id);
    setForm({
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
    const payload = {
      division: form.division,
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

  return (
    <div className="space-y-5">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Admin / Teams
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">團賽名單</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {(["men", "women"] as TeamDivision[]).map((div) => (
          <section key={div} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">{TEAM_DIVISION_LABEL[div]}</h2>
              <button
                onClick={() => startNew(div)}
                className="rounded-full border border-ink/15 bg-white px-3 py-1 text-xs text-ink-soft hover:border-ink/30"
              >
                + 新增隊伍
              </button>
            </div>

            <ul className="space-y-2">
              {grouped[div].length === 0 ? (
                <li className="rounded-xl border border-dashed border-cream-200 bg-white p-4 text-center text-xs text-ink-muted">
                  尚無隊伍
                </li>
              ) : (
                grouped[div].map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-cream-200 bg-white p-3 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{t.name}</div>
                        {t.department ? (
                          <div className="truncate text-xs text-ink-muted">{t.department}</div>
                        ) : null}
                      </div>
                      <div className="shrink-0 space-x-2 text-xs">
                        <button
                          onClick={() => startEdit(t)}
                          className="font-medium text-accent-sky hover:underline"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
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
        ))}
      </div>

      {editingId !== null ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={cancelEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-6 shadow-pop"
          >
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
                  {editingId === "new" ? "New team" : `Edit / ${form.name}`}
                </div>
                <h2 className="mt-1 text-xl font-semibold text-ink">
                  {editingId === "new" ? "新增隊伍" : "編輯隊伍"}
                </h2>
              </div>
              <button onClick={cancelEdit} className="text-sm text-ink-muted hover:text-ink">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <Field label="組別">
                <div className="grid grid-cols-2 gap-2">
                  {(["men", "women"] as TeamDivision[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, division: d })}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        form.division === d
                          ? "border-ink bg-ink text-cream-50"
                          : "border-cream-200 bg-white text-ink-soft hover:border-ink/30"
                      }`}
                    >
                      {TEAM_DIVISION_LABEL[d]}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="隊名">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={INPUT_CLASS}
                  required
                />
              </Field>

              <Field label="系所" hint="例如：資工系">
                <input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="隊員資料" hint="一行一位，可寫姓名、學號、位置等">
                <textarea
                  value={form.members_text}
                  onChange={(e) => setForm({ ...form, members_text: e.target.value })}
                  rows={6}
                  className={INPUT_CLASS}
                  placeholder={"張小明 B11302001\n李大華 B11302002\n…"}
                />
              </Field>

              <Field label="顯示順序" hint="數字越小越前面">
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                  className={INPUT_CLASS}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-full border border-ink/15 bg-white px-4 py-1.5 text-sm text-ink-soft hover:bg-cream-100"
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
      ) : null}
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
