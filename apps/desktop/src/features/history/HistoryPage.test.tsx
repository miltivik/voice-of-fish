import { render, screen } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { HistoryPage } from "./HistoryPage";

const MOCK_RECORDS = [
  {
    id: "record-1",
    text: "Hello world, this is a test.",
    modelId: "s2_001",
    voiceName: "Alice",
    outputPath: "/outputs/hello.wav",
    status: "completed",
    createdAt: "2026-05-28T10:00:00.000Z",
    durationSeconds: 3.2,
  },
  {
    id: "record-2",
    text: "Another generation with longer text.",
    modelId: "s2_001",
    voiceName: "Bob",
    outputPath: "/outputs/another.wav",
    status: "completed",
    createdAt: "2026-05-29T14:30:00.000Z",
    durationSeconds: 5.1,
  },
];

const { mockInvoke } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mockInvoke: vi.fn((cmd: string): unknown => []),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

describe("HistoryPage", () => {
  beforeEach(() => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "list_generation_history") return [];
      return null;
    });
  });

  it("renders empty history state", async () => {
    render(<HistoryPage />, { wrapper: AppProviders });

    expect(
      await screen.findByText(/no generation history/i),
    ).toBeVisible();
  });

  it("renders history records", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "list_generation_history")
        return structuredClone(MOCK_RECORDS);
      return null;
    });

    render(<HistoryPage />, { wrapper: AppProviders });

    expect(await screen.findByText(/Hello world/i)).toBeVisible();
    expect(screen.getByText(/Another generation/i)).toBeVisible();
  });
});
