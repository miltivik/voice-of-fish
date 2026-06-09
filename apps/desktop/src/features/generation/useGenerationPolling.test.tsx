import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { GenerationJob } from "@voice-of-fish/shared";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";
import { useGenerationPolling } from "./useGenerationPolling";
import { useGenerationStore } from "@/stores/useGenerationStore";

const baseJob: GenerationJob = {
  id: "j1",
  text: "hello",
  language: "en",
  modelId: "s2-q6",
  status: "generating",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useGenerationPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useGenerationStore.getState().resetDraft();
  });

  it("stops polling after unmount", async () => {
    let callCount = 0;
    setupTauriMocks({
      get_active_job: () => {
        callCount++;
        return { ...baseJob, status: "generating" };
      },
    });

    const onCompletedJob = vi.fn();
    const { result, unmount } = renderHook(
      () => useGenerationPolling({ onCompletedJob }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.startPolling();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(callCount).toBe(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    // Still 1 — unmount stopped the interval.
    expect(callCount).toBe(1);
  });

  it("calls onCompletedJob and sets completed status", async () => {
    const completedJob = { ...baseJob, status: "completed" as const };
    setupTauriMocks({
      get_active_job: () => completedJob,
    });

    const onCompletedJob = vi.fn();
    const { result } = renderHook(
      () => useGenerationPolling({ onCompletedJob }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.startPolling();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(onCompletedJob).toHaveBeenCalledWith(completedJob);
    expect(useGenerationStore.getState().status).toBe("completed");
  });

  it("sets failed status after consecutive polling errors", async () => {
    setupTauriMocks({
      get_active_job: () => {
        throw new Error("network error");
      },
    });

    const onCompletedJob = vi.fn();
    const { result } = renderHook(
      () => useGenerationPolling({ onCompletedJob }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.startPolling();
    });

    // 3 consecutive errors at 500ms intervals = 1500ms
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(useGenerationStore.getState().status).toBe("failed");
  });
});
