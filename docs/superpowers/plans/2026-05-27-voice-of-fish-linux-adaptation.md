# Voice of Fish Linux / Hyprland Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not re-explore unless a referenced file changed after this plan was written.

## Summary

Adapt the existing Voice of Fish Tauri v2 desktop app from Windows-biased UX to a cross-platform desktop app that works cleanly on Linux, especially Hyprland/Wayland. The core behavior is already mostly cross-platform: Rust diagnostics use `sysinfo`, config defaults already use the user's home directory, and backend binary existence checks canonicalize normal filesystem paths. The remaining work is primarily frontend platform awareness, Linux executable selection/validation, Tauri window/icon packaging configuration, and Linux user-facing documentation/launcher assets.

---

## 1. Goal

Make the desktop app usable on Linux without Windows-only path examples or binary filters, while preserving Windows behavior and documenting Hyprland/Wayland launch/window-rule guidance.

Success criteria:

- Linux users can enter/select an extensionless `s2` binary or an upstream-named `s2.cpp` binary.
- Linux users are not blocked by the file picker hiding extensionless executables.
- Onboarding placeholders show Linux-style paths on Linux and Windows-style paths on Windows.
- Header/system mocks no longer claim Windows on non-Windows hosts.
- Tauri window configuration has explicit minimum size, centering, decorations, and resizability.
- Tauri bundle icon list includes PNG and ICNS alongside ICO.
- Linux docs include Hyprland/Wayland guidance and a `.desktop` launcher template.

---

## 2. Scope

### In scope

- Frontend runtime platform helper for synchronous UI decisions.
- Linux-aware binary path validation in `apps/desktop/src/lib/tauri.ts`.
- Linux/macOS-friendly binary file picker behavior.
- Platform-aware onboarding placeholders in:
  - `apps/desktop/src/components/settings/OnboardingEngineStep.tsx`
  - `apps/desktop/src/components/settings/OnboardingModelStep.tsx`
  - `apps/desktop/src/components/settings/OnboardingOutputStep.tsx`
  - `apps/desktop/src/lib/i18n.ts`
- Mock/system-info OS strings in TypeScript and Rust mocks.
- Header OS badge in `apps/desktop/src/components/layout/EngineHeader.tsx`.
- Window and icon settings in `apps/desktop/src-tauri/tauri.conf.json`.
- Linux docs in `docs/hyprland-setup.md` and launcher template in `assets/voice-of-fish.desktop`.
- Focused tests covering platform helper, binary validation/dialog options, setup wizard Linux paths, and header OS badge.

### Out of scope

- Real `s2.cpp` execution/flag mapping.
- Downloading/building `s2.cpp` binaries.
- GPU detection. `apps/desktop/src-tauri/src/diagnostics.rs:24-25` intentionally leaves `gpu` as `None` because `sysinfo` does not reliably enumerate GPUs.
- Editing user Hyprland config under `~/.config/hypr/`; only documentation is added.
- Reworking persistence or app startup config hydration. `apps/desktop/src-tauri/src/config.rs:55-75` already uses `dirs::home_dir()` and platform separators for persisted defaults.

### Assumptions

- The synchronous frontend platform helper may use `navigator.userAgentData.platform`, `navigator.platform`, and `navigator.userAgent`; the authoritative displayed OS should still prefer Tauri `get_system_info` where available.
- Linux `s2.cpp` binaries to accept are: extensionless names such as `s2`, the upstream executable name `s2.cpp`, existing Unix-like suffixes `.sh`, `.bin`, `.elf`, and `.AppImage`.
- Windows should continue accepting `.exe`, `.cmd`, and `.bat`. Keep the existing `All files` fallback in the Windows picker so advanced users are not blocked by native picker quirks.
- Tauri v2 supports `center`, `minWidth`, `minHeight`, `decorations`, and `resizable` on `app.windows[]`; Tauri docs list these window config fields and bundle icon arrays with PNG/ICNS/ICO.
- Hyprland docs are volatile. The current wiki (fetched 2026-05-27) documents Lua `hl.window_rule({ match = { ... }, ... })` for Hyprland 0.55+ and notes old hyprlang/windowrulev2 syntax is deprecated. The new repo docs should warn users to verify syntax for their Hyprland version before copying rules.

---

## 3. Platform detection strategy

### Build time

Use build-time/platform constants only where code is compiled per target:

- Rust mock/system fallback: use `std::env::consts::OS` behind a small formatter function in `apps/desktop/src-tauri/src/models.rs`.
- Tauri config remains static JSON and cross-platform. Do not create per-platform configs unless a platform-specific setting becomes necessary later.
- Icon generation is build-asset work: include all valid icon formats in `tauri.conf.json` so Linux/macOS/Windows bundles can pick the right file.

### Runtime

Use runtime detection where the same frontend bundle runs on multiple desktop OSes:

- Create `apps/desktop/src/lib/platform.ts` with:
  - `DesktopPlatform = "windows" | "linux" | "macos" | "unknown"`
  - `getRuntimePlatform()` for synchronous browser/Tauri WebView detection.
  - `getRuntimePlatformLabel()` for fallback display strings.
  - `getPlatformDefaultPaths()` for placeholder paths.
  - `joinDisplayPath()` for mock output paths.
- Use `getRuntimePlatform()` in `validateBinaryPath()` and `pickBinaryPath()` because those functions must make synchronous validation/dialog decisions before IPC.
- Use Tauri `studioClient.getSystemInfo()` in `EngineHeader` for authoritative OS display; fallback to `getRuntimePlatformLabel()` when IPC is loading or unavailable.
- Preserve backend `diagnostics::get_real_system_info()` as-is. It already returns real OS via `sysinfo::System::name()` in `apps/desktop/src-tauri/src/diagnostics.rs:4-17`.

---

## 4. File-by-file change list with exact before/after

### 4.1 `apps/desktop/src/lib/platform.ts` — create

Create this new frontend helper. Keep it dependency-free.

```ts
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

export function joinDisplayPath(
  directory: string,
  fileName: string,
  platform: DesktopPlatform = getRuntimePlatform(),
): string {
  const separator = platform === "windows" ? "\\" : "/";
  return `${directory.replace(/[\\/]+$/, "")}${separator}${fileName}`;
}
```

Rationale:

- Keeps platform logic in one place instead of scattering `navigator.platform` checks.
- Does not use Node `process.platform`, which is not reliable in a browser/WebView bundle.
- Uses Tauri/sysinfo for authoritative OS display where async IPC is already available.

---

### 4.2 `apps/desktop/src/lib/platform.test.ts` — create

Add focused unit tests for deterministic platform behavior.

```ts
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
```

Completion gate: this file passes under Vitest.

---

### 4.3 `apps/desktop/src/lib/tauri.ts` — binary validation, picker, mock OS/path

Current relevant lines:

- `validateBinaryPath()` at `apps/desktop/src/lib/tauri.ts:29-34` only checks suffixes.
- `pickBinaryPath()` at `apps/desktop/src/lib/tauri.ts:58-71` always uses executable extension filters.
- Mock system info at `apps/desktop/src/lib/tauri.ts:159-165` hardcodes `os: "Windows"`.
- Mock completed output path at `apps/desktop/src/lib/tauri.ts:179-187` hardcodes `C:\\voice-of-fish\\outputs`.

#### Imports — before

```ts
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as openShell } from "@tauri-apps/plugin-shell";
```

#### Imports — after

```ts
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as openShell } from "@tauri-apps/plugin-shell";
import {
  getPlatformDefaultPaths,
  getRuntimePlatform,
  getRuntimePlatformLabel,
  joinDisplayPath,
  type DesktopPlatform,
} from "./platform";
```

#### Binary validation — before (`lines 29-34`)

```ts
export function validateBinaryPath(path: string): boolean {
  if (!validatePath(path)) return false;
  const binaryNames = [".exe", ".cmd", ".bat", ".sh", ".bin", ".elf"];
  const lowerPath = path.toLowerCase();
  return binaryNames.some((name) => lowerPath.endsWith(name));
}
```

#### Binary validation — after

```ts
const WINDOWS_BINARY_EXTENSIONS = [".exe", ".cmd", ".bat"] as const;
const UNIX_BINARY_EXTENSIONS = [".sh", ".bin", ".elf"] as const;
const LINUX_BINARY_EXTENSIONS = [
  ...UNIX_BINARY_EXTENSIONS,
  ".appimage",
] as const;
const UNKNOWN_BINARY_EXTENSIONS = [
  ...WINDOWS_BINARY_EXTENSIONS,
  ...LINUX_BINARY_EXTENSIONS,
] as const;

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? "";
}

function hasAnyExtension(path: string, extensions: readonly string[]): boolean {
  const lowerPath = path.toLowerCase();
  return extensions.some((extension) => lowerPath.endsWith(extension));
}

function isLinuxExtensionlessBinaryName(path: string): boolean {
  const lowerName = basename(path).toLowerCase();
  if (!lowerName) return false;
  return lowerName === "s2.cpp" || !lowerName.includes(".");
}

export function validateBinaryPath(
  path: string,
  platform: DesktopPlatform = getRuntimePlatform(),
): boolean {
  if (!validatePath(path)) return false;

  if (platform === "windows") {
    return hasAnyExtension(path, WINDOWS_BINARY_EXTENSIONS);
  }

  if (platform === "linux") {
    return (
      hasAnyExtension(path, LINUX_BINARY_EXTENSIONS) ||
      isLinuxExtensionlessBinaryName(path)
    );
  }

  if (platform === "macos") {
    return hasAnyExtension(path, UNIX_BINARY_EXTENSIONS) || !basename(path).includes(".");
  }

  return hasAnyExtension(path, UNKNOWN_BINARY_EXTENSIONS);
}
```

Notes:

- `s2.cpp` is explicitly accepted on Linux because the upstream project name contains a dot even though the executable is not a Windows-style extensioned binary.
- Do not add executable-bit checks in the frontend. The frontend can only validate shape; the Rust command `check_binary_exists()` at `apps/desktop/src-tauri/src/commands.rs:151-159` remains the filesystem existence boundary.

#### Picker — before (`lines 58-71`)

```ts
export async function pickBinaryPath(): Promise<string | null> {
  const selected = await openDialog({
    title: "Select s2.cpp binary",
    filters: [
      {
        name: "Executable",
        extensions: ["exe", "cmd", "bat", "sh", "bin", "elf"],
      },
      { name: "All files", extensions: ["*"] },
    ],
    multiple: false,
  });
  return selected ?? null;
}
```

#### Picker — after

```ts
export async function pickBinaryPath(
  platform: DesktopPlatform = getRuntimePlatform(),
): Promise<string | null> {
  const baseOptions = {
    title: "Select s2.cpp binary",
    multiple: false,
  } as const;

  const selected = await openDialog(
    platform === "linux" || platform === "macos"
      ? baseOptions
      : {
          ...baseOptions,
          filters: [
            {
              name: "Executable",
              extensions: ["exe", "cmd", "bat", "sh", "bin", "elf", "AppImage"],
            },
            { name: "All files", extensions: ["*"] },
          ],
        },
  );
  return selected ?? null;
}
```

Rationale: Linux native dialogs commonly hide extensionless files when an extension filter is active. Filter-free Linux/macOS behavior satisfies the requirement and still keeps validation after selection.

#### Mock system info/output — before (`lines 159-187`)

```ts
const systemInfo: SystemInfo = {
  os: "Windows",
  cpu: "Mock local CPU",
  ramLabel: "16 GB",
  gpu: "Detect through Tauri later",
  appVersion: "0.1.0",
  binaryFound: false,
};

// ...

outputPath: "C:\\voice-of-fish\\outputs\\mock-generation.wav",
```

#### Mock system info/output — after

```ts
const defaultPaths = getPlatformDefaultPaths();

const systemInfo: SystemInfo = {
  os: getRuntimePlatformLabel(),
  cpu: "Mock local CPU",
  ramLabel: "16 GB",
  gpu: "Detect through Tauri later",
  appVersion: "0.1.0",
  binaryFound: false,
};

// ...

outputPath: joinDisplayPath(defaultPaths.outputsPath, "mock-generation.wav"),
```

Completion gate:

- Linux extensionless `/opt/s2.cpp/build/s2` validates.
- Linux `/opt/s2.cpp/build/s2.cpp` validates.
- Linux `/opt/VoiceOfFish.AppImage` validates.
- Linux `/tmp/readme.txt` does not validate.
- Windows `C:\\s2\\s2.exe` validates.
- Windows `C:\\s2\\s2` does not validate.
- Linux picker calls `openDialog` without `filters`.

---

### 4.4 `apps/desktop/src/lib/tauri.test.ts` — create

Mock Tauri plugins and test the behavior above.

```ts
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { pickBinaryPath, validateBinaryPath } from "./tauri";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

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
```

---

### 4.5 `apps/desktop/src/lib/i18n.ts` — parameterize placeholders

Current placeholder strings:

- `apps/desktop/src/lib/i18n.ts:30` — `engineBinaryPlaceholder: "e.g. C:\\s2\\s2.exe"`
- `apps/desktop/src/lib/i18n.ts:41` — `modelFolderPlaceholder: "e.g. C:\\voice-of-fish\\models"`
- `apps/desktop/src/lib/i18n.ts:68` — `outputFolderPlaceholder: "e.g. C:\\voice-of-fish\\outputs"`

Before:

```ts
engineBinaryPlaceholder: "e.g. C:\\s2\\s2.exe",
modelFolderPlaceholder: "e.g. C:\\voice-of-fish\\models",
outputFolderPlaceholder: "e.g. C:\\voice-of-fish\\outputs",
```

After:

```ts
engineBinaryPlaceholder: "e.g. {path}",
modelFolderPlaceholder: "e.g. {path}",
outputFolderPlaceholder: "e.g. {path}",
```

No change needed to `t()` because `apps/desktop/src/lib/i18n.ts:90-104` already replaces `{param}` tokens.

Completion gate: no visible raw `{path}` remains in onboarding placeholders.

---

### 4.6 `apps/desktop/src/components/settings/OnboardingEngineStep.tsx` — platform placeholder

Current relevant lines:

- Imports at `apps/desktop/src/components/settings/OnboardingEngineStep.tsx:1-4`.
- Placeholder usage at `apps/desktop/src/components/settings/OnboardingEngineStep.tsx:106`.

Before:

```tsx
import { t } from "@/lib/i18n";
import { pickBinaryPath, checkBinaryExists, openExternalLink } from "@/lib/tauri";
```

```tsx
placeholder={t("engineBinaryPlaceholder")}
```

After:

```tsx
import { t } from "@/lib/i18n";
import { getPlatformDefaultPaths } from "@/lib/platform";
import { pickBinaryPath, checkBinaryExists, openExternalLink } from "@/lib/tauri";
```

Inside `OnboardingEngineStep`, after `checkRequestRef` at current line 21:

```tsx
const defaultPaths = getPlatformDefaultPaths();
```

Replace placeholder:

```tsx
placeholder={t("engineBinaryPlaceholder", { path: defaultPaths.binaryPath })}
```

Completion gate: on Linux the engine placeholder is `e.g. ~/voice-of-fish/s2.cpp/s2`; on Windows it remains `e.g. C:\s2\s2.exe`.

---

### 4.7 `apps/desktop/src/components/settings/OnboardingModelStep.tsx` — platform placeholder

Current relevant lines:

- Imports at `apps/desktop/src/components/settings/OnboardingModelStep.tsx:1-12`.
- Folder placeholder at `apps/desktop/src/components/settings/OnboardingModelStep.tsx:166`.

Before:

```tsx
import { t } from "@/lib/i18n";
```

```tsx
placeholder={t("modelFolderPlaceholder")}
```

After:

```tsx
import { t } from "@/lib/i18n";
import { getPlatformDefaultPaths } from "@/lib/platform";
```

Inside `OnboardingModelStep`, after validation state initialization at current lines 60-64:

```tsx
const defaultPaths = getPlatformDefaultPaths();
```

Replace placeholder:

```tsx
placeholder={t("modelFolderPlaceholder", { path: defaultPaths.modelsPath })}
```

Do not change `getParentDirectory()` in this task; it already handles `/` and `\\` separators at `apps/desktop/src/components/settings/OnboardingModelStep.tsx:35-50`.

Completion gate: on Linux the model folder placeholder is `e.g. ~/voice-of-fish/models`; on Windows it remains `e.g. C:\voice-of-fish\models`.

---

### 4.8 `apps/desktop/src/components/settings/OnboardingOutputStep.tsx` — platform placeholder

Current relevant lines:

- Imports at `apps/desktop/src/components/settings/OnboardingOutputStep.tsx:1-6`.
- Placeholder at `apps/desktop/src/components/settings/OnboardingOutputStep.tsx:107`.

Before:

```tsx
import { t } from "@/lib/i18n";
```

```tsx
placeholder={t("outputFolderPlaceholder")}
```

After:

```tsx
import { t } from "@/lib/i18n";
import { getPlatformDefaultPaths } from "@/lib/platform";
```

Inside `OnboardingOutputStep`, after `const [error, setError]...` at current line 29:

```tsx
const defaultPaths = getPlatformDefaultPaths();
```

Replace placeholder:

```tsx
placeholder={t("outputFolderPlaceholder", { path: defaultPaths.outputsPath })}
```

Completion gate: on Linux the output placeholder is `e.g. ~/voice-of-fish/outputs`; on Windows it remains `e.g. C:\voice-of-fish\outputs`.

---

### 4.9 `apps/desktop/src/lib/mock-data.ts` — platform-aware TS mock data

Current relevant lines:

- Default config Windows paths at `apps/desktop/src/lib/mock-data.ts:19-21`.
- Mock OS at `apps/desktop/src/lib/mock-data.ts:29-35`.
- Mock output path at `apps/desktop/src/lib/mock-data.ts:50-57`.

Before:

```ts
import type { StudioClient } from "./tauri";

let models = structuredClone(S2_MODEL_MANIFEST);

export const defaultConfig: AppConfig = {
  mode: "simple",
  binaryPath: "",
  modelsPath: "C:\\voice-of-fish\\models",
  outputsPath: "C:\\voice-of-fish\\outputs",
```

After:

```ts
import {
  getPlatformDefaultPaths,
  getRuntimePlatformLabel,
  joinDisplayPath,
} from "./platform";
import type { StudioClient } from "./tauri";

let models = structuredClone(S2_MODEL_MANIFEST);
const defaultPaths = getPlatformDefaultPaths();

export const defaultConfig: AppConfig = {
  mode: "simple",
  binaryPath: "",
  modelsPath: defaultPaths.modelsPath,
  outputsPath: defaultPaths.outputsPath,
```

Before:

```ts
const systemInfo: SystemInfo = {
  os: "Windows",
```

After:

```ts
const systemInfo: SystemInfo = {
  os: getRuntimePlatformLabel(),
```

Before:

```ts
outputPath: "C:\\voice-of-fish\\outputs\\mock-generation.wav",
```

After:

```ts
outputPath: joinDisplayPath(defaultPaths.outputsPath, "mock-generation.wav"),
```

Completion gate: importing `mockClient` on Linux does not produce Windows paths or `os: "Windows"`.

---

### 4.10 `apps/desktop/src-tauri/src/models.rs` — Rust mock OS no longer Windows-only

Current relevant lines:

- `AppConfig::mock()` uses Windows paths at `apps/desktop/src-tauri/src/models.rs:67-81`.
- `SystemInfo::mock()` hardcodes `Windows` at `apps/desktop/src-tauri/src/models.rs:98-110`.
- Optional serialization test uses `os: "Windows"` at `apps/desktop/src-tauri/src/models.rs:321-328`.

Required fix focuses on system-info OS. Keep `AppConfig::mock()` path cleanup optional unless tests expose a user-facing failure; backend real defaults already live in `apps/desktop/src-tauri/src/config.rs:55-75`.

Add helper near `impl SystemInfo`:

```rust
fn mock_os_label() -> String {
    match std::env::consts::OS {
        "windows" => "Windows".to_string(),
        "linux" => "Linux".to_string(),
        "macos" => "macOS".to_string(),
        other => other.to_string(),
    }
}
```

Before:

```rust
impl SystemInfo {
    pub fn mock() -> Self {
        Self {
            os: "Windows".to_string(),
```

After:

```rust
impl SystemInfo {
    pub fn mock() -> Self {
        Self {
            os: mock_os_label(),
```

Test before:

```rust
let info = SystemInfo {
    os: "Windows".to_string(),
```

Test after:

```rust
let info = SystemInfo {
    os: "Test OS".to_string(),
```

Completion gate: Rust tests still pass and no Rust mock system-info constructor hardcodes Windows.

---

### 4.11 `apps/desktop/src/components/layout/EngineHeader.tsx` — actual OS badge

Current relevant lines:

- Imports at `apps/desktop/src/components/layout/EngineHeader.tsx:1-4`.
- Hardcoded badge at `apps/desktop/src/components/layout/EngineHeader.tsx:24-27`.

Before:

```tsx
import { Cpu, Monitor, RadioTower } from "lucide-react";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";
import { Badge } from "@/components/ui/badge";
import { useModelStore } from "@/stores/useModelStore";
```

After:

```tsx
import { useQuery } from "@tanstack/react-query";
import { Cpu, Monitor, RadioTower } from "lucide-react";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";
import { Badge } from "@/components/ui/badge";
import { getRuntimePlatformLabel } from "@/lib/platform";
import { studioClient } from "@/lib/tauri";
import { useModelStore } from "@/stores/useModelStore";
```

Inside `EngineHeader`, after active model lookup:

```tsx
const systemInfo = useQuery({
  queryKey: ["system-info"],
  queryFn: studioClient.getSystemInfo,
  retry: false,
  staleTime: 60_000,
});
const osLabel = systemInfo.data?.os ?? getRuntimePlatformLabel();
```

Before badge:

```tsx
<Badge variant="secondary">
  <Monitor aria-hidden="true" className="mr-1 h-3 w-3" />
  Windows target
</Badge>
```

After badge:

```tsx
<Badge variant="secondary">
  <Monitor aria-hidden="true" className="mr-1 h-3 w-3" />
  {osLabel}
</Badge>
```

Completion gate: header never renders `Windows target`; with mocked `get_system_info` returning `Test OS`, header renders `Test OS`; on Linux Tauri it renders the `sysinfo` OS string such as `Arch Linux` when available.

---

### 4.12 `apps/desktop/src/features/settings/SetupPanel.test.tsx` — Linux path happy path

Current Windows-only values:

- Binary input at `apps/desktop/src/features/settings/SetupPanel.test.tsx:24-29`.
- Output input at `apps/desktop/src/features/settings/SetupPanel.test.tsx:54-58`.
- Expected config at `apps/desktop/src/features/settings/SetupPanel.test.tsx:70-76`.

Before:

```ts
await user.type(
  screen.getByLabelText("Connect s2.cpp"),
  "C:\\s2\\s2.exe",
);
```

After:

```ts
await user.type(
  screen.getByLabelText("Connect s2.cpp"),
  "/home/test/voice-of-fish/s2.cpp/s2",
);
```

Before:

```ts
await user.type(
  screen.getByLabelText("Output folder path"),
  "C:\\voice-of-fish\\outputs",
);
```

After:

```ts
await user.type(
  screen.getByLabelText("Output folder path"),
  "/home/test/voice-of-fish/outputs",
);
```

Expected object before:

```ts
binaryPath: "C:\\s2\\s2.exe",
outputsPath: "C:\\voice-of-fish\\outputs",
```

Expected object after:

```ts
binaryPath: "/home/test/voice-of-fish/s2.cpp/s2",
outputsPath: "/home/test/voice-of-fish/outputs",
```

Add assertions in the same test before typing to verify Linux placeholders when the test runtime is Linux. If this is flaky across CI platforms, use the helper directly in `platform.test.ts` instead of asserting rendered placeholder text here.

Completion gate: setup wizard test passes on Linux without relying on `.exe` validation.

---

### 4.13 `apps/desktop/src/app/App.test.tsx` or new `EngineHeader.test.tsx` — header OS badge test

Current `App.test.tsx:9-18` already mocks `get_system_info` with `os: "Test OS"`.

Add to the existing navigation test after `render(<App />)`:

```ts
expect(screen.queryByText("Windows target")).not.toBeInTheDocument();
expect(screen.getAllByText("Test OS").length).toBeGreaterThan(0);
```

If this becomes ambiguous because Dashboard also renders the OS, create a focused `apps/desktop/src/components/layout/EngineHeader.test.tsx` with `QueryClientProvider` and a mocked `get_system_info`; assert `Windows target` is absent and `Test OS` is present.

Completion gate: test fails before `EngineHeader` change and passes after.

---

### 4.14 `apps/desktop/src-tauri/tauri.conf.json` — window config and icons

Current window config at `apps/desktop/src-tauri/tauri.conf.json:11-17`:

```json
"windows": [
  {
    "title": "Voice of Fish",
    "width": 1280,
    "height": 800
  }
]
```

Replace with:

```json
"windows": [
  {
    "title": "Voice of Fish",
    "width": 1280,
    "height": 800,
    "center": true,
    "minWidth": 1024,
    "minHeight": 600,
    "decorations": true,
    "resizable": true
  }
]
```

Current bundle icon config at `apps/desktop/src-tauri/tauri.conf.json:24-28`:

```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": ["icons/icon.ico"]
}
```

Replace with:

```json
"bundle": {
  "active": true,
  "targets": "all",
  "icon": ["icons/icon.png", "icons/icon.icns", "icons/icon.ico"]
}
```

Asset notes:

- `apps/desktop/src-tauri/icons/icon.png` already exists and should be retained for Linux.
- `apps/desktop/src-tauri/icons/icon.ico` already exists and should be retained for Windows.
- Add `apps/desktop/src-tauri/icons/icon.icns` as a valid placeholder generated from the same icon source. Do not add an empty or text `.icns`; invalid binary icon assets can break macOS packaging.
- If a source image is needed, use Tauri's icon tooling to generate platform icons from the existing PNG: `pnpm --filter @voice-of-fish/desktop tauri icon apps/desktop/src-tauri/icons/icon.png`. Review generated files and keep the config list above. If the command overwrites `icon.ico`/`icon.png`, verify they remain valid image assets.

Completion gate:

- JSON parses.
- `bundle.icon` includes PNG, ICNS, and ICO.
- `app.windows[0]` explicitly includes `center`, `minWidth`, `minHeight`, `decorations`, and `resizable`.

---

### 4.15 `docs/hyprland-setup.md` — create Linux/Hyprland guide

Create this document. Suggested content:

```md
# Voice of Fish on Hyprland / Wayland

Voice of Fish is a Tauri v2 desktop app. On Linux it uses the system WebKitGTK/WebView stack and the compositor's normal Wayland/XDG behavior.

## Recommended launch environment

Start with the default environment first. If the window is blank, flickers, or opens through XWayland unexpectedly, try launching from a terminal with:

```sh
GDK_BACKEND=wayland,x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 voice-of-fish-desktop
```

For development:

```sh
GDK_BACKEND=wayland,x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 pnpm dev
```

Notes:

- `GDK_BACKEND=wayland,x11` prefers Wayland and allows GTK to fall back to X11 if the local WebKitGTK stack requires it.
- `WEBKIT_DISABLE_COMPOSITING_MODE=1` can help on compositors/drivers that show blank WebKit windows. Remove it if rendering is already stable.
- Ensure `xdg-desktop-portal-hyprland` is running for native file/folder dialogs.

## Hyprland window rules

The app now sets native decorations, resizable behavior, centering, and minimum size in `apps/desktop/src-tauri/tauri.conf.json`; most users should not need custom rules.

Hyprland rule syntax changes across releases. For Hyprland 0.55+, the official wiki documents Lua-style rules:

```lua
-- Optional: disable blur for Voice of Fish if WebKit rendering looks soft.
hl.window_rule({
  name = "voice-of-fish-no-blur",
  match = { title = "Voice of Fish" },
  no_blur = true,
})
```

If your window title/class differs, inspect it while the app is running:

```sh
hyprctl clients
```

Then change the `match` table to the observed `title`, `class`, or `initial_class`.

After editing Hyprland config:

```sh
hyprctl reload
hyprctl configerrors
```

If your Hyprland version still uses legacy hyprlang `windowrulev2`, consult the matching version of the Hyprland wiki before copying rules; the 0.55+ Lua examples above are not valid for older configs.

## Native file picker notes

Linux `s2.cpp` binaries are often extensionless, for example `s2`, or named `s2.cpp`. The app's Linux binary picker intentionally opens without extension filters so these files remain selectable.
```

Completion gate: the document exists, mentions Wayland env vars, `xdg-desktop-portal-hyprland`, current Lua `hl.window_rule` syntax, `hyprctl clients`, and validation with `hyprctl configerrors`.

---

### 4.16 `assets/voice-of-fish.desktop` — create Linux launcher template

The `assets/` directory does not currently exist. Create it and add:

```desktop
[Desktop Entry]
Type=Application
Name=Voice of Fish
Comment=Local voice generation studio powered by s2.cpp
Exec=voice-of-fish-desktop %U
Icon=voice-of-fish
Terminal=false
Categories=AudioVideo;Audio;Utility;
StartupNotify=true
StartupWMClass=Voice of Fish
```

Notes:

- `Exec=voice-of-fish-desktop` matches the Tauri binary name in `apps/desktop/src-tauri/Cargo.toml:12-14`.
- `Icon=voice-of-fish` assumes packaging installs the icon under that theme name. If the packaging pipeline later installs a full path or Tauri-generated desktop entry, update this template accordingly.
- Keep this as a template asset; do not wire install scripts in this Linux adaptation pass.

Completion gate: file exists and follows freedesktop `.desktop` key format.

---

### 4.17 `README.md` — update project status and Linux docs link

Current status still says Windows-first at `README.md:8-9` and requirements mention Windows-only Tauri prerequisites at `README.md:15-18`.

Before:

```md
**Windows-first** — the desktop app targets Windows for the initial slice. Linux and macOS binary directories exist with tracked `.gitkeep` files. Tauri config, Rust crates, and build hooks follow cross-platform conventions.
```

After:

```md
**Cross-platform desktop target** — the desktop app supports Windows and Linux UX paths. Linux/Hyprland users can select extensionless `s2.cpp` binaries and should read [`docs/hyprland-setup.md`](docs/hyprland-setup.md) for Wayland-specific launch notes.
```

Before requirements:

```md
- **Rust** toolchain with Windows Tauri 2 prerequisites:
  - Microsoft Visual Studio C++ Build Tools
  - WebView2 runtime (bundled with Windows 11; install manually on Windows 10)
  - See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
```

After requirements:

```md
- **Rust** toolchain with Tauri 2 prerequisites for your OS:
  - Windows: Microsoft Visual Studio C++ Build Tools and WebView2 runtime.
  - Linux: WebKitGTK/GTK stack and XDG desktop portal packages required by Tauri/WebKit on your distro.
  - See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
```

Completion gate: README no longer presents the project as Windows-only and links to the Hyprland guide.

---

## 5. Task breakdown

### Task 1 — Add platform helper and tests

Files:

- Create `apps/desktop/src/lib/platform.ts`
- Create `apps/desktop/src/lib/platform.test.ts`

Steps:

1. Add `DesktopPlatform`, `getRuntimePlatform`, `getRuntimePlatformLabel`, `getPlatformDefaultPaths`, and `joinDisplayPath` exactly as specified in section 4.1.
2. Add tests from section 4.2.
3. Run: `pnpm --filter @voice-of-fish/desktop test -- src/lib/platform.test.ts`

Acceptance criteria:

- Platform labels and default paths are deterministic under test.
- Linux default paths use `~/voice-of-fish/...`.
- Windows default paths retain `C:\...`.

Dependencies: none.

---

### Task 2 — Make binary validation and picker Linux-aware

Files:

- Modify `apps/desktop/src/lib/tauri.ts:1-34,58-71,159-187`
- Create `apps/desktop/src/lib/tauri.test.ts`

Steps:

1. Import platform helpers.
2. Replace `validateBinaryPath()` suffix-only implementation with platform-aware implementation.
3. Add optional `platform` parameter to `pickBinaryPath()` and make Linux/macOS dialog filter-free.
4. Update the duplicate mock block in `tauri.ts` to use platform label/default paths.
5. Add tests from section 4.4.
6. Run: `pnpm --filter @voice-of-fish/desktop test -- src/lib/tauri.test.ts`

Acceptance criteria:

- Linux accepts extensionless `s2` and `s2.cpp`.
- Linux accepts `.AppImage` case-insensitively.
- Linux rejects obvious non-binary suffixes like `.txt`.
- Windows still accepts `.exe`, `.cmd`, `.bat` and rejects extensionless paths.
- Linux picker passes no `filters` property to Tauri dialog.

Dependencies: Task 1.

---

### Task 3 — Replace Windows-only onboarding placeholders

Files:

- Modify `apps/desktop/src/lib/i18n.ts:29-68`
- Modify `apps/desktop/src/components/settings/OnboardingEngineStep.tsx:1-106`
- Modify `apps/desktop/src/components/settings/OnboardingModelStep.tsx:1-166`
- Modify `apps/desktop/src/components/settings/OnboardingOutputStep.tsx:1-107`
- Modify `apps/desktop/src/features/settings/SetupPanel.test.tsx:24-76`

Steps:

1. Change placeholder messages to `e.g. {path}`.
2. Import `getPlatformDefaultPaths()` into each onboarding step.
3. Pass the correct platform path into `t()` for engine, model folder, and output folder placeholders.
4. Update setup wizard test to use Linux-style binary/output paths.
5. Run: `pnpm --filter @voice-of-fish/desktop test -- src/features/settings/SetupPanel.test.tsx`

Acceptance criteria:

- No onboarding placeholder string hardcodes `C:\...`.
- Setup wizard can complete with `/home/test/voice-of-fish/s2.cpp/s2`.
- Existing Windows behavior is preserved through explicit Windows defaults in `platform.ts`.

Dependencies: Task 1 and Task 2.

---

### Task 4 — Remove hardcoded Windows from mocks and header badge

Files:

- Modify `apps/desktop/src/lib/mock-data.ts:13-57`
- Modify `apps/desktop/src-tauri/src/models.rs:98-110,321-328`
- Modify `apps/desktop/src/components/layout/EngineHeader.tsx:1-37`
- Modify `apps/desktop/src/app/App.test.tsx:9-45` or create `apps/desktop/src/components/layout/EngineHeader.test.tsx`

Steps:

1. Update `mock-data.ts` to use `getRuntimePlatformLabel()`, `getPlatformDefaultPaths()`, and `joinDisplayPath()`.
2. Update Rust `SystemInfo::mock()` to use a `mock_os_label()` helper based on `std::env::consts::OS`.
3. Change the Rust optional-field serialization test OS from `Windows` to `Test OS`.
4. Update `EngineHeader` to query `studioClient.getSystemInfo()` with fallback `getRuntimePlatformLabel()`.
5. Add or update a test proving `Windows target` is gone and mocked OS appears.
6. Run:
   - `pnpm --filter @voice-of-fish/desktop test -- src/app/App.test.tsx`
   - `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml system_info_omits_absent_optional_fields`

Acceptance criteria:

- `EngineHeader` displays actual/mocked OS instead of `Windows target`.
- TypeScript mock clients do not hardcode `os: "Windows"`.
- Rust `SystemInfo::mock()` does not hardcode Windows.
- Tests pass.

Dependencies: Task 1.

---

### Task 5 — Update Tauri window config and icon declarations

Files:

- Modify `apps/desktop/src-tauri/tauri.conf.json:11-28`
- Keep existing `apps/desktop/src-tauri/icons/icon.png`
- Keep existing `apps/desktop/src-tauri/icons/icon.ico`
- Create `apps/desktop/src-tauri/icons/icon.icns` as a valid placeholder/generated icon

Steps:

1. Add `center`, `minWidth`, `minHeight`, `decorations`, and `resizable` to the existing window object.
2. Update `bundle.icon` to include `icons/icon.png`, `icons/icon.icns`, and `icons/icon.ico`.
3. Generate or add a valid `.icns` file. Prefer Tauri icon tooling from the existing PNG; do not create a zero-byte placeholder.
4. Run: `pnpm --filter @voice-of-fish/desktop tauri info` if available, or validate via `pnpm --filter @voice-of-fish/desktop build:web` plus JSON parse.

Acceptance criteria:

- `tauri.conf.json` is valid JSON.
- Window config explicitly has Linux/Hyprland-friendly center/min-size/decorated/resizable settings.
- Bundle icon array includes PNG/ICNS/ICO.
- The `.icns` asset is a valid binary icon, not an empty text placeholder.

Dependencies: none.

---

### Task 6 — Add Linux/Hyprland docs and desktop launcher template

Files:

- Create `docs/hyprland-setup.md`
- Create `assets/voice-of-fish.desktop`
- Modify `README.md:8-18`

Steps:

1. Add Hyprland/Wayland guide content from section 4.15.
2. Add freedesktop launcher template from section 4.16.
3. Update README status and requirements text from section 4.17.
4. Run a markdown format pass with the repo formatter only after code tasks are complete: `pnpm --filter @voice-of-fish/desktop format`.

Acceptance criteria:

- Hyprland guide documents Wayland env vars, portal requirement, current Lua `hl.window_rule` syntax, `hyprctl clients`, and `hyprctl configerrors`.
- `.desktop` template exists under `assets/` and references `voice-of-fish-desktop`.
- README no longer says the app targets Windows for the current slice.

Dependencies: Task 5 for icon/window config references.

---

### Task 7 — Final integrated verification

Files: all changed files.

Steps:

1. Run focused frontend tests:
   ```sh
   pnpm --filter @voice-of-fish/desktop test -- src/lib/platform.test.ts src/lib/tauri.test.ts src/features/settings/SetupPanel.test.tsx src/app/App.test.tsx
   ```
2. Run all frontend tests if focused tests pass:
   ```sh
   pnpm --filter @voice-of-fish/desktop test
   ```
3. Run Rust tests:
   ```sh
   cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
   ```
4. Run lint:
   ```sh
   pnpm --filter @voice-of-fish/desktop lint
   ```
5. Run web build:
   ```sh
   pnpm --filter @voice-of-fish/desktop build:web
   ```
6. If Linux Tauri prerequisites are installed, run:
   ```sh
   pnpm --filter @voice-of-fish/desktop tauri build
   ```
7. Manual Hyprland smoke test:
   ```sh
   GDK_BACKEND=wayland,x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 pnpm dev
   ```
   Verify the app opens centered, native decorations are present, window cannot be resized below 1024x600, setup accepts `/home/<user>/voice-of-fish/s2.cpp/s2`, and the header OS badge shows the real OS instead of `Windows target`.

Acceptance criteria:

- All automated checks pass or any missing Linux/Tauri system prerequisite is explicitly documented with the exact failing command and stderr.
- Manual Linux/Hyprland smoke test passes on the workstation.

Dependencies: Tasks 1-6 complete.

---

## 6. Verification commands

Run these from repo root (`/home/endo/Desktop/miltivik/proyectos/voice-of-fish`) after implementation.

```sh
pnpm --filter @voice-of-fish/desktop test -- src/lib/platform.test.ts src/lib/tauri.test.ts src/features/settings/SetupPanel.test.tsx src/app/App.test.tsx
pnpm --filter @voice-of-fish/desktop test
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm --filter @voice-of-fish/desktop lint
pnpm --filter @voice-of-fish/desktop build:web
pnpm --filter @voice-of-fish/desktop tauri build
```

Manual Linux/Hyprland verification:

```sh
GDK_BACKEND=wayland,x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 pnpm dev
```

Manual checklist:

- The first-run setup engine input placeholder is `e.g. ~/voice-of-fish/s2.cpp/s2` on Linux.
- Selecting or typing an existing extensionless binary path such as `/home/endo/voice-of-fish/s2.cpp/s2` enables Continue after existence check.
- Linux file picker does not hide extensionless files.
- Model/output placeholders use `~/voice-of-fish/models` and `~/voice-of-fish/outputs`.
- App header shows the actual OS (`Arch Linux`, `Linux`, or sysinfo-provided equivalent), never `Windows target`.
- Window opens centered, has native decorations, is resizable, and respects 1024x600 minimum size.
- `docs/hyprland-setup.md` renders correctly and `.desktop` file validates visually.

---

## Edge Cases

- `s2.cpp` executable name: `basename.includes(".")` would reject it if treated as a normal extensioned file. The validation must explicitly allow basename `s2.cpp` on Linux.
- AppImage casing: validate `.AppImage`, `.appimage`, and mixed-case suffixes case-insensitively.
- Linux paths with spaces: `validatePath()` currently allows spaces; tests should include at least one path with a space if touching validation further.
- Dangerous path characters: current `DANGEROUS_PATTERNS` at `apps/desktop/src/lib/tauri.ts:20` rejects shell metacharacters. Do not weaken this while adding Linux support.
- `~` placeholders are examples only. `check_binary_exists` canonicalizes real paths and will not expand `~`; users must select a real path or type an expanded path for validation. Do not prefill `~` as actual persisted config unless expansion is implemented.
- Native file dialogs differ by GTK portal backend. Filter-free Linux picker is deliberate; validation still runs after selection.
- Hyprland class/title matching may differ between dev (`pnpm dev`) and packaged app. Docs should tell users to inspect with `hyprctl clients`.
- Header OS query can fail outside Tauri. Fallback to `getRuntimePlatformLabel()` prevents the badge from breaking browser-based tests/dev.
- Tauri icon generation can overwrite existing icon files. Review generated assets before committing.
- `tauri build` may fail on Linux if WebKitGTK/Tauri prerequisites are missing. Treat missing system packages as environment blockers only after frontend/Rust tests pass.

---

## Critical Files

Read these files before implementation if they changed after this plan was written:

- `apps/desktop/src/lib/tauri.ts:1-220` — frontend Tauri API wrapper, path validation, file pickers, duplicate mock client.
- `apps/desktop/src/lib/i18n.ts:1-110` — onboarding strings and parameter replacement.
- `apps/desktop/src/components/settings/OnboardingEngineStep.tsx:1-147` — engine binary input and validation flow.
- `apps/desktop/src/components/settings/OnboardingModelStep.tsx:1-242` — model path/file selection and path separator helper.
- `apps/desktop/src/components/settings/OnboardingOutputStep.tsx:1-158` — output folder input and setup summary.
- `apps/desktop/src/components/settings/SetupPanel.tsx:1-153` — onboarding state and final config construction.
- `apps/desktop/src/features/settings/SetupPanel.test.tsx:1-110` — setup wizard test currently using Windows paths.
- `apps/desktop/src/components/layout/EngineHeader.tsx:1-37` — hardcoded OS badge.
- `apps/desktop/src/app/App.test.tsx:1-45` — app-level Tauri IPC mocks returning `Test OS`.
- `apps/desktop/src/lib/mock-data.ts:1-80` — separate mock client/default config with Windows paths/OS.
- `apps/desktop/src-tauri/src/diagnostics.rs:1-64` — real system info already cross-platform via `sysinfo`.
- `apps/desktop/src-tauri/src/commands.rs:151-159` — backend binary existence check canonicalizes filesystem path and checks `is_file()`.
- `apps/desktop/src-tauri/src/config.rs:55-75` — real default config already uses `dirs::home_dir()` and platform separators.
- `apps/desktop/src-tauri/src/models.rs:67-110,229-249,321-328` — Rust mock constructors/tests with Windows strings.
- `apps/desktop/src-tauri/tauri.conf.json:1-29` — Tauri window and icon config.
- `apps/desktop/src-tauri/icons/icon.png` — existing Linux PNG icon asset.
- `apps/desktop/src-tauri/icons/icon.ico` — existing Windows icon asset.
- `README.md:1-80` — current status/requirements docs.
- `packages/shared/src/types.ts:85-92` — `SystemInfo` contract consumed by frontend.

---

## Alternatives considered

1. **Use only Tauri `get_system_info` for all platform choices.** Rejected because `validateBinaryPath()` and `pickBinaryPath()` are synchronous/frontend-first boundaries; making them async would ripple through call sites and tests for little benefit.
2. **Accept all files as binaries on every platform.** Rejected because it weakens the existing frontend guard and would allow obvious mistakes like `.txt` before the backend existence check.
3. **Use Linux executable permission checks in the frontend.** Rejected because browser/WebView JavaScript cannot reliably inspect POSIX executable bits; the Rust backend should remain the filesystem authority.
4. **Hardcode Linux placeholders globally.** Rejected because Windows support must remain intact.
5. **Add Hyprland-specific runtime code.** Rejected because Hyprland compatibility is achieved through normal Tauri window config and docs; app code should not special-case one compositor unless a measured bug requires it.

---

## Pitfalls / tricky parts

- Do not add empty `.icns` files to satisfy the filename requirement; invalid icons can break packaging.
- Do not modify `~/.config/hypr/*`; the requested Hyprland work is repo documentation only.
- Keep the `StudioClient` command names aligned with `apps/desktop/src-tauri/src/main.rs:20-38`.
- `EngineHeader` lives under `QueryClientProvider` via `apps/desktop/src/app/providers.tsx`; if a focused unit test renders `EngineHeader` alone, it must wrap a `QueryClientProvider`.
- If adding `platform.ts` causes ESLint complaints about `Navigator` augmentation, keep the local `NavigatorWithUserAgentData` type instead of global declarations.
