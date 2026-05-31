import { describe, expect, it, beforeEach, vi } from "vitest";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { pickBinaryPath, validateBinaryPath } from "./tauri";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "/opt/s2.cpp/build/s2"),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));
describe("validateBinaryPath", () => {
  it("accepts Linux extensionless s2 binaries", () => {
    expect(validateBinaryPath("/opt/s2.cpp/build/s2", "linux")).toBe(true);
    expect(validateBinaryPath("/opt/s2.cpp/build/s2.cpp", "linux")).toBe(true);
  });

  it("accepts Linux AppImage binaries case-insensitively", () => {
    expect(validateBinaryPath("/opt/VoiceOfFish.AppImage", "linux")).toBe(true);
  });

  it("rejects obvious non-binaries on Linux", () => {
    expect(validateBinaryPath("/tmp/readme.txt", "linux")).toBe(false);
  });

  it("keeps Windows executable validation strict", () => {
    expect(validateBinaryPath("C:\\s2\\s2.exe", "windows")).toBe(true);
    expect(validateBinaryPath("C:\\s2\\s2", "windows")).toBe(false);
  });
});

describe("pickBinaryPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not pass extension filters on Linux", async () => {
    await pickBinaryPath("linux");

    expect(openDialog).toHaveBeenCalledWith({
      title: "Select s2.cpp binary",
      multiple: false,
    });
  });

  it("keeps executable filters on Windows", async () => {
    await pickBinaryPath("windows");

    expect(openDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({ name: "Executable" }),
          expect.objectContaining({ name: "All files" }),
        ]),
      }),
    );
  });
});