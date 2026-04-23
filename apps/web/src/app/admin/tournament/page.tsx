"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPatch } from "@/lib/api-client";
import {
  TOURNAMENT_STATUS_LABEL,
  type Tournament,
  type TournamentStatus,
} from "@/types/models";

const STATUS_OPTIONS: TournamentStatus[] = ["draft", "ongoing", "finished"];

type FormState = {
  name: string;
  venue: string;
  start_date: string;
  end_date: string;
  status: string;
  current_schedule_time: string;
  announcement_text: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  venue: "",
  start_date: "",
  end_date: "",
  status: "draft",
  current_schedule_time: "",
  announcement_text: "",
};

function toForm(t: Tournament): FormState {
  return {
    name: t.name,
    venue: t.venue ?? "",
    start_date: t.start_date ?? "",
    end_date: t.end_date ?? "",
    status: t.status || "draft",
    current_schedule_time: t.current_schedule_time ?? "",
    announcement_text: t.announcement_text ?? "",
  };
}

const INPUT_CLASS =
  "w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none";

export default function AdminTournamentPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiGet<Tournament[]>("/tournaments");
      if (list.length === 0) {
        setTournament(null);
        return;
      }
      setTournament(list[0]);
      setForm(toForm(list[0]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "讀取失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tournament) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        venue: form.venue.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        current_schedule_time: form.current_schedule_time.trim() || null,
        announcement_text: form.announcement_text.trim() || null,
      };
      await apiPatch(`/tournaments/${tournament.id}`, payload);
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
          Admin / Tournament
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">賽事資訊與公告</h1>
      </header>

      {error ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {error}
        </div>
      ) : null}

      {loading && !tournament ? (
        <div className="text-sm text-ink-muted">載入中⋯</div>
      ) : !tournament ? (
        <div className="rounded-2xl border border-dashed border-cream-200 bg-white p-12 text-center text-sm text-ink-muted">
          尚未建立賽事。
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="max-w-2xl space-y-5 rounded-2xl border border-cream-200 bg-white p-6 shadow-card"
        >
          <Field label="賽事名稱">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={INPUT_CLASS}
              required
            />
          </Field>

          <Field label="場地">
            <input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="例如：臺大綜合體育館三樓"
              className={INPUT_CLASS}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="開始日">
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className={`${INPUT_CLASS} font-mono`}
              />
            </Field>
            <Field label="結束日">
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className={`${INPUT_CLASS} font-mono`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="狀態">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={INPUT_CLASS}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {TOURNAMENT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="目前進行時段" hint="首頁顯示「目前進行到 xx:xx」">
              <input
                value={form.current_schedule_time}
                onChange={(e) => setForm({ ...form, current_schedule_time: e.target.value })}
                placeholder="例如：10:30 ~ 12:00"
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <Field label="大會公告" hint="首頁顯示的公告內文，支援多行">
            <textarea
              value={form.announcement_text}
              onChange={(e) => setForm({ ...form, announcement_text: e.target.value })}
              rows={10}
              className={`${INPUT_CLASS} leading-relaxed`}
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
