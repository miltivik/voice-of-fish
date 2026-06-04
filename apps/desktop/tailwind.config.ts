import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SF Mono", "monospace"],
        sans: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Glassmorphic brutalist palette
        concrete: {
          DEFAULT: "#0a0a0e",
          50: "#f0f0f5",
          100: "#d8d8e0",
          200: "#b0b0bd",
          300: "#88889a",
          400: "#606070",
          500: "#40404e",
          600: "#2a2a34",
          700: "#1a1a22",
          800: "#101016",
          900: "#0a0a0e",
        },
        glass: {
          DEFAULT: "rgba(18,18,28,0.72)",
          light: "rgba(24,24,36,0.60)",
          heavy: "rgba(14,14,22,0.85)",
          border: "rgba(255,255,255,0.10)",
          "border-strong": "rgba(255,255,255,0.18)",
        },
        electric: {
          DEFAULT: "#00e5ff",
          50: "#e0fcff",
          100: "#b0f7ff",
          200: "#60efff",
          300: "#00e5ff",
          400: "#00c8e0",
          500: "#00a8bd",
        },
        ember: {
          DEFAULT: "#ff3d5c",
          50: "#ffe5ea",
          400: "#ff3d5c",
          600: "#d42a44",
        },
        warning: "#ffb800",
      },
      backdropBlur: {
        glass: "24px",
      },
      borderRadius: {
        brutal: "2px",
      },
      boxShadow: {
        "glass-sm": "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 2px 8px rgba(0,0,0,0.4)",
        "glass-md":
          "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 4px 16px rgba(0,0,0,0.5)",
        "brutal": "4px 4px 0 0 rgba(0,0,0,0.6)",
        "brutal-sm": "2px 2px 0 0 rgba(0,0,0,0.5)",
      },
      keyframes: {
        "glass-shimmer": {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
