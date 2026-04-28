"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPost } from "@/lib/api-client";
import {
  PARTICIPANT_CATEGORY_LABEL,
  type Participant,
  type ParticipantCategory,
} from "@/types/models";

// NTU student ID barcodes are typically CODE_39 (9 chars). We keep CODE_128
// and EAN_13 in the hint list as cheap insurance against alt encodings.
const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_128,
  BarcodeFormat.EAN_13,
]);
HINTS.set(DecodeHintType.TRY_HARDER, true);

const COOLDOWN_MS = 2500;
const MAX_LOG = 12;

type LogStatus = "ok" | "already" | "not_found" | "error";

type LogEntry = {
  id: string;
  ts: number;
  studentId: string;
  status: LogStatus;
  participants: Participant[];
  message?: string;
};

export default function CheckInPage() {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const isAuthed = authStatus === "authenticated";

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<{ studentId: string; ts: number } | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());

  const [scannerError, setScannerError] = useState<string | null>(null);
  const [latest, setLatest] = useState<LogEntry | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  // Redirect anonymous users to /login. Loading state shows nothing yet.
  useEffect(() => {
    if (authStatus === "anonymous") {
      router.replace(`/login?redirect=${encodeURIComponent("/check-in")}`);
    }
  }, [authStatus, router]);

  const handleScan = useCallback(async (rawText: string) => {
    const studentId = rawText.slice(0, 9).toUpperCase();
    if (!studentId) return;

    // Per-id cooldown to avoid hammering the API while card sits in front of camera.
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.studentId === studentId && now - last.ts < COOLDOWN_MS) return;
    lastScanRef.current = { studentId, ts: now };

    if (inFlightRef.current.has(studentId)) return;
    inFlightRef.current.add(studentId);

    const entryId = `${studentId}-${now}`;
    try {
      const matches = await apiGet<Participant[]>(
        `/participants?student_id=${encodeURIComponent(studentId)}`,
      );
      if (matches.length === 0) {
        const entry: LogEntry = {
          id: entryId,
          ts: now,
          studentId,
          status: "not_found",
          participants: [],
        };
        setLatest(entry);
        setLog((prev) => [entry, ...prev].slice(0, MAX_LOG));
        return;
      }

      const updated: Participant[] = [];
      let allWereChecked = true;
      for (const p of matches) {
        if (p.checked_in) {
          updated.push(p);
          continue;
        }
        allWereChecked = false;
        try {
          const fresh = await apiPost<Participant>(`/participants/${p.id}/check-in`);
          updated.push(fresh);
        } catch (e) {
          updated.push(p);
          throw e;
        }
      }
      const entry: LogEntry = {
        id: entryId,
        ts: now,
        studentId,
        status: allWereChecked ? "already" : "ok",
        participants: updated,
      };
      setLatest(entry);
      setLog((prev) => [entry, ...prev].slice(0, MAX_LOG));

      // Optional haptic feedback on supported devices.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(allWereChecked ? 30 : [40, 60, 40]);
      }
    } catch (e) {
      const entry: LogEntry = {
        id: entryId,
        ts: now,
        studentId,
        status: "error",
        participants: [],
        message: e instanceof Error ? e.message : "報到失敗",
      };
      setLatest(entry);
      setLog((prev) => [entry, ...prev].slice(0, MAX_LOG));
    } finally {
      inFlightRef.current.delete(studentId);
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(HINTS);

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        video,
        (result) => {
          if (result) void handleScan(result.getText());
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setScannerError(
          e instanceof Error
            ? e.message
            : "無法啟用相機，請檢查瀏覽器權限或改用支援的瀏覽器（Chrome / Safari iOS 17+）",
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [isAuthed, handleScan]);

  if (authStatus === "loading") {
    return <div className="text-sm text-ink-muted">驗證登入狀態⋯</div>;
  }
  if (!isAuthed) {
    return <div className="text-sm text-ink-muted">正在導向登入⋯</div>;
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Check-in scanner
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">掃描報到</h1>
        <p className="mt-1 text-sm text-ink-muted">
          將學生證條碼對準畫面中央，掃到後會自動標記為已報到。
        </p>
      </header>

      {scannerError ? (
        <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-3 text-sm text-accent-coral">
          {scannerError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl border border-cream-200 bg-ink/90 shadow-card">
            <video
              ref={videoRef}
              playsInline
              muted
              className="block aspect-[4/3] w-full object-cover"
            />
            <ScanOverlay />
          </div>
          <LatestCard entry={latest} />
        </div>
        <ScanLog log={log} />
      </div>
    </div>
  );
}

function ScanOverlay() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-[42%] w-[68%] rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]">
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.28em] text-white/85">
          Align barcode here
        </span>
      </div>
    </div>
  );
}

function LatestCard({ entry }: { entry: LogEntry | null }) {
  if (!entry) {
    return (
      <div className="rounded-2xl border border-dashed border-cream-200 bg-white/60 p-6 text-center text-sm text-ink-muted">
        尚未掃到任何學生證
      </div>
    );
  }
  const tone = toneFor(entry.status);
  return (
    <div
      className={`rounded-2xl border p-4 shadow-card ${tone.border} ${tone.bg}`}
    >
      <div className={`font-mono text-[10px] uppercase tracking-[0.28em] ${tone.title}`}>
        {tone.label}
      </div>
      <div className="mt-1 font-mono text-base font-semibold text-ink">{entry.studentId}</div>
      {entry.participants.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {entry.participants.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-3">
              <span className="text-base font-medium text-ink">{p.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                {PARTICIPANT_CATEGORY_LABEL[p.category as ParticipantCategory]}
              </span>
            </li>
          ))}
        </ul>
      ) : entry.message ? (
        <div className="mt-1.5 text-sm text-ink-soft">{entry.message}</div>
      ) : entry.status === "not_found" ? (
        <div className="mt-1.5 text-sm text-ink-soft">查無此學號的參賽者</div>
      ) : null}
    </div>
  );
}

function ScanLog({ log }: { log: LogEntry[] }) {
  const formatTime = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [],
  );

  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
          Recent scans
        </span>
        <span className="font-mono text-xs text-ink-faint">{log.length}</span>
      </div>
      {log.length === 0 ? (
        <div className="py-3 text-center text-xs text-ink-faint">尚無紀錄</div>
      ) : (
        <ul className="divide-y divide-cream-200/60">
          {log.map((e) => {
            const tone = toneFor(e.status);
            const names = e.participants.map((p) => p.name).join("、");
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-mono text-xs ${tone.title}`}>{tone.label}</span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {formatTime.format(e.ts)}
                    </span>
                  </div>
                  <div className="truncate text-ink">
                    <span className="font-mono text-xs text-ink-muted">{e.studentId}</span>
                    {names ? <span className="ml-2 font-medium">{names}</span> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function toneFor(status: LogStatus): {
  label: string;
  bg: string;
  border: string;
  title: string;
} {
  switch (status) {
    case "ok":
      return {
        label: "已報到",
        bg: "bg-accent-sky/10",
        border: "border-accent-sky/30",
        title: "text-accent-sky",
      };
    case "already":
      return {
        label: "先前已報到",
        bg: "bg-accent-butter/30",
        border: "border-accent-butter",
        title: "text-ink-soft",
      };
    case "not_found":
      return {
        label: "查無此人",
        bg: "bg-accent-coral/10",
        border: "border-accent-coral/30",
        title: "text-accent-coral",
      };
    case "error":
      return {
        label: "錯誤",
        bg: "bg-accent-coral/10",
        border: "border-accent-coral/30",
        title: "text-accent-coral",
      };
  }
}
