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
  setActiveModelAndPersist: (modelId: string) => Promise<void>;
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
  setActiveModelAndPersist: async (modelId: string) => {
    const previous = get().config;
    if (!previous) {
      // The hydration effect in AppShell sets `config` before any route
      // mounts. If this fires, a caller is racing hydration — surface
      // it as a rejection rather than silently dropping the change.
      throw new Error("setActiveModelAndPersist called before config hydrated");
    }
    const updated = { ...previous, defaultModelId: modelId };
    set({ config: updated });
    try {
      await studioClient.saveAppConfig(updated);
    } catch (err) {
      // Restore the snapshot we captured before the optimistic write.
      // Re-reading get().config here would return the new value, since
      // the set above already published it to the store.
      console.error(
        "[useAppStore] failed to persist defaultModelId, reverting:",
        err,
      );
      set({ config: previous });
    }
  },
}));
