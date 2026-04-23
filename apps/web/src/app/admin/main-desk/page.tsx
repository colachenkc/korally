"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPatch } from "@/lib/api-client";
import type { MainDesk } from "@/types/models";

type FormState = {
  name: string;
  location: string;
  status_text: string;
  members_text: string;
};

const EMPTY_FORM: FormState = { name: "", location: "", status_text: "", members_text: "" };

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none";

export default function AdminMainDeskPage() {
  const [desks, setDesks] = useState<MainDesk[]>([]);
  const [deskId, setDeskId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<MainDesk[]>("/main-desk");
      setDesks(data);
      if (data.length > 0) {
        const first = data[0];
        setDeskId(first.id);
        setForm({
          name: first.name ?? "",
          location: first.location ?? "",
          status_text: first.status_text ?? "",
          members_text: first.members_text ?? "",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (deskId == null) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/main-desk/${deskId}`, {
        name: form.name.trim(),
        location: form.location.trim() || null,
        status_text: form.status_text.trim() || null,
        members_text: form.members_text.trim() || null,
      });
      setSavedAt(new Date());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Admin / Main Desk
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">大會桌管理</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {desks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          尚未建立大會桌。
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="max-w-2xl space-y-5 rounded-2xl border border-cream-200 bg-white p-6 shadow-card"
        >
          <Field label="名稱">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </Field>

          <Field label="位置">
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="例如：前方中央"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="目前狀態" hint="顯示於大屏右上，例如「大會進行中」「午休」">
            <input
              value={form.status_text}
              onChange={(e) => setForm({ ...form, status_text: e.target.value })}
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="目前輪班" hint="一行一位，例如：裁判長 陳○○">
            <textarea
              value={form.members_text}
              onChange={(e) => setForm({ ...form, members_text: e.target.value })}
              rows={6}
              className={INPUT_CLASS}
              placeholder={"裁判長 陳○○\n紀錄 王○○\n廣播 李○○"}
            />
          </Field>

          <div className="flex items-center justify-between pt-1">
            <div className="font-mono text-xs text-ink-muted">
              {savedAt ? `saved at ${savedAt.toLocaleTimeString()}` : "unsaved"}
            </div>
            <button
              disabled={saving}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-cream-50 hover:bg-ink-soft disabled:opacity-50"
            >
              {saving ? "儲存中⋯" : "儲存"}
            </button>
          </div>
        </form>
      )}
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
        <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted">
          {label}
        </label>
        {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
