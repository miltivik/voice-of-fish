import { render, screen } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";
import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  beforeEach(() => {
    setupTauriMocks({
      list_local_models: [{ id: "s2-q6", quant: "Q6", filename: "test.gguf", displaySize: "4.5 GB", approxBytes: 4500000000, recommendation: "Recommended", tokenizerRequired: true, state: "installed" }],
      list_voice_presets: [],
      generate_sentences: [],
    });
  });

  it("renders editor heading and script textarea", () => {
    render(<EditorPage />, { wrapper: AppProviders });

    expect(screen.getByRole("heading", { name: "Editor" })).toBeVisible();
    expect(
      screen.getByPlaceholderText(/Welcome to the show/i),
    ).toBeVisible();
  });

  it("shows sentence count based on input", () => {
    render(<EditorPage />, { wrapper: AppProviders });

    // With empty script, button says "0 sentence(s)"
    expect(
      screen.getByText(/Generate 0 sentence\(s\)/),
    ).toBeVisible();
  });
});