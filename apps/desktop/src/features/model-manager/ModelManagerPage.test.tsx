import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { ModelManagerPage } from "./ModelManagerPage";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";

import { setupTauriMocks } from "@/test-utils/tauri-mocks";

function getQ5Card() {
  const heading = screen.getByRole("heading", { name: "Q5" });
  return heading.closest("article")!;
}

describe("ModelManagerPage", () => {
  it("downloads an uninstalled quant", async () => {
    const user = userEvent.setup();
    // Dynamic mock: download_model updates the model list in-place
    let models = structuredClone(S2_MODEL_MANIFEST);
    const invokeMock = (globalThis as Record<string, unknown>)
      .__tauriInvoke as (cmd: string) => unknown;
    (
      invokeMock as {
        mockImplementation: (f: (cmd: string) => unknown) => void;
      }
    ).mockImplementation((cmd: string) => {
      if (cmd === "list_local_models") return structuredClone(models);
      if (cmd === "download_model") {
        // Mark Q5 as installed
        models = models.map((m: { id: string; state: string }) =>
          m.id === "s2-q5" ? { ...m, state: "installed" } : m,
        );
        return structuredClone(models);
      }
      return null;
    });

    render(<ModelManagerPage />, { wrapper: AppProviders });

    expect(await screen.findByText("Q5")).toBeVisible();

    await user.click(
      within(getQ5Card()).getByRole("button", { name: /download q5/i }),
    );

    expect(await within(getQ5Card()).findByText(/q5 installed/i)).toBeVisible();
  });

  it("shows installed badge for installed models", async () => {
    setupTauriMocks({
      list_local_models: S2_MODEL_MANIFEST,
    });
    render(<ModelManagerPage />, { wrapper: AppProviders });

    expect(await screen.findByText("Q6 installed")).toBeVisible();
  });

  it("shows download button for not-installed models", async () => {
    setupTauriMocks({
      list_local_models: S2_MODEL_MANIFEST,
    });
    render(<ModelManagerPage />, { wrapper: AppProviders });

    const q5Heading = await screen.findByRole("heading", { name: "Q5" });
    const q5Card = q5Heading.closest("article")!;
    expect(
      within(q5Card).getByRole("button", { name: /download q5/i }),
    ).toBeVisible();
  });
});
