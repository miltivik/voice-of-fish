import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as openShell } from "@tauri-apps/plugin-shell";

import {
  getRuntimePlatform,
  type DesktopPlatform,
} from "./platform";
import type {
  AppConfig,
  GenerationJob,
  GenerationRequest,
  HistoryRecord,
  ModelManifestEntry,
  ProcessLogLine,
  SystemInfo,
  VoicePreset,
  SentenceClip,
} from "@voice-of-fish/shared";
const DANGEROUS_PATTERNS = /[;&|`$(){}[\]<>]/;

export function validatePath(path: string): boolean {
  if (!path || path.length === 0) return false;
  if (path.includes("\0")) return false;
  if (DANGEROUS_PATTERNS.test(path)) return false;
  return true;
}

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

// --- Fixed external links (union of allowed keys) ---

export type ExternalLinkKey =
  | "engineSource"
  | "ggufSource"
  | "officialSourceLicense";

const EXTERNAL_LINKS: Record<ExternalLinkKey, string> = {
  engineSource: "https://github.com/rodrigomatta/s2.cpp",
  ggufSource: "https://huggingface.co/rodrigomt/s2-pro-gguf",
  officialSourceLicense: "https://huggingface.co/fishaudio/s2-pro",
};

/** Open one of the pre-approved external URLs. Never accepts arbitrary URLs from the UI. */
export async function openExternalLink(key: ExternalLinkKey): Promise<void> {
  const url = EXTERNAL_LINKS[key];
  await openShell(url);
}

// --- Safe file/folder pickers ---

/** Open a native file picker for executables. Returns the selected path or null. */
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

/** Open a native folder picker via Tauri invoke. Returns the selected path or null. */
export async function pickFolderPath(title: string): Promise<string | null> {
  const selected = await invoke<string | null>("pick_folder", { title });
  return selected;
}

/** Open a native file picker for GGUF files. Returns the selected path or null. */
export async function pickGgufPath(): Promise<string | null> {
  const selected = await openDialog({
    title: "Select GGUF model file",
    filters: [
      { name: "GGUF model", extensions: ["gguf"] },
      { name: "All files", extensions: ["*"] },
    ],
    multiple: false,
  });
  return selected ?? null;
}

/** Open a native file picker for audio files. Returns the selected path or null. */
export async function pickAudioPath(): Promise<string | null> {
  const selected = await openDialog({
    title: "Select audio file",
    filters: [
      { name: "Audio files", extensions: ["wav", "mp3", "flac"] },
      { name: "All files", extensions: ["*"] },
    ],
    multiple: false,
  });
  return selected ?? null;
}

// --- Existence checks ---

export const checkBinaryExists = (binaryPath: string) => {
  // The real validation happens server-side in Rust.
  // Frontend check is informational only — don't block the IPC call.
  if (!validateBinaryPath(binaryPath)) {
    console.warn('[checkBinaryExists] frontend validation failed for:', binaryPath);
  }
  return invoke<boolean>("check_binary_exists", { binaryPath });
};

export const checkFileExists = (filePath: string) => {
  if (!validatePath(filePath)) return Promise.resolve(false);
  return invoke<boolean>("check_file_exists", { filePath });
};

export const checkDirectoryExists = (dirPath: string) => {
  if (!validatePath(dirPath)) return Promise.resolve(false);
  return invoke<boolean>("check_directory_exists", { dirPath });
};

// --- Studio client interface ---

export interface StudioClient {
  getSystemInfo(): Promise<SystemInfo>;
  getAppConfig(): Promise<AppConfig | null>;
  saveAppConfig(config: AppConfig): Promise<AppConfig>;
  listLocalModels(): Promise<ModelManifestEntry[]>;
  downloadModel(modelId: string): Promise<ModelManifestEntry[]>;
  deleteModel(modelId: string): Promise<ModelManifestEntry[]>;
  runGeneration(request: GenerationRequest): Promise<GenerationJob>;
  cancelGeneration(jobId: string): Promise<boolean>;
  readGenerationLogs(jobId?: string): Promise<ProcessLogLine[]>;
  openOutputFolder(path: string): Promise<boolean>;
  listGenerationHistory(limit?: number): Promise<HistoryRecord[]>;
  listVoicePresets(): Promise<VoicePreset[]>;
  saveVoicePreset(preset: VoicePreset): Promise<VoicePreset>;
  deleteVoicePreset(id: string): Promise<boolean>;
  generateSentences(text: string, language: string, modelId: string, voicePresetId?: string): Promise<SentenceClip[]>;
  exportEditorBundle(clips: SentenceClip[], targetDir: string): Promise<string>;
}
export const tauriClient: StudioClient = {
  getSystemInfo: () => invoke<SystemInfo>("get_system_info"),
  getAppConfig: () => invoke<AppConfig | null>("get_app_config"),
  saveAppConfig: (config) => invoke<AppConfig>("save_app_config", { config }),
  listLocalModels: () => invoke<ModelManifestEntry[]>("list_local_models"),
  downloadModel: (modelId) =>
    invoke<ModelManifestEntry[]>("download_model", { modelId }),
  deleteModel: (modelId) =>
    invoke<ModelManifestEntry[]>("delete_model", { modelId }),
  runGeneration: (request) =>
    invoke<GenerationJob>("run_generation", { request }),
  cancelGeneration: (jobId) => invoke<boolean>("cancel_generation", { jobId }),
  readGenerationLogs: (jobId) =>
    invoke<ProcessLogLine[]>("read_generation_logs", { jobId }),
  openOutputFolder: (path) => {
    if (!validatePath(path)) return Promise.resolve(false);
    return invoke<boolean>("open_output_folder", { path });
  },
  listGenerationHistory: (limit) =>
    invoke<HistoryRecord[]>("list_generation_history", { limit }),
  listVoicePresets: () => invoke<VoicePreset[]>("list_voice_presets"),
  saveVoicePreset: (preset) =>
    invoke<VoicePreset>("save_voice_preset", { preset }),
  deleteVoicePreset: (id) =>
    invoke<boolean>("delete_voice_preset", { id }),
  generateSentences: (text, language, modelId, voicePresetId) =>
    invoke<SentenceClip[]>("generate_sentences", { text, language, modelId, voicePresetId }),
  exportEditorBundle: (clips, targetDir) =>
    invoke<string>("export_editor_bundle", { clips, targetDir }),
};

// Production client — all methods route to real Tauri IPC.
export const studioClient: StudioClient = tauriClient;