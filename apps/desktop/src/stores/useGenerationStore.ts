import type { GenerationRequest, GenerationStatus } from "@voice-of-fish/shared";
import { create } from "zustand";
import { insertTagAtSelection } from "@/lib/tag-editor";

const initialDraft: GenerationRequest = {
  text: "",
  language: "en",
  modelId: "s2-q6",
};

interface GenerationState {
  draft: GenerationRequest;
  status: GenerationStatus;
  setText: (text: string) => void;
  patchDraft: (patch: Partial<GenerationRequest>) => void;
  insertTag: (tag: string, start: number, end: number) => void;
  setStatus: (status: GenerationStatus) => void;
  resetDraft: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  draft: { ...initialDraft },
  status: "idle",
  setText: (text) => set((state) => ({ draft: { ...state.draft, text } })),
  patchDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  insertTag: (tag, start, end) =>
    set((state) => ({
      draft: {
        ...state.draft,
        text: insertTagAtSelection(state.draft.text, tag, start, end).text,
      },
    })),
  setStatus: (status) => set({ status }),
  resetDraft: () => set({ draft: { ...initialDraft }, status: "idle" }),
}));
