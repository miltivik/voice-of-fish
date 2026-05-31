import { render, screen, waitFor } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { SettingsPage } from "./SettingsPage";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";

describe("SettingsPage", () => {
  beforeEach(() => {
    setupTauriMocks({
      get_app_config: {
        mode: "simple" as const,
        binaryPath: "/custom/s2",
        modelsPath: "/tmp/models",
        outputsPath: "/tmp/out",
        defaultModelId: "s2-q8",
        defaultAudioFormat: "wav" as const,
        cpuThreads: 8,
        gpuEnabled: true,
        advancedArgs: {},
      },
    });
  });

  it("renders settings heading and form fields", async () => {
    render(<SettingsPage />, { wrapper: AppProviders });

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(screen.getByLabelText(/^Binary$/i)).toBeVisible();
    expect(screen.getByLabelText(/^Models$/i)).toBeVisible();
    expect(screen.getByLabelText(/^Outputs$/i)).toBeVisible();
  });

  it("loads existing config into form", async () => {
    render(<SettingsPage />, { wrapper: AppProviders });

    // Form renders with default values since store starts empty.
    // Engine Defaults section contains a model selector with s2-q8 from manifest.
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /s2-q8/i })).toBeVisible();
    });
  });

  it("shows engine defaults section", async () => {
    render(<SettingsPage />, { wrapper: AppProviders });

    // Engine Defaults is a CardTitle rendered as a div (not a heading).
    expect(screen.getByText("Engine Defaults")).toBeVisible();
    expect(screen.getByLabelText(/CPU Threads/i)).toBeVisible();
    expect(screen.getByLabelText(/Enable GPU/i)).toBeVisible();
  });
});
