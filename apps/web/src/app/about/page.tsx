import Link from "next/link";

import { GradientText } from "@/components/ui/gradient-text";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8 md:py-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-ink md:text-5xl">
          關於{" "}
          <GradientText className="rounded-md px-1">KoRally</GradientText>
        </h1>
      </header>

      <section className="space-y-3 text-base leading-relaxed text-ink-soft">
        <p>
          KoRally 為賽事現場設計的即時監控與名單管理系統。目標是讓大會工作人員能專注在辦賽上、觀眾能透過手機直接觀看比賽進度，減少現場印刷紙張與人力查表。
        </p>
        <p>
          系統支援：即時球檯監控、參賽名單與掃描報到、賽程 PDF
          分區發布、單場與團體對抗賽果登記、循環賽即時排名。所有資料集中在後台一次維護，前台頁面自動同步。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-ink">開發者</h2>
        <p className="text-sm text-ink-muted">
          由 <span className="font-mono text-ink-soft">@PopGkuai</span> 開發與維護。歡迎回報 bug、建議或希望使用本系統跑自己的賽事。
        </p>
      </section>

      <div className="pt-4">
        <Link
          href="/"
          className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-2 text-sm text-ink-soft hover:bg-cream-200"
        >
          回首頁
        </Link>
      </div>
    </div>
  );
}
