import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("navigates from dashboard to models", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    await user.click(screen.getByRole("link", { name: /models/i }));

    expect(screen.getByRole("heading", { name: /models/i })).toBeVisible();
  });
});
