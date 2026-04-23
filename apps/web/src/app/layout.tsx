import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Instrument_Sans } from "next/font/google";

import { AppHeader } from "@/components/layout/AppHeader";
import { HomeBackground } from "@/components/layout/HomeBackground";
import "@/styles/globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NTUTTST賽事系統",
  description: "桌球賽事即時監控與賽程管理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-Hant"
      className={`${instrumentSans.variable} ${fraunces.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-cream-50 font-sans text-ink antialiased">
        <HomeBackground />
        <AppHeader />
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
