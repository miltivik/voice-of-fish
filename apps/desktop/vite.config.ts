import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    chunkSizeWarningLimit: 550,
  },
});
