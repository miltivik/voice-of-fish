import type { AppConfig, GenerationStatus } from "@voice-of-fish/shared";
import { create } from "zustand";
import { studioClient } from "@/lib/tauri";

interface AppState {
  config?: AppConfig;
  setupComplete: boolean;
  footerStatus: GenerationStatus | "ready" | "error";
  saveConfig: (config: AppConfig) => Promise<void>;
  hydrateConfig: (config: AppConfig) => void;
  setFooterStatus: (status: AppState["footerStatus"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  setupComplete: false,
  footerStatus: "ready",
  saveConfig: async (config) => {
    await studioClient.saveAppConfig(config);
    set({ config, setupComplete: true });
  },
  hydrateConfig: (config) =>
    set({ config, setupComplete: Boolean(config.binaryPath?.trim()) }),
  setFooterStatus: (footerStatus) => set({ footerStatus }),
}));