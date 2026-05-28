import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { GenerationPage } from "./GenerationPage";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";

// Mock Tauri IPC so tests run without a real Tauri backend.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string, args?: Record<string, unknown>) => {
    if (cmd === "list_local_models") {
      return structuredClone(S2_MODEL_MANIFEST);
    }
    if (cmd === "run_generation") {
      const request = args?.request as Record<string, unknown> | undefined;
      return {
        ...request,
        id: "mock-job-1",
        status: "completed",
        createdAt: "2026-05-26T12:00:00.000Z",
        completedAt: "2026-05-26T12:00:01.000Z",
        outputPath: "/outputs/mock.wav",
        durationSeconds: 6.4,
      };
    }
    if (cmd === "list_generation_history") {
      return [];
    }
    if (cmd === "get_system_info") {
      return {
        os: "Test OS",
        cpu: "Test CPU",
        ramLabel: "16 GB",
        appVersion: "0.1.0",
      };
    }
    if (cmd === "get_app_config") {
      return null;
    }
    return null;
  }),
}));

describe("GenerationPage", () => {
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