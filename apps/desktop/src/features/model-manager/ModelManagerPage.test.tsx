import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { ModelManagerPage } from "./ModelManagerPage";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";

// Mock Tauri IPC so tests run without a real Tauri backend.
// Mock Tauri event system.
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string, args?: Record<string, unknown>) => {
    if (cmd === "list_local_models") {
      return structuredClone(S2_MODEL_MANIFEST);
    }
    if (cmd === "download_model") {
      const { modelId } = args ?? {};
      return structuredClone(S2_MODEL_MANIFEST).map((m) =>
        m.id === modelId ? { ...m, state: "installed" as const } : m,
      );
    }
    if (cmd === "delete_model") {
      const { modelId } = args ?? {};
      return structuredClone(S2_MODEL_MANIFEST).map((m) =>
        m.id === modelId ? { ...m, state: "not-installed" as const } : m,
      );
    }
    return null;
  }),
}));

function getQ5Card() {
  const heading = screen.getByRole("heading", { name: "Q5" });
  return heading.closest("article")!;
}

describe("ModelManagerPage", () => {
  it("downloads an uninstalled quant through mock state", async () => {
    const user = userEvent.setup();
    render(<ModelManagerPage />, { wrapper: AppProviders });

    expect(await screen.findByText("Q5")).toBeVisible();

    await user.click(
      within(getQ5Card()).getByRole("button", { name: /download q5/i }),
    );

    expect(await within(getQ5Card()).findByText(/q5 installed/i)).toBeVisible();
  });
});