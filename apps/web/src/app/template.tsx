"use client";

/**
 * Re-mounts on every route change (unlike layout.tsx which persists),
 * so the fadeInUp animation plays each time the user navigates.
 * The background image is rendered in the root layout (HomeBackground),
 * so it stays still while the page content floats in.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in-up">{children}</div>;
}
