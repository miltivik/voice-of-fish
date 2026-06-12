import type { GenerationStatus } from "@voice-of-fish/shared";
import { generationRequestSchema } from "@voice-of-fish/shared/schemas";
import { z } from "zod";
import { create } from "zustand";

type GenerationRequest = z.infer<typeof generationRequestSchema>;

const initialDraft: GenerationRequest = {
  text: "",
  language: "en",
  modelId: "s2-q6",
};

interface GenerationState {
  draft: GenerationRequest;
  status: GenerationStatus;
  patchDraft: (patch: Partial<GenerationRequest>) => void;
  setStatus: (status: GenerationStatus) => void;
  resetDraft: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  draft: { ...initialDraft },
  status: "idle",
  patchDraft: (patch) =>
    set((state) => ({ draft: { ...state.draft, ...patch } })),
  setStatus: (status) => set({ status }),
  resetDraft: () => set({ draft: { ...initialDraft }, status: "idle" }),
}));
