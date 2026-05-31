import "@testing-library/jest-dom/vitest";

const { tauriInvokeGlobal } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tauriInvokeGlobal: vi.fn((_cmd: string): unknown => null),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriInvokeGlobal,
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

// Expose for test-utils/tauri-mocks.ts to configure per-test
(globalThis as Record<string, unknown>).__tauriInvoke = tauriInvokeGlobal;
