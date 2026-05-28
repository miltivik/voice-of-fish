import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { App } from "./App";

// Mock Tauri IPC for all components that use studioClient.
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === "get_system_info") {
      return {
        os: "Test OS",
        cpu: "Test CPU",
        ramLabel: "16 GB",
        appVersion: "0.1.0",
      };
    }
    if (cmd === "list_local_models") {
      return [];
    }
    if (cmd === "list_generation_history") {
      return [];
    }
    if (cmd === "list_voice_presets") {
      return [];
    }
    if (cmd === "get_app_config") {
      return null;
    }
    return null;
  }),
}));

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    useAppStore.setState({ setupComplete: true });
  });

  it("does not render Windows target in the OS badge", async () => {
    render(<App />);

    expect(screen.queryByText("Windows target")).not.toBeInTheDocument();
  });

  it("navigates from dashboard to models", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    const sidebar = screen.getByRole("navigation", { name: /primary/i });
    await user.click(within(sidebar).getByRole("link", { name: /models/i }));

    expect(screen.getByRole("heading", { name: /models/i })).toBeVisible();
  });
});
