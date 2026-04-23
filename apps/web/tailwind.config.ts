import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-instrument-sans)",
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
        // Siena-inspired warm ink palette
        ink: {
          DEFAULT: "#122023",
          soft: "#302e2a",
          muted: "#787368",
          faint: "#ababab",
        },
        cream: {
          50: "#faf7f1",
          100: "#f3f0eb",
          200: "#efe5d0",
          300: "#e6dfce",
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
          idle: "#787368",
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
