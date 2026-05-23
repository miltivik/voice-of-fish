import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    useAppStore.setState({ setupComplete: true });
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
