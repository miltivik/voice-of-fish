import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { VoiceCloningPage } from "./VoiceCloningPage";

const mockPresets = [
  {
    id: "voice-nora",
    name: "Nora short phrase",
    language: "en",
    referenceFileName: "nora.wav",
    referenceText: "Hello, this is a test recording.",
    notes: "First take",
    durationSeconds: 3.2,
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let invokeMock: any = vi.fn(() => Promise.resolve([...mockPresets]));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe("VoiceCloningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeMock = vi.fn((cmd: string) => {
      if (cmd === "list_voice_presets") return Promise.resolve([...mockPresets]);
      if (cmd === "delete_voice_preset") return Promise.resolve(true);
      return Promise.resolve([]);
    });
  });

  it("shows empty state when no presets", async () => {
    invokeMock = vi.fn(() => Promise.resolve([]));
    render(<VoiceCloningPage />, { wrapper: AppProviders });
    expect(await screen.findByText(/no voice presets saved yet/i)).toBeVisible();
  });

  it("shows preset cards", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });
    expect(await screen.findByText("Nora short phrase")).toBeVisible();
    expect(screen.getByText(/nora\.wav/i)).toBeVisible();
  });

  it("shows Add preset button and form toggle", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });
    await screen.findByText("Nora short phrase");
    expect(screen.getByRole("button", { name: /add preset/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /add preset/i }));
    expect(screen.getByRole("button", { name: /save preset/i })).toBeVisible();
    expect(screen.getByLabelText(/^name$/i)).toBeVisible();
  });

  it("fills edit form fields when edit button clicked", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });
    await screen.findByText("Nora short phrase");
    fireEvent.click(screen.getByTitle("Edit preset"));
    expect(screen.getByRole("button", { name: /update preset/i })).toBeVisible();
    expect(screen.getByText("Edit preset")).toBeVisible();
  });

  it("shows validation error for bad reference file extension", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });
    await screen.findByText("Nora short phrase");
    fireEvent.click(screen.getByRole("button", { name: /add preset/i }));
    const input = screen.getByLabelText(/reference audio file/i);
    fireEvent.change(input, { target: { value: "recording.ogg" } });
    expect(screen.getByText(/must be \.wav, \.mp3, or \.flac/i)).toBeVisible();
  });

  it("shows Cancel button when editing", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });
    await screen.findByText("Nora short phrase");
    fireEvent.click(screen.getByTitle("Edit preset"));
    expect(screen.getByRole("button", { name: /cancel/i })).toBeVisible();
  });

  it("deletes preset via IPC", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });
    await screen.findByText("Nora short phrase");
    fireEvent.click(screen.getByTitle("Delete preset"));
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("delete_voice_preset", {
        id: "voice-nora",
      });
    });
  });
});
