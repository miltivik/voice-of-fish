import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        studio: { DEFAULT: "#0b0e13", foreground: "#eef2f7" },
        panel: "#141922",
        line: "#283142",
        muted: "#94a3b8",
        accent: "#21c8a5",
        danger: "#ef476f",
      },
    },
  },
  plugins: [],
} satisfies Config;
