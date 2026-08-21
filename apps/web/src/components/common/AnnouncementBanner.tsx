"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";

import { Banner } from "@/components/ui/banner";

/**
 * Client-side wrapper so the (async) Server Component homepage can pass in
 * the tournament announcement text and let the Banner manage its own dismiss.
 */
export function AnnouncementBanner({ text }: { text: string }) {
  const [show, setShow] = useState(true);
  if (!text) return null;

  return (
    <Banner
      show={show}
      onHide={() => setShow(false)}
      icon={<Megaphone className="m-px h-4 w-4 text-green-800" />}
      title={<span className="whitespace-pre-wrap">{text}</span>}
    />
  );
}
