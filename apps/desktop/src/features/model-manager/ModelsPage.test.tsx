import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { ModelManagerPage } from "./ModelManagerPage";

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
