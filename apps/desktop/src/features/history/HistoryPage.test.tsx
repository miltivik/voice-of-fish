import { render, screen } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { HistoryPage } from "./HistoryPage";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";

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

describe("HistoryPage", () => {
  beforeEach(() => {
    setupTauriMocks({ list_generation_history: [] });
  });

  it("renders empty history state", async () => {
    render(<HistoryPage />, { wrapper: AppProviders });
    expect(
      await screen.findByText(/no generation history/i),
    ).toBeVisible();
  });

  it("renders history records", async () => {
    setupTauriMocks({ list_generation_history: structuredClone(MOCK_RECORDS) });
    render(<HistoryPage />, { wrapper: AppProviders });
    expect(await screen.findByText(/Hello world/i)).toBeVisible();
    expect(screen.getByText(/Another generation/i)).toBeVisible();
  });
  it("renders open folder button for each record", async () => {
    setupTauriMocks({ list_generation_history: structuredClone(MOCK_RECORDS) });
    render(<HistoryPage />, { wrapper: AppProviders });
    const folderButtons = await screen.findAllByText(/abrir carpeta/i);
    expect(folderButtons).toHaveLength(2);
  });
});
