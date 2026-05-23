import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App", () => {
  it("navigates from dashboard to models", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    await user.click(screen.getByRole("link", { name: /models/i }));

    expect(screen.getByRole("heading", { name: /models/i })).toBeVisible();
  });
});
