import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { VoiceCloningPage } from "./VoiceCloningPage";

const mockListVoicePresets = vi.fn();
const mockSaveVoicePreset = vi.fn();
const mockDeleteVoicePreset = vi.fn();
const mockPickAudioPath = vi.fn();

vi.mock("@/lib/tauri", () => ({
  studioClient: {
    listVoicePresets: (...args: unknown[]) => mockListVoicePresets(...args),
    saveVoicePreset: (...args: unknown[]) => mockSaveVoicePreset(...args),
    deleteVoicePreset: (...args: unknown[]) => mockDeleteVoicePreset(...args),
  },
  pickAudioPath: (...args: unknown[]) => mockPickAudioPath(...args),
}));

describe("VoiceCloningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListVoicePresets.mockResolvedValue([]);
    mockPickAudioPath.mockResolvedValue(null);
  });

  it("renders empty preset list", async () => {
    render(<VoiceCloningPage />, { wrapper: AppProviders });

    expect(
      await screen.findByText("No voice presets saved yet."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add preset" })).toBeVisible();
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

    await user.click(screen.getByRole("button", { name: "Add preset" }));

    // Try submitting empty form
    await user.click(screen.getByRole("button", { name: "Save preset" }));

    // Validation errors should appear
    expect(screen.getByText("Name is required")).toBeVisible();
    expect(screen.getByText("Reference text is required")).toBeVisible();
    expect(screen.getByText("Reference file name is required")).toBeVisible();
  });

  it("saves a new preset and clears form", async () => {
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

    // Open add form
    await user.click(screen.getByRole("button", { name: "Add preset" }));

    // Fill form
    await user.type(screen.getByLabelText("Name"), "Test Voice");
    await user.type(screen.getByLabelText("Reference text"), "Testing");
    await user.type(
      screen.getByLabelText("Reference audio file"),
      "test.wav",
    );

    await user.click(screen.getByRole("button", { name: "Save preset" }));

    await vi.waitFor(() => {
      expect(mockSaveVoicePreset).toHaveBeenCalled();
    });

    const call = mockSaveVoicePreset.mock.calls[0][0];
    expect(call.name).toBe("Test Voice");
    expect(call.referenceText).toBe("Testing");
  });

  it("deletes a preset", async () => {
    const user = userEvent.setup();
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

    // Click delete button (trash icon)
    const deleteBtn = screen.getByTitle("Delete preset");
    await user.click(deleteBtn);

    expect(mockDeleteVoicePreset).toHaveBeenCalledWith("to-delete");
  });
});
