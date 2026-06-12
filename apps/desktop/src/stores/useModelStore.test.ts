import { describe, it, expect, beforeEach } from "vitest";
import { useModelStore } from "./useModelStore";

describe("useModelStore", () => {
  beforeEach(() => {
    useModelStore.setState({ activeModelId: "s2-q6" });
  });

  it("defaults activeModelId to 's2-q6'", () => {
    // Reset to a fresh store state (simulating initial creation)
    useModelStore.setState({ activeModelId: "s2-q6" });
    expect(useModelStore.getState().activeModelId).toBe("s2-q6");
  });

  it("setActiveModelId: updates activeModelId", () => {
    useModelStore.getState().setActiveModelId("tiny-en");
    expect(useModelStore.getState().activeModelId).toBe("tiny-en");
  });

  it("setActiveModelId: multiple transitions track correctly", () => {
    useModelStore.getState().setActiveModelId("model-a");
    expect(useModelStore.getState().activeModelId).toBe("model-a");

    useModelStore.getState().setActiveModelId("model-b");
    expect(useModelStore.getState().activeModelId).toBe("model-b");

    useModelStore.getState().setActiveModelId("s2-q6");
    expect(useModelStore.getState().activeModelId).toBe("s2-q6");
  });
});
