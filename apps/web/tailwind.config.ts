import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-instrument-sans)",
          "var(--font-noto-tc)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "PingFang TC",
          "Noto Sans TC",
          "Microsoft JhengHei",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        "color-1": "hsl(var(--color-1))",
        "color-2": "hsl(var(--color-2))",
        "color-3": "hsl(var(--color-3))",
        "color-4": "hsl(var(--color-4))",
        "color-5": "hsl(var(--color-5))",
        brand: "hsl(var(--brand))",
        // Dark-first palette. Names kept from the previous warm theme to avoid
        // touching every className, but values flipped: `cream-*` = surfaces
        // (dark), `ink-*` = text (light). Do not treat "cream" as literally cream.
        ink: {
          DEFAULT: "#f4f4f5",
          soft: "#d4d4d8",
          muted: "#a1a1aa",
          faint: "#71717a",
        },
        cream: {
          50: "#0a0a0b",
          100: "#141416",
          200: "#232326",
          300: "#2c2c30",
        },
        accent: {
          coral: "#fb5646",
          peach: "#fec796",
          butter: "#f2e59a",
          lilac: "#827acc",
          sky: "#2e79d8",
          blush: "#fda3ac",
        },
        status: {
          idle: "#a1a1aa",
          preparing: "#fec796",
          inProgress: "#2e79d8",
          delayed: "#fb5646",
          finished: "#827acc",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(18, 32, 35, 0.04), 0 2px 4px rgba(18, 32, 35, 0.05)",
        pop: "0 4px 10px rgba(18, 32, 35, 0.06), 0 10px 24px rgba(18, 32, 35, 0.04)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0%)" },
          to: { transform: "translateX(-16.6667%)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-border": {
          "0%, 100%": { borderRadius: "37% 29% 27% 27% / 28% 25% 41% 37%" },
          "25%": { borderRadius: "47% 29% 39% 49% / 61% 19% 66% 26%" },
          "50%": { borderRadius: "57% 23% 47% 72% / 63% 17% 66% 33%" },
          "75%": { borderRadius: "28% 49% 29% 100% / 93% 20% 64% 25%" },
        },
        "gradient-1": {
          "0%, 100%": { top: "0", right: "0" },
          "50%": { top: "50%", right: "25%" },
          "75%": { top: "25%", right: "50%" },
        },
        "gradient-2": {
          "0%, 100%": { top: "0", left: "0" },
          "60%": { top: "75%", left: "25%" },
          "85%": { top: "50%", left: "50%" },
        },
        "gradient-3": {
          "0%, 100%": { bottom: "0", left: "0" },
          "40%": { bottom: "50%", left: "25%" },
          "65%": { bottom: "25%", left: "50%" },
        },
        "gradient-4": {
          "0%, 100%": { bottom: "0", right: "0" },
          "50%": { bottom: "25%", right: "40%" },
          "90%": { bottom: "50%", right: "25%" },
        },
      },
      animation: {
        marquee: "marquee 18s linear infinite",
        "fade-in-up": "fadeInUp 500ms ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
