import Link from "next/link";

import { ResetMatchesButton } from "./_components/ResetMatchesButton";

const adminLinks = [
  {
    href: "/admin/tournament",
    title: "賽事資訊與公告",
    description: "編輯賽事名稱、場地、日期、狀態、大會公告內文。",
  },
  {
    href: "/admin/schedule",
    title: "賽程 PDF 管理",
    description: "分組上傳時間表 / 公開男單 / 女單 / 男團 / 女團 / 歡樂雙打 PDF。",
  },
  {
    href: "/admin/tables",
    title: "球檯管理",
    description: "新增 / 刪除球檯、開始與結束比賽、指派裁判。",
  },
  {
    href: "/admin/main-desk",
    title: "大會桌管理",
    description: "編輯大會桌名稱、狀態、目前輪班。",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <header>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Admin
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">管理後台</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-cream-200 bg-white p-5 shadow-card transition hover:border-ink/25 hover:shadow-pop"
          >
            <div className="text-base font-semibold text-ink">{link.title}</div>
            <div className="mt-1.5 text-sm text-ink-muted">{link.description}</div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint group-hover:text-ink-muted">
              {link.href} →
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-accent-coral/40 bg-accent-coral/10 p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent-coral">
          Danger Zone
        </div>
        <h2 className="mt-1 text-base font-semibold text-ink">系統重設</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          僅清除比賽紀錄（進行中 + 已結束）並把球檯回到空閒；不會動到球檯設定、裁判、大會桌與公告。無法復原。
        </p>
        <div className="mt-3">
          <ResetMatchesButton />
        </div>
      </section>
    </div>
  );
}
