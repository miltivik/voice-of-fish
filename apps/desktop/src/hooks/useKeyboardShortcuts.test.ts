import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useAppStore } from "@/stores/useAppStore";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    useAppStore.setState({ activeJobId: null });
    setupTauriMocks({ cancel_generation: true });
  });

  it("Escape cancels active generation", async () => {
    useAppStore.setState({ activeJobId: "job-123" });
    renderHook(() => useKeyboardShortcuts());
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    // cancelGeneration is async — wait for state to update.
    await vi.waitFor(() => {
      expect(useAppStore.getState().activeJobId).toBeNull();
    });
  });

  it("Escape does nothing without active job", () => {
    useAppStore.setState({ activeJobId: null });
    renderHook(() => useKeyboardShortcuts());
    // Verify state unchanged after Escape — no cancel triggered.
    const before = useAppStore.getState().activeJobId;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(useAppStore.getState().activeJobId).toBe(before);
  });

  it("Ctrl+Enter submits generation form", () => {
    const form = document.createElement("form");
    form.id = "generation-form";
    form.requestSubmit = vi.fn();
    document.body.appendChild(form);
    renderHook(() => useKeyboardShortcuts());
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }),
    );
    expect(form.requestSubmit).toHaveBeenCalled();
    document.body.removeChild(form);
  });

  it("Ctrl+Enter does nothing when job is active", () => {
    useAppStore.setState({ activeJobId: "job-123" });
    const form = document.createElement("form");
    form.id = "generation-form";
    form.requestSubmit = vi.fn();
    document.body.appendChild(form);
    renderHook(() => useKeyboardShortcuts());
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }),
    );
    expect(form.requestSubmit).not.toHaveBeenCalled();
    document.body.removeChild(form);
  });
});
