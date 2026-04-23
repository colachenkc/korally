"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

type BackgroundSet = {
  desktop: string;
  /** Optional portrait/mobile image. If omitted, desktop image is used. */
  mobile?: string;
};

/**
 * Map route prefixes to their hero background. Order matters: earlier entries
 * are matched first. "/" is an exact-match special case.
 */
const BACKGROUNDS: Array<{ match: string; exact?: boolean; bg: BackgroundSet }> = [
  { match: "/", exact: true, bg: { desktop: "/homepage-hero.jpg", mobile: "/IMG_4503.JPG" } },
  { match: "/live", bg: { desktop: "/115全大運.jpg" } },
  { match: "/schedule", bg: { desktop: "/115全大運.jpg" } },
  { match: "/results", bg: { desktop: "/115全大運.jpg" } },
];

function pickBackground(pathname: string | null): BackgroundSet | null {
  if (!pathname) return null;
  for (const entry of BACKGROUNDS) {
    if (entry.exact ? pathname === entry.match : pathname.startsWith(entry.match)) {
      return entry.bg;
    }
  }
  return null;
}

/**
 * Fixed-viewport hero background. Rendered in the root layout (outside
 * <main>) so it stays still while page content animates in via template.tsx.
 */
export function HomeBackground() {
  const pathname = usePathname();
  const bg = pickBackground(pathname);
  if (!bg) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {bg.mobile ? (
        <>
          <Image
            key={`desktop-${bg.desktop}`}
            src={bg.desktop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="hidden object-cover md:block"
          />
          <Image
            key={`mobile-${bg.mobile}`}
            src={bg.mobile}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover md:hidden"
          />
        </>
      ) : (
        <Image
          key={`single-${bg.desktop}`}
          src={bg.desktop}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-cream-50/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-cream-50 via-transparent to-cream-50" />
    </div>
  );
}
