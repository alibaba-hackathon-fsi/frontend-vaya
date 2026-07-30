import type { Config } from "tailwindcss";

// The Vaya design system lives in src/app/globals.css (ported verbatim from the
// source app). Tailwind is kept minimal here — the light theme, brand colours,
// square borders and typography are all driven by CSS custom properties + the
// hand-written class set in globals.css.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        ink: "#013D3B",
        green: "#00C776",
      },
      fontFamily: {
        // "Be Vietnam Pro" is the Vietnamese-complete fallback (Sora has no
        // `vietnamese` subset); in VI mode globals.css promotes it to primary.
        disp: [
          "Sora",
          "Be Vietnam Pro",
          "Plus Jakarta Sans",
          "Noto Sans SC",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "Plus Jakarta Sans",
          "Be Vietnam Pro",
          "Noto Sans SC",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
