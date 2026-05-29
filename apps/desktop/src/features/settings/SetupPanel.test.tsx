import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupPanel } from "@/components/settings/SetupPanel";

// Mock the Tauri invoke for checkBinaryExists
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === "check_binary_exists") return true;
    if (cmd === "check_file_exists") return true;
    if (cmd === "check_directory_exists") return true;
    return null;
  }),
}));

describe("SetupPanel", () => {
  it("completes wizard and saves config", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SetupPanel onSave={onSave} />);

    // Step 1: Engine
    expect(
      screen.getByRole("heading", { name: /connect s2\.cpp/i }),
    ).toBeVisible();

    await user.type(
      screen.getByLabelText("Connect s2.cpp"),
      "/home/test/voice-of-fish/s2.cpp/s2",
    );
    // Blur to trigger binary check
    await user.tab();

    // Wait for Continue to enable
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /continue/i }),
      ).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 2: Model
    expect(
      screen.getByRole("heading", { name: /add an s2 pro gguf model/i }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^Q6/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Step 3: Output
    expect(
      screen.getByRole("heading", { name: /choose your output folder/i }),
    ).toBeVisible();
    const outputInput = screen.getByLabelText("Output folder path");
    await user.clear(outputInput);
    await user.type(outputInput, "/home/test/voice-of-fish/outputs");
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /finish setup/i }),
      ).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /finish setup/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        binaryPath: "/home/test/voice-of-fish/s2.cpp/s2",
        outputsPath: "/home/test/voice-of-fish/outputs",
        defaultModelId: "s2-q6",
        cpuThreads: 8,
        gpuEnabled: true,
        modelsPath: "~/voice-of-fish/models",
      }),
    );
  });

  it("shows progress rail with three steps", () => {
    render(<SetupPanel onSave={vi.fn()} />);

    expect(screen.getByText("Engine")).toBeVisible();
    expect(screen.getByText("Model file")).toBeVisible();
    expect(screen.getByText("Output")).toBeVisible();
  });

  it("Back button is disabled on first step", () => {
    render(<SetupPanel onSave={vi.fn()} />);

    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
  });
});