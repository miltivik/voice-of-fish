import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupPanel } from "@/components/settings/SetupPanel";

describe("SetupPanel", () => {
  it("saves initial local paths", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SetupPanel onSave={onSave} />);

    await user.type(screen.getByLabelText(/s2\.cpp binary/i), "C:\\s2\\s2.exe");
    await user.type(screen.getByLabelText(/models folder/i), "C:\\voice-of-fish\\models");
    await user.type(screen.getByLabelText(/outputs folder/i), "C:\\voice-of-fish\\outputs");
    await user.click(screen.getByRole("button", { name: /save setup/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "simple" }),
    );
  });
});
