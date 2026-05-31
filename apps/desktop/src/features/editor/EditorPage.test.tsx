import { render, screen } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { EditorPage } from "./EditorPage";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === "list_local_models")
      return [
        {
          id: "s2-q6",
          quant: "Q6",
          filename: "test.gguf",
          displaySize: "4.5 GB",
          approxBytes: 4500000000,
          recommendation: "Recommended",
          tokenizerRequired: true,
          state: "installed",
        },
      ];
    if (cmd === "list_voice_presets") return [];
    if (cmd === "generate_sentences") return [];
    return null;
  }),
}));

describe("EditorPage", () => {
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
