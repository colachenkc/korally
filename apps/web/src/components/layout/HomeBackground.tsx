"use client";

import { usePathname } from "next/navigation";

/**
 * Two soft animated green blobs pinned to the viewport, only rendered on the
 * home page. Lives at the body level (outside `<main>`) so the fixed
 * positioning covers the full viewport instead of being visually contained by
 * main's `max-w-7xl` stacking context.
 */
export function HomeBackground() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="animate-green-blob-a absolute left-[10%] top-[15%] h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(circle,hsl(var(--color-2)/0.28),transparent_70%)] blur-3xl" />
      <div className="animate-green-blob-b absolute right-[10%] bottom-[10%] h-[42vw] w-[42vw] rounded-full bg-[radial-gradient(circle,hsl(var(--brand)/0.22),transparent_70%)] blur-3xl" />
    </div>
  );
}
