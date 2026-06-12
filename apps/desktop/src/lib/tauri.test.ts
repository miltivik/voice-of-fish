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

describe("studioClient.readAudioBytes", () => {
  it("returns a blob: URL after invoking read_audio_bytes", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { studioClient } = await import("./tauri");
    const fakeBytes = [82, 73, 70, 70]; // "RIFF"
    vi.mocked(invoke).mockResolvedValueOnce(fakeBytes);

    const url = await studioClient.readAudioBytes("/safe/clip.wav");
    expect(invoke).toHaveBeenCalledWith("read_audio_bytes", {
      path: "/safe/clip.wav",
    });
    expect(url).toMatch(/^blob:/);
  });

  it("studioClient.importModelFile calls import_model_file with source + filename", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    const { studioClient } = await import("./tauri");
    vi.mocked(invoke).mockResolvedValueOnce("/models/foo.gguf");

    const result = await studioClient.importModelFile(
      "/drop/foo.gguf",
      "foo.gguf",
    );
    expect(invoke).toHaveBeenCalledWith("import_model_file", {
      sourcePath: "/drop/foo.gguf",
      fileName: "foo.gguf",
    });
    expect(result).toBe("/models/foo.gguf");
  });
});
