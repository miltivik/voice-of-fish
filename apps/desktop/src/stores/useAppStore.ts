import type { AppConfig, GenerationStatus } from "@voice-of-fish/shared";
import { create } from "zustand";
import { studioClient } from "@/lib/tauri";

interface AppState {
  config?: AppConfig;
  setupComplete: boolean;
  footerStatus: GenerationStatus | "ready" | "error";
  activeJobId: string | null;
  saveConfig: (config: AppConfig) => Promise<void>;
  hydrateConfig: (config: AppConfig) => void;
  setFooterStatus: (status: AppState["footerStatus"]) => void;
  setActiveJobId: (id: string | null) => void;
  cancelGeneration: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  setupComplete: false,
  footerStatus: "ready",
  activeJobId: null,
  saveConfig: async (config) => {
    await studioClient.saveAppConfig(config);
    set({ config, setupComplete: true });
  },
  hydrateConfig: (config) =>
    set({ config, setupComplete: Boolean(config.binaryPath?.trim()) }),
  setFooterStatus: (footerStatus) => set({ footerStatus }),
  setActiveJobId: (activeJobId) => set({ activeJobId }),
  cancelGeneration: async () => {
    const { activeJobId } = get();
    if (!activeJobId) return;
    await studioClient.cancelGeneration(activeJobId);
    set({ activeJobId: null });
  },
}));