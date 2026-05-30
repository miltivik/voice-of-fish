import type {
  GenerationJob,
  GenerationRequest,
  GenerationStatus,
} from "@voice-of-fish/shared";
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
  completedJob: GenerationJob | null;
  setText: (text: string) => void;
  patchDraft: (patch: Partial<GenerationRequest>) => void;
  insertTag: (tag: string, start: number, end: number) => void;
  setStatus: (status: GenerationStatus) => void;
  setCompletedJob: (job: GenerationJob | null) => void;
  resetDraft: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  draft: { ...initialDraft },
  status: "idle",
  completedJob: null,
  setText: (text) => set((state) => ({ draft: { ...state.draft, text } })),
  patchDraft: (patch) =>
    set((state) => ({ draft: { ...state.draft, ...patch } })),
  insertTag: (tag, start, end) =>
    set((state) => ({
      draft: {
        ...state.draft,
        text: insertTagAtSelection(state.draft.text, tag, start, end).text,
      },
    })),
  setStatus: (status) => set({ status }),
  setCompletedJob: (completedJob) => set({ completedJob }),
  resetDraft: () =>
    set({ draft: { ...initialDraft }, status: "idle", completedJob: null }),
}));
