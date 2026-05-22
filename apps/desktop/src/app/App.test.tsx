import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("shows product identity", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /voice of fish/i })).toBeVisible();
  });
});
