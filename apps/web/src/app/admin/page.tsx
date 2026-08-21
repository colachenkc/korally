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
    href: "/admin/referees",
    title: "裁判名單",
    description: "建立可被指派的裁判清單，球檯管理可直接點選。",
  },
  {
    href: "/admin/teams",
    title: "團賽名單",
    description: "新增、編輯男 / 女團隊伍與隊員資料。",
  },
  {
    href: "/admin/participants",
    title: "個人參賽名單",
    description: "新增、編輯單打 / 雙打選手，含學號、種子順位、配對號。",
  },
  {
    href: "/admin/groups",
    title: "循環賽分組",
    description: "建立個人 / 團體循環賽分組，之後在賽果登記與排名表使用。",
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">管理後台</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-cream-200 bg-cream-100 p-5 shadow-card transition hover:border-ink/25 hover:shadow-pop"
          >
            <div className="text-base font-semibold text-ink">{link.title}</div>
            <div className="mt-1.5 text-sm text-ink-muted">{link.description}</div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint group-hover:text-ink-muted">
              {link.href}
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-accent-coral/40 bg-accent-coral/10 p-5">
        <h2 className="mt-1 text-base font-semibold text-ink">系統重設</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          僅清除比賽紀錄（進行中 + 已結束）並把球檯回到空閒；不會動到球檯設定、裁判與公告。無法復原。
        </p>
        <div className="mt-3">
          <ResetMatchesButton />
        </div>
      </section>
    </div>
  );
}
