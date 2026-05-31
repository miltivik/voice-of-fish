import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { setupTauriMocks } from "@/test-utils/tauri-mocks";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    setupTauriMocks({
      get_system_info: { os: "Test OS", cpu: "Test CPU", ramLabel: "16 GB", appVersion: "0.1.0" },
      list_local_models: [],
      list_generation_history: [],
      list_voice_presets: [],
      get_app_config: null,
    });
    window.history.replaceState(null, "", "/");
    useAppStore.setState({ setupComplete: true });
  });

  it("does not render Windows target in the OS badge", async () => {
    render(<App />);

    await screen.findByRole("heading", { name: /dashboard/i });
  });

  it("navigates from dashboard to models", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();

    const sidebar = screen.getByRole("navigation", { name: /primary/i });
    await user.click(within(sidebar).getByRole("link", { name: /models/i }));

    expect(
      await screen.findByRole("heading", { name: /models/i }),
    ).toBeVisible();
  });
});