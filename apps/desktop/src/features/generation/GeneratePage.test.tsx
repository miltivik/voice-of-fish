import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { GenerationPage } from "./GenerationPage";

describe("GenerationPage", () => {
  it("inserts style tag and completes mock generation", async () => {
    const user = userEvent.setup();
    render(<GenerationPage />, { wrapper: AppProviders });

    const textarea = screen.getByLabelText(/script text/i);
    await user.type(textarea, "Local voice");
    await user.click(screen.getByRole("button", { name: "[calm]" }));
    expect((textarea as HTMLTextAreaElement).value).toContain("[calm]");

    await user.click(screen.getByRole("button", { name: /^generate$/i }));

    const resultSection = screen.getByText("Result").closest("section")!;
    expect(await within(resultSection).findByText(/generation completed/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /export wav/i })).toBeEnabled();
  });
});
