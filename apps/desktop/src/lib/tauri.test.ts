import { describe, expect, it, beforeEach, vi } from "vitest";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { pickBinaryPath, validateBinaryPath } from "./tauri";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(async () => "/opt/s2.cpp/build/s2"),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

let mockPlatform = "linux";
vi.mock("./platform", () => ({
  getRuntimePlatform: () => mockPlatform,
}));

describe("validateBinaryPath", () => {
  it("accepts Linux extensionless s2 binaries", () => {
    mockPlatform = "linux";
    expect(validateBinaryPath("/opt/s2.cpp/build/s2")).toBe(true);
    expect(validateBinaryPath("/opt/s2.cpp/build/s2.cpp")).toBe(true);
  });

  it("accepts Linux AppImage binaries case-insensitively", () => {
    mockPlatform = "linux";
    expect(validateBinaryPath("/opt/VoiceOfFish.AppImage")).toBe(true);
  });

  it("rejects obvious non-binaries on Linux", () => {
    mockPlatform = "linux";
    expect(validateBinaryPath("/tmp/readme.txt")).toBe(false);
  });

  it("keeps Windows executable validation strict", () => {
    mockPlatform = "windows";
    expect(validateBinaryPath("C:\\s2\\s2.exe")).toBe(true);
    expect(validateBinaryPath("C:\\s2\\s2")).toBe(false);
  });

  it("accepts extensionless on macOS", () => {
    mockPlatform = "macos";
    expect(validateBinaryPath("/usr/local/bin/s2")).toBe(true);
    expect(validateBinaryPath("/usr/local/bin/s2.cpp")).toBe(true);
  });
});

describe("pickBinaryPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not pass extension filters on Linux", async () => {
    mockPlatform = "linux";
    await pickBinaryPath();

    expect(openDialog).toHaveBeenCalledWith({
      title: "Select s2.cpp binary",
      multiple: false,
    });
  });

  it("keeps executable filters on Windows", async () => {
    mockPlatform = "windows";
    await pickBinaryPath();

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
