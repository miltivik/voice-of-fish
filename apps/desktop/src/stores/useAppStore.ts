import type { AppConfig, GenerationStatus } from "@voice-of-fish/shared";
import { create } from "zustand";

interface AppState {
  config?: AppConfig;
  setupComplete: boolean;
  footerStatus: GenerationStatus | "ready" | "error";
  saveConfig: (config: AppConfig) => void;
  setFooterStatus: (status: AppState["footerStatus"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  setupComplete: false,
  footerStatus: "ready",
  saveConfig: (config) => set({ config, setupComplete: true }),
  setFooterStatus: (footerStatus) => set({ footerStatus }),
}));
