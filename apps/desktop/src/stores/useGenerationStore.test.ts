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

  it("patches the draft across multiple calls", () => {
    useGenerationStore.getState().patchDraft({ text: "Read " });
    useGenerationStore.getState().patchDraft({ language: "es", seed: 42 });

    expect(useGenerationStore.getState().draft).toMatchObject({
      text: "Read ",
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
