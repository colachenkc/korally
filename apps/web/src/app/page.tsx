import Image from "next/image";
import Link from "next/link";
import { CalendarDays, GraduationCap, MapPin } from "lucide-react";

import { AnnouncementBanner } from "@/components/common/AnnouncementBanner";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { GradientText } from "@/components/ui/gradient-text";
import { API_V1 } from "@/lib/api-client";
import type { Tournament } from "@/types/models";

const HIGHLIGHT = "桌球";

function splitTitle(name: string): [string, string, string] | null {
  const idx = name.indexOf(HIGHLIGHT);
  if (idx < 0) return null;
  return [name.slice(0, idx), HIGHLIGHT, name.slice(idx + HIGHLIGHT.length)];
}

async function fetchTournament(): Promise<Tournament | null> {
  try {
    const res = await fetch(`${API_V1}/tournaments`, { cache: "no-store" });
    if (!res.ok) return null;
    const list = (await res.json()) as Tournament[];
    return list[0] ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const tournament = await fetchTournament();

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col">
      {tournament ? (
        <section className="mx-auto w-full max-w-4xl pt-6 text-center md:pt-16">
          <h1 className="font-sans text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl md:text-7xl lg:text-[5.5rem]">
            {(() => {
              const parts = splitTitle(tournament.name);
              if (!parts) return tournament.name;
              const [before, hit, after] = parts;
              return (
                <>
                  {before}
                  <span className="text-brand">{hit}</span>
                  {after}
                </>
              );
            })()}
          </h1>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-ink-soft md:mt-10 md:gap-x-8">
            {tournament.venue ? (
              <span className="inline-flex items-center gap-2 text-base md:text-lg">
                <MapPin className="h-4 w-4 text-brand md:h-5 md:w-5" strokeWidth={2.25} />
                {tournament.venue}
              </span>
            ) : null}
            {tournament.start_date ? (
              <span className="inline-flex items-center gap-2 font-mono text-base md:text-lg">
                <CalendarDays className="h-4 w-4 text-brand md:h-5 md:w-5" strokeWidth={2.25} />
                {tournament.start_date}
                {tournament.end_date && tournament.end_date !== tournament.start_date
                  ? ` → ${tournament.end_date}`
                  : ""}
              </span>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:mt-10">
            <Link
              href="/live"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              即時監控
            </Link>
            <Link
              href="/schedule"
              className="rounded-xl border border-cream-300 bg-cream-100 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-cream-200"
            >
              查看賽程
            </Link>
          </div>

        </section>
      ) : (
        <section className="mx-auto w-full max-w-2xl rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-4 text-sm text-accent-coral">
          無法連線到後端 API，請確認 uvicorn 於 http://localhost:8000 啟動。
        </section>
      )}

      {tournament?.announcement_text ? (
        <div className="mx-auto mt-10 w-full max-w-3xl md:mt-16">
          <AnnouncementBanner text={tournament.announcement_text} />
        </div>
      ) : null}

      <div className="mt-auto pt-8 md:pt-16">
        <Marquee />
      </div>

      <AboutUsSection />
      <ProfileSection />

      <HomeFooter />
    </div>
  );
}

function AboutUsSection() {
  return (
    <section
      id="about-us"
      className="mx-auto flex min-h-[75vh] w-full max-w-3xl flex-col justify-center py-10 md:py-14"
    >
      <ScrollReveal>
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink md:text-5xl">
          About <span className="text-brand">KoRally</span>
        </h2>
      </ScrollReveal>
      <ScrollReveal delayMs={200}>
        <div className="mt-8 space-y-4 text-base leading-relaxed text-ink-soft md:mt-12 md:text-lg">
          <p>
            KoRally 為賽事現場設計的即時監控與名單管理系統。目標是讓大會工作人員能專注在辦賽上、觀眾能透過手機直接觀看比賽進度，減少現場印刷紙張與人力查表。
          </p>
          <p>
            系統支援：即時球檯監控、參賽名單與掃描報到、賽程 PDF
            分區發布、單場與團體對抗賽果登記、循環賽即時排名。所有資料集中在後台一次維護，前台頁面自動同步。
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}

function ProfileSection() {
  return (
    <section
      id="our-team"
      className="mx-auto flex min-h-[75vh] w-full max-w-3xl flex-col justify-center py-10 md:py-14"
    >
      <ScrollReveal>
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink md:text-5xl">
          Our team
        </h2>
      </ScrollReveal>

      <ScrollReveal delayMs={200}>
      <article className="mt-10 rounded-2xl border border-cream-200 bg-cream-100 p-6 shadow-card md:mt-14 md:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream-300 text-lg font-semibold text-ink">
            KC
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-semibold text-ink md:text-3xl">
              Kai-Hsin (Kevin) Chen
            </div>
            <div className="mt-0.5 text-sm text-brand md:text-base">
              Designer & Engineer
            </div>
          </div>
        </div>

        <ul className="mt-6 space-y-3 border-t border-cream-200 pt-6">
          <li className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={2} />
            <div>
              <div className="text-sm font-semibold text-ink">
                MS in Computer Science and Information Engineering
              </div>
              <div className="text-sm text-ink-muted">
                National Taiwan University · Graduate Institute of Networking and Multimedia
              </div>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={2} />
            <div>
              <div className="text-sm font-semibold text-ink">BS in Physics</div>
              <div className="text-sm text-ink-muted">
                National Taiwan University · Department of Physics
              </div>
            </div>
          </li>
        </ul>
      </article>
      </ScrollReveal>
    </section>
  );
}

function Marquee() {
  return (
    <div
      aria-hidden
      className="-mx-[calc(50vw-50%)] overflow-hidden border-y border-cream-200 py-4"
    >
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex shrink-0 items-center gap-10">
            <Image
              src="/logo-removebg-preview.png"
              alt="NTUTTST"
              width={689}
              height={362}
              className="h-12 w-auto shrink-0 opacity-70 invert md:h-16 lg:h-20"
              priority={i === 0}
            />
            <span className="inline-block shrink-0 py-1.5 font-serif text-xl font-medium italic leading-none text-ink-muted md:text-2xl lg:text-3xl">
              @PopGkuai
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
