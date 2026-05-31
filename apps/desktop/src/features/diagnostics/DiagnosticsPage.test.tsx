import { render, screen } from "@testing-library/react";
import { AppProviders } from "@/app/providers";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";
import { DiagnosticsPage } from "./DiagnosticsPage";

describe("DiagnosticsPage", () => {
  beforeEach(() => {
    setupTauriMocks({
      get_system_info: { os: "Linux", cpu: "AMD Ryzen 7", ramLabel: "16 GB", gpu: "AMD Radeon 780M", appVersion: "0.1.0", engineVersion: "1.0" },
      get_app_config: { binaryPath: "/tmp/s2", modelsPath: "/tmp", outputsPath: "/tmp" },
      check_binary_exists: true,
      read_generation_logs: [],
    });
  });

  it("renders diagnostics heading and system info", async () => {
    render(<DiagnosticsPage />, { wrapper: AppProviders });

    expect(screen.getByRole("heading", { name: "Diagnostics" })).toBeVisible();

    const osCpuRam = await screen.findByText(/Linux.*AMD Ryzen 7.*16 GB/i);
    expect(osCpuRam).toBeVisible();

    expect(screen.getByText(/GPU: AMD Radeon 780M/i)).toBeVisible();
    expect(screen.getByText(/App: 0\.1\.0/i)).toBeVisible();
    expect(screen.getByText(/Engine: 1\.0/i)).toBeVisible();
  });

  it("shows binary status", async () => {
    render(<DiagnosticsPage />, { wrapper: AppProviders });

    expect(await screen.findByText("Found")).toBeVisible();
  });
});