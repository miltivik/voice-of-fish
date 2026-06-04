import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";
import { GenerationPage } from "./GenerationPage";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";

describe("GenerationPage", () => {
  beforeEach(() => {
    setupTauriMocks({
      list_local_models: structuredClone(S2_MODEL_MANIFEST),
      run_generation: { id: "mock-job-1", status: "completed", createdAt: "2026-05-26T12:00:00.000Z", completedAt: "2026-05-26T12:00:01.000Z", outputPath: "/outputs/mock.wav", durationSeconds: 6.4 },
      list_generation_history: [],
      get_system_info: { os: "Test OS", cpu: "Test CPU", ramLabel: "16 GB", appVersion: "0.1.0" },
      get_app_config: null,
      list_voice_presets: [
        {
          id: "built-in-en-female-1",
          name: "Alice",
          language: "en",
          referenceText: "Hello world",
          referenceFileName: "alice.mp3",
          referenceAudioPath: "/refs/alice.mp3",
          gender: "female",
          durationSeconds: 12,
        },
        {
          id: "built-in-en-male-1",
          name: "Bob",
          language: "en",
          referenceText: "Hello world",
          referenceFileName: "bob.mp3",
          referenceAudioPath: "/refs/bob.mp3",
          gender: "male",
          durationSeconds: 10,
        },
        {
          id: "custom-preset-1",
          name: "NoGender",
          language: "en",
          referenceText: "Hello world",
          referenceFileName: "nogender.wav",
          referenceAudioPath: "/refs/nogender.wav",
          durationSeconds: 8,
        },
      ],
    });
  });
  it("shows gender in voice preset selector when available", async () => {
    render(<GenerationPage />, { wrapper: AppProviders });
    const select = await screen.findByLabelText(/voice preset/i);
    await new Promise((r) => setTimeout(r, 100));
    // All options (including those inside optgroups).
    const allOptions = select.querySelectorAll("option");
    // "None" + 3 presets (Alice, Bob, NoGender).
    expect(allOptions).toHaveLength(4);
    expect(allOptions[0].textContent).toBe("None");
    // Built-in voices have gender shown.
    const aliceOpt = Array.from(allOptions).find(
      (o) => o.textContent === "Alice (female)"
    );
    expect(aliceOpt).toBeDefined();
    const bobOpt = Array.from(allOptions).find(
      (o) => o.textContent === "Bob (male)"
    );
    expect(bobOpt).toBeDefined();
    const noGenderOpt = Array.from(allOptions).find(
      (o) => o.textContent === "NoGender"
    );
    expect(noGenderOpt).toBeDefined();
  });
  it("inserts style tag and completes mock generation", async () => {
    const user = userEvent.setup();
    render(<GenerationPage />, { wrapper: AppProviders });
    const textarea = screen.getByLabelText(/script text/i);
    await user.type(textarea, "Local voice");
    await user.click(screen.getByRole("button", { name: "[calm]" }));
    expect((textarea as HTMLTextAreaElement).value).toContain("[calm]");
    const generateButton = await screen.findByRole("button", {
      name: /^generate$/i,
    });
    await user.click(generateButton);
    const resultSection = screen.getByText("Result").closest("section")!;
    expect(
      await within(resultSection).findByText(/generation completed/i),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /export wav/i })).toBeEnabled();
  });
});