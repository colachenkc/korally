import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronDown, MapPin } from "lucide-react";

import { AnnouncementBanner } from "@/components/common/AnnouncementBanner";
import { HomeFooter } from "@/components/layout/HomeFooter";
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
          <h1 className="font-sans text-4xl font-black leading-[1.1] tracking-tight text-ink sm:text-5xl md:text-7xl lg:text-[5.5rem]">
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

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 md:mt-10 md:gap-3">
            {tournament.venue ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-cream-100 px-4 py-1.5 text-sm text-ink-soft md:text-base">
                <MapPin className="h-4 w-4 text-brand" strokeWidth={2.25} />
                {tournament.venue}
              </span>
            ) : null}
            {tournament.start_date ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-cream-100 px-4 py-1.5 font-mono text-sm text-ink-soft md:text-base">
                <CalendarDays className="h-4 w-4 text-brand" strokeWidth={2.25} />
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

          <a
            href="#site-footer"
            aria-label="向下捲動"
            className="group mx-auto mt-12 inline-flex h-10 w-10 items-center justify-center rounded-full border border-cream-300 text-ink-muted transition hover:border-brand hover:text-brand md:mt-16"
          >
            <ChevronDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
          </a>
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

      <HomeFooter />
    </div>
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
