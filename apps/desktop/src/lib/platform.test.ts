import { describe, expect, it } from "vitest";
import {
  getPlatformDefaultPaths,
  getRuntimePlatformLabel,
  joinDisplayPath,
  type DesktopPlatform,
} from "./platform";

describe("platform helpers", () => {
  it.each([
    ["windows", "Windows"],
    ["linux", "Linux"],
    ["macos", "macOS"],
    ["unknown", "Unknown OS"],
  ] satisfies [DesktopPlatform, string][]) (
    "labels %s",
    (platform, expected) => {
      expect(getRuntimePlatformLabel(platform)).toBe(expected);
    },
  );

  it("returns Windows default paths", () => {
    expect(getPlatformDefaultPaths("windows")).toEqual({
      binaryPath: "C:\\s2\\s2.exe",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
    });
  });

  it("returns POSIX-style defaults for Linux", () => {
    expect(getPlatformDefaultPaths("linux")).toEqual({
      binaryPath: "~/voice-of-fish/s2.cpp/s2",
      modelsPath: "~/voice-of-fish/models",
      outputsPath: "~/voice-of-fish/outputs",
    });
  });

  it("joins display paths using the selected platform separator", () => {
    expect(joinDisplayPath("C:\\voice-of-fish\\outputs", "mock.wav", "windows")).toBe(
      "C:\\voice-of-fish\\outputs\\mock.wav",
    );
    expect(joinDisplayPath("~/voice-of-fish/outputs", "mock.wav", "linux")).toBe(
      "~/voice-of-fish/outputs/mock.wav",
    );
  });
});
