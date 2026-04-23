import Image from "next/image";

import { API_V1 } from "@/lib/api-client";
import { TOURNAMENT_STATUS_LABEL, type Tournament, type TournamentStatus } from "@/types/models";

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

function statusLabel(s: string): string {
  return TOURNAMENT_STATUS_LABEL[s as TournamentStatus] ?? s;
}

export default async function HomePage() {
  const tournament = await fetchTournament();

  return (
    <>
      <div className="flex min-h-[calc(100vh-160px)] flex-col">
        <div className="space-y-20">
          {tournament ? (
            <section className="pt-6">
              <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-ink-muted">
                Tournament
              </div>
              <h1 className="mt-5 font-serif text-5xl font-medium italic leading-[1.05] tracking-tight text-ink md:text-6xl lg:text-7xl">
                {tournament.name}
              </h1>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-ink-soft">
                {tournament.venue ? (
                  <span className="text-lg md:text-xl">{tournament.venue}</span>
                ) : null}
                {tournament.start_date ? (
                  <>
                    <span className="text-ink-faint">·</span>
                    <span className="font-mono text-base text-ink-muted">
                      {tournament.start_date}
                      {tournament.end_date && tournament.end_date !== tournament.start_date
                        ? ` → ${tournament.end_date}`
                        : ""}
                    </span>
                  </>
                ) : null}
                <span className="rounded-full border border-ink/15 bg-white/60 px-3 py-1 text-xs font-medium text-ink-soft backdrop-blur">
                  {statusLabel(tournament.status)}
                </span>
              </div>

              {tournament.current_schedule_time ? (
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-butter/50 px-3 py-1.5 text-sm text-ink backdrop-blur">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
                    now
                  </span>
                  <span className="font-medium">{tournament.current_schedule_time}</span>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-4 text-sm text-accent-coral">
              無法連線到後端 API，請確認 uvicorn 於 http://localhost:8000 啟動。
            </section>
          )}

          <section className="max-w-3xl">
            <div className="flex items-baseline gap-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-ink-muted">
                Announcement
              </div>
              <span className="h-px flex-1 bg-ink/10" />
            </div>
            <h2 className="mt-4 font-serif text-3xl font-medium italic text-ink md:text-4xl">
              大會公告
            </h2>
            {tournament?.announcement_text ? (
              <pre className="mt-5 whitespace-pre-wrap font-sans text-base leading-relaxed text-ink-soft md:text-lg">
                {tournament.announcement_text}
              </pre>
            ) : (
              <p className="mt-5 text-sm text-ink-muted">
                尚未張貼公告。請至 管理後台 → 賽事資訊與公告 編輯。
              </p>
            )}
          </section>
        </div>

        <div className="mt-auto pt-16">
          <Marquee />
        </div>
      </div>
    </>
  );
}

function Marquee() {
  // 6 copies of [logo, @PopGkuai] so total width is comfortably wider than
  // most viewports; animation translates -16.6666% per cycle (one set scrolls past).
  return (
    <div
      aria-hidden
      className="-mx-[calc(50vw-50%)] overflow-hidden border-y border-cream-200/70 py-4"
    >
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex shrink-0 items-center gap-10">
            <Image
              src="/logo-removebg-preview.png"
              alt="NTUTTST"
              width={689}
              height={362}
              className="h-12 w-auto shrink-0 md:h-16 lg:h-20"
              priority={i === 0}
            />
            <span className="inline-block shrink-0 py-1.5 font-serif text-xl font-medium italic leading-none text-ink/70 md:text-2xl lg:text-3xl">
              @PopGkuai
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
