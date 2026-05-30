import { render, screen, within } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { DashboardPage } from "./DashboardPage";

// Mutable state — vi.hoisted ensures initialization before vi.mock runs.
const { modelState } = vi.hoisted(() => ({
  modelState: {
    models: [
      { id: "s2-q6", state: "installed" as const, quant: "Q6", filename: "test.gguf" },
    ],
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === "get_system_info") {
      return { os: "Linux", cpu: "AMD Ryzen 7", ramLabel: "16 GB", appVersion: "0.1.0" };
    }
    if (cmd === "list_local_models") {
      return [...modelState.models];
    }
    if (cmd === "list_generation_history") {
      return [];
    }
    if (cmd === "get_app_config") {
      return null;
    }
    return null;
  }),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    // Reset to default: 1 installed model.
    modelState.models.length = 0;
    modelState.models.push({ id: "s2-q6", state: "installed", quant: "Q6", filename: "test.gguf" });
  });

  it("renders dashboard heading and system info", async () => {
    render(<DashboardPage />, { wrapper: AppProviders });

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeVisible();

    const card = screen.getByText("Engine readiness").closest(".rounded-md") as HTMLElement;
    expect(
      await within(card).findByText(/linux/i),
    ).toBeVisible();
  });

  it("shows model count when models are installed", async () => {
    render(<DashboardPage />, { wrapper: AppProviders });

    expect(await screen.findByText("Ready")).toBeVisible();

    const card = screen.getByText("Engine readiness").closest(".rounded-md") as HTMLElement;
    expect(
      await within(card).findByText(/1 model quant.*installed/s),
    ).toBeVisible();
  });

  it("shows empty state when no models installed", async () => {
    modelState.models.length = 0;

    render(<DashboardPage />, { wrapper: AppProviders });

    expect(await screen.findByText("No models installed")).toBeVisible();

    const modelsLink = screen.getByRole("link", { name: /models/i });
    expect(modelsLink).toBeVisible();
    expect(modelsLink).toHaveAttribute("href", "#/models");
  });
});