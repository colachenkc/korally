"use client";

import { useCallback, useEffect, useState } from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Referee } from "@/types/models";

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none";

type FormState = {
  name: string;
  level: string;
  note: string;
};

const EMPTY_FORM: FormState = { name: "", level: "", note: "" };

export default function AdminRefereesPage() {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Referee[]>("/referees");
      setReferees(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
  }

  function startEdit(r: Referee) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      level: r.level ?? "",
      note: r.note ?? "",
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
    const payload = {
      name: form.name.trim(),
      level: form.level.trim() || null,
      note: form.note.trim() || null,
    };
    try {
      if (editingId === "new") {
        await apiPost<Referee>("/referees", payload);
      } else if (typeof editingId === "number") {
        await apiPatch<Referee>(`/referees/${editingId}`, payload);
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
    if (!confirm("確定刪除這位裁判？")) return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/referees/${id}`);
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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
            Admin / Referees
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">裁判名單</h1>
          <p className="mt-1 text-sm text-ink-muted">
            建立後可在「球檯管理」用點選方式快速指派裁判。
          </p>
        </div>
        <button
          onClick={startNew}
          className="rounded-full border border-ink/15 bg-white px-3 py-1 text-sm text-ink-soft hover:border-ink/30"
        >
          + 新增裁判
        </button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {referees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          尚未建立任何裁判。
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {referees.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-cream-200 bg-white p-3 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-medium text-ink">{r.name}</div>
                  {r.level || r.note ? (
                    <div className="mt-0.5 truncate text-xs text-ink-muted">
                      {[r.level, r.note].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 space-x-2 text-xs">
                  <button
                    onClick={() => startEdit(r)}
                    className="font-medium text-accent-sky hover:underline"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={busy}
                    className="font-medium text-accent-coral hover:underline disabled:opacity-50"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingId !== null ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={cancelEdit}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-md flex-col rounded-2xl border border-cream-200 bg-white shadow-pop"
          >
            <div className="overflow-y-auto p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
                    {editingId === "new" ? "New referee" : `Edit / ${form.name}`}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-ink">
                    {editingId === "new" ? "新增裁判" : "編輯裁判"}
                  </h2>
                </div>
                <button onClick={cancelEdit} className="text-sm text-ink-muted hover:text-ink">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <Field label="姓名">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={INPUT_CLASS}
                    required
                  />
                </Field>

                <Field label="等級 / 身分" hint="例如：國際裁判 / 學生裁判">
                  <input
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="備註">
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={3}
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
