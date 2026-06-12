import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AppProviders } from "@/app/providers";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";
import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  beforeEach(() => {
    setupTauriMocks({
      list_local_models: [
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
      ],
      list_voice_presets: [],
      generate_sentences: [],
    });
  });

  it("renders editor heading and script textarea", () => {
    render(<EditorPage />, { wrapper: AppProviders });

    expect(screen.getByRole("heading", { name: "Editor" })).toBeVisible();
    expect(screen.getByPlaceholderText(/Welcome to the show/i)).toBeVisible();
  });

  it("shows sentence count based on input", () => {
    render(<EditorPage />, { wrapper: AppProviders });

    // With empty script, button says "0 sentence(s)"
    expect(screen.getByText(/Generate 0 sentence\(s\)/)).toBeVisible();
  });

  it("displays sentence count for non-empty script", async () => {
    const user = userEvent.setup();
    render(<EditorPage />, { wrapper: AppProviders });

    const textarea = screen.getByPlaceholderText(/Welcome to the show/i);
    await user.type(textarea, "Hello. World. How are you?");

    expect(screen.getByText(/Generate 3 sentence\(s\)/)).toBeVisible();
  });

  it("shows error toast when no models installed and generate clicked", async () => {
    const user = userEvent.setup();
    setupTauriMocks({
      list_local_models: [],
      list_voice_presets: [],
      generate_sentences: () => Promise.reject(new Error("No model installed")),
    });
    render(<EditorPage />, { wrapper: AppProviders });

    const textarea = screen.getByPlaceholderText(/Welcome to the show/i);
    await user.type(textarea, "Hello world.");

    const generateBtn = screen.getByRole("button", {
      name: /generate 1 sentence/i,
    });
    await user.click(generateBtn);

    expect(await screen.findByText(/No model installed/i)).toBeVisible();
  });

  it("exports SRT when Copy SRT button clicked", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeTextSpy);

    setupTauriMocks({
      list_local_models: [
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
      ],
      list_voice_presets: [],
      generate_sentences: [
        {
          text: "Hello.",
          startMs: 0,
          endMs: 1000,
          wavPath: "/tmp/test.wav",
        },
      ],
    });
    render(<EditorPage />, { wrapper: AppProviders });

    const textarea = screen.getByPlaceholderText(/Welcome to the show/i);
    await user.type(textarea, "Hello.");

    const generateBtn = screen.getByRole("button", {
      name: /generate 1 sentence/i,
    });
    await user.click(generateBtn);

    const copySrtBtn = await screen.findByRole("button", {
      name: /copy srt/i,
    });
    await user.click(copySrtBtn);

    expect(writeTextSpy).toHaveBeenCalled();
  });
});
