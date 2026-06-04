import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { VoiceCloningPage } from "./VoiceCloningPage";

const mockListVoicePresets = vi.fn();
const mockSaveVoicePreset = vi.fn();
const mockDeleteVoicePreset = vi.fn();
const mockPickAudioPath = vi.fn();
const mockOpenOutputFile = vi.fn();

vi.mock("@/lib/tauri", () => ({
  studioClient: {
    listVoicePresets: (...args: unknown[]) => mockListVoicePresets(...args),
    saveVoicePreset: (...args: unknown[]) => mockSaveVoicePreset(...args),
    deleteVoicePreset: (...args: unknown[]) => mockDeleteVoicePreset(...args),
    openOutputFile: (...args: unknown[]) => mockOpenOutputFile(...args),
  },
  pickAudioPath: (...args: unknown[]) => mockPickAudioPath(...args),
}));

describe("VoiceCloningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListVoicePresets.mockResolvedValue([]);
    mockPickAudioPath.mockResolvedValue(null);
    mockOpenOutputFile.mockResolvedValue(undefined);
  });

  it("renders empty preset list", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });

    expect(
      await screen.findByText("No voice presets saved yet."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add voice" })).toBeVisible();
  });

  it("renders saved presets", async () => {
    mockListVoicePresets.mockResolvedValue([
      {
        id: "p1",
        name: "Nora",
        language: "en",
        referenceText: "Hello world",
        referenceFileName: "nora.wav",
        referenceAudioPath: "/audio/nora.wav",
        notes: "Test preset",
      },
    ]);

    render(<VoiceCloningPage />, { wrapper: AppProviders });

    expect(await screen.findByText("Nora")).toBeVisible();
    expect(screen.getByText(/nora\.wav/)).toBeVisible();
    expect(screen.getByText(/EN/)).toBeVisible();
  });

  it("shows add preset form and validates required fields", async () => {
    const user = userEvent.setup();
    render(<VoiceCloningPage />, { wrapper: AppProviders });

    await user.click(screen.getByRole("button", { name: "Add voice" }));

    // Try submitting empty form
    await user.click(screen.getByRole("button", { name: "Save preset" }));

    // Validation errors appear (onChange mode, so they show immediately)
    expect(await screen.findByText("Name is required")).toBeVisible();
    expect(screen.getByText("Reference text is required")).toBeVisible();
  });

  it("saves a new preset and closes form", async () => {
    const user = userEvent.setup();
    mockSaveVoicePreset.mockResolvedValue({
      id: "new-1",
      name: "Test Voice",
      language: "en",
      referenceText: "Testing",
      referenceFileName: "test.wav",
      referenceAudioPath: "/audio/test.wav",
    });

    render(<VoiceCloningPage />, { wrapper: AppProviders });

    await user.click(screen.getByRole("button", { name: "Add voice" }));

    await user.type(screen.getByLabelText("Name"), "Test Voice");
    await user.type(screen.getByLabelText("Reference text"), "Testing");

    // Pick audio file
    mockPickAudioPath.mockResolvedValue("/audio/test.wav");
    await user.click(screen.getByRole("button", { name: "Browse…" }));

    await user.click(screen.getByRole("button", { name: "Save preset" }));

    await vi.waitFor(() => {
      expect(mockSaveVoicePreset).toHaveBeenCalled();
    });

    const call = mockSaveVoicePreset.mock.calls[0][0];
    expect(call.name).toBe("Test Voice");
    expect(call.referenceText).toBe("Testing");
    expect(call.referenceFileName).toBe("test.wav");
    expect(call.referenceAudioPath).toBe("/audio/test.wav");
  });

  it("deletes a preset after confirmation", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockListVoicePresets.mockResolvedValue([
      {
        id: "to-delete",
        name: "Delete Me",
        language: "es",
        referenceText: "Hola",
        referenceFileName: "hola.wav",
        referenceAudioPath: "/audio/hola.wav",
      },
    ]);
    mockDeleteVoicePreset.mockResolvedValue(true);

    render(<VoiceCloningPage />, { wrapper: AppProviders });

    await screen.findByText("Delete Me");

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteVoicePreset).toHaveBeenCalledWith("to-delete");
    confirmSpy.mockRestore();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mockListVoicePresets.mockResolvedValue([
      {
        id: "keep-me",
        name: "Keep Me",
        language: "en",
        referenceText: "test",
        referenceFileName: "test.wav",
        referenceAudioPath: "/audio/test.wav",
      },
    ]);

    render(<VoiceCloningPage />, { wrapper: AppProviders });

    await screen.findByText("Keep Me");

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteVoicePreset).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("plays reference audio when Play is clicked", async () => {
    const user = userEvent.setup();
    mockListVoicePresets.mockResolvedValue([
      {
        id: "p1",
        name: "Nora",
        language: "en",
        referenceText: "Hello",
        referenceFileName: "nora.wav",
        referenceAudioPath: "/audio/nora.wav",
      },
    ]);

    render(<VoiceCloningPage />, { wrapper: AppProviders });

    await screen.findByText("Nora");

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(mockOpenOutputFile).toHaveBeenCalledWith("/audio/nora.wav");
  });

  it("filters presets by search", async () => {
    const user = userEvent.setup();
    mockListVoicePresets.mockResolvedValue([
      { id: "p1", name: "Alpha", language: "en", referenceText: "a", referenceFileName: "a.wav" },
      { id: "p2", name: "Beta", language: "es", referenceText: "b", referenceFileName: "b.wav" },
    ]);

    render(<VoiceCloningPage />, { wrapper: AppProviders });

    await screen.findByText("Alpha");
    expect(screen.getByText("Beta")).toBeVisible();

    await user.type(screen.getByPlaceholderText("Search presets…"), "alpha");
    expect(screen.getByText("Alpha")).toBeVisible();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });
});
