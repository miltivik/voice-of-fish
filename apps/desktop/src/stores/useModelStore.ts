import { create } from "zustand";

interface ModelState {
  activeModelId: string;
  setActiveModelId: (activeModelId: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  activeModelId: "s2-q6",
  setActiveModelId: (activeModelId) => set({ activeModelId }),
}));
