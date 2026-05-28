import "@testing-library/jest-dom/vitest";


vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
