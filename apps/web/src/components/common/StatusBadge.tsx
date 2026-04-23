import type { MatchStatus, TableStatus } from "@/types/models";

const statusMap: Record<string, { label: string; className: string }> = {
  idle: { label: "空閒", className: "bg-cream-100 text-ink-muted" },
  preparing: { label: "準備中", className: "bg-accent-peach/30 text-ink" },
  in_progress: { label: "進行中", className: "bg-accent-sky/15 text-accent-sky" },
  delayed: { label: "延誤", className: "bg-accent-coral/20 text-accent-coral" },
  finished: { label: "已結束", className: "bg-accent-lilac/15 text-accent-lilac" },
  scheduled: { label: "未開始", className: "bg-cream-100 text-ink-muted" },
  cancelled: { label: "取消", className: "bg-cream-200 text-ink-muted" },
};

export function StatusBadge({ status }: { status: TableStatus | MatchStatus | string }) {
  const s = statusMap[status] ?? { label: status, className: "bg-cream-100 text-ink-muted" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}
