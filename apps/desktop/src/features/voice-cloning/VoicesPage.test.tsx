import { fireEvent, render, screen } from "@testing-library/react";
import { VoiceCloningPage } from "./VoiceCloningPage";

describe("VoiceCloningPage", () => {
  it("rejects unsupported reference audio", async () => {
    render(<VoiceCloningPage />);

    const file = new File(["audio"], "sample.ogg", { type: "audio/ogg" });
    const input = screen.getByLabelText(/reference audio/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText(/wav, mp3, or flac/i)).toBeVisible();
  });
});
