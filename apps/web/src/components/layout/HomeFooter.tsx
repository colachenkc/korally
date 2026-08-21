import Link from "next/link";

const CONTACT_EMAIL = "wearekorally@gmail.com";
const CONTACT_SUBJECT = "KoRally inquiry";
const CONTACT_BODY = "Hi,\n\n(Please describe your question or feedback)\n";

const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  CONTACT_SUBJECT,
)}&body=${encodeURIComponent(CONTACT_BODY)}`;

export function HomeFooter() {
  return (
    <footer
      id="site-footer"
      className="relative isolate mt-16 overflow-hidden rounded-t-[2rem] border-t border-cream-200 bg-cream-100 px-6 py-14 md:mt-24 md:px-16 md:py-20"
    >
      <div className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-20">
        {/* Brand */}
        <div>
          <div className="text-2xl font-bold tracking-tight text-ink">KoRally</div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
            A live-monitoring and roster-management system designed for on-site
            tournament ops. Open source, spectator-ready.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href="https://github.com/colachenkc/cola-match-monitor"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cream-300 bg-cream-300 text-ink-soft transition hover:border-brand hover:text-brand"
            >
              <GitHubIcon />
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-sm font-semibold text-ink">Quick Links</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
            <li>
              <Link href="/live" className="hover:text-brand">
                Live Monitor
              </Link>
            </li>
            <li>
              <Link href="/schedule" className="hover:text-brand">
                Schedule
              </Link>
            </li>
            <li>
              <Link href="/results" className="hover:text-brand">
                Results
              </Link>
            </li>
            <li>
              <Link href="/standings" className="hover:text-brand">
                Standings
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-sm font-semibold text-ink">Legal</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-muted">
            <li>
              <Link href="/#about-us" className="hover:text-brand">
                About us
              </Link>
            </li>
            <li>
              <a href={mailto} className="hover:text-brand">
                Contact us
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative z-10 mt-12 border-t border-cream-200 pt-6 text-center font-mono text-xs text-ink-faint">
        © {new Date().getFullYear()} KoRally · All rights reserved.
      </div>
    </footer>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.9.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.19.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.98 10.98 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.35.77 1.05.77 2.12 0 1.53-.01 2.77-.01 3.14 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
