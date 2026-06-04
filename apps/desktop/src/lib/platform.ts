export type DesktopPlatform = "windows" | "linux" | "macos" | "unknown";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: { platform?: string };
};

const PLATFORM_LABELS: Record<DesktopPlatform, string> = {
  windows: "Windows",
  linux: "Linux",
  macos: "macOS",
  unknown: "Unknown OS",
};

export interface PlatformDefaultPaths {
  binaryPath: string;
  modelsPath: string;
  outputsPath: string;
}

export function getRuntimePlatform(): DesktopPlatform {
  const navigatorLike = globalThis.navigator as
    | NavigatorWithUserAgentData
    | undefined;

  const platformText = [
    navigatorLike?.userAgentData?.platform,
    navigatorLike?.platform,
    navigatorLike?.userAgent,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (platformText.includes("win")) return "windows";
  if (platformText.includes("mac")) return "macos";
  if (
    platformText.includes("linux") ||
    platformText.includes("x11") ||
    platformText.includes("wayland")
  ) {
    return "linux";
  }

  return "unknown";
}

export function getRuntimePlatformLabel(
  platform: DesktopPlatform = getRuntimePlatform(),
): string {
  return PLATFORM_LABELS[platform];
}

export function getPlatformDefaultPaths(
  platform: DesktopPlatform = getRuntimePlatform(),
): PlatformDefaultPaths {
  if (platform === "windows") {
    return {
      binaryPath: "C:\\s2\\s2.exe",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
    };
  }

  return {
    binaryPath: "~/voice-of-fish/s2.cpp/s2",
    modelsPath: "~/voice-of-fish/models",
    outputsPath: "~/voice-of-fish/outputs",
  };
}
