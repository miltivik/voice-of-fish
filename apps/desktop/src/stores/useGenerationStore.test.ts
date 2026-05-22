import { beforeEach, describe, expect, it } from "vitest";
import { useGenerationStore } from "./useGenerationStore";

describe("useGenerationStore", () => {
  beforeEach(() => useGenerationStore.getState().resetDraft());

  it("starts with local generation draft defaults", () => {
    expect(useGenerationStore.getState()).toMatchObject({
      draft: {
        text: "",
        language: "en",
        modelId: "s2-q6",
      },
      status: "idle",
    });
  });

  it("tracks text, patches, and style tag edits in the draft", () => {
    useGenerationStore.getState().setText("Read ");
    useGenerationStore.getState().patchDraft({ language: "es", seed: 42 });
    useGenerationStore.getState().insertTag("[serious]", 5, 5);

    expect(useGenerationStore.getState().draft).toMatchObject({
      text: "Read [serious]",
      language: "es",
      seed: 42,
    });
  });

  it("resets draft changes and generation status", () => {
    useGenerationStore.getState().patchDraft({ text: "Queued" });
    useGenerationStore.getState().setStatus("generating");

    useGenerationStore.getState().resetDraft();

    expect(useGenerationStore.getState()).toMatchObject({
      draft: {
        text: "",
        language: "en",
        modelId: "s2-q6",
      },
      status: "idle",
    });
  });
});
