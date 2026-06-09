import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as openShell } from "@tauri-apps/plugin-shell";

import { getRuntimePlatform } from "./platform";
import type {
  AppConfig,
  GenerationJob,
  GenerationRequest,
  HistoryRecord,
  ModelManifestEntry,
  ProcessLogLine,
  SentenceClip,
  SystemInfo,
  VoicePreset,
} from "@voice-of-fish/shared";

// --- Path validation ---

const DANGEROUS_PATTERNS = /[;&|`$(){}[\]<>]/;

export function validatePath(path: string): boolean {
  if (!path || path.length === 0) return false;
  if (path.includes("\0")) return false;
  if (DANGEROUS_PATTERNS.test(path)) return false;
  return true;
}

// --- Binary path validation ---

const WINDOWS_EXTS = [".exe", ".cmd", ".bat"] as const;
const UNIX_EXTS = [".sh", ".bin", ".elf"] as const;
const LINUX_EXTS = [...UNIX_EXTS, ".appimage"] as const;

export function validateBinaryPath(path: string): boolean {
  if (!validatePath(path)) return false;
  const platform = getRuntimePlatform();
  const lower = path.toLowerCase();
  const base = path.split(/[/\\]/).pop() ?? "";
  const endsWith = (exts: readonly string[]) => exts.some((e) => lower.endsWith(e));

  if (platform === "windows") return endsWith(WINDOWS_EXTS);
  if (platform === "linux") return endsWith(LINUX_EXTS) || (base === "s2.cpp" || !base.includes("."));
  if (platform === "macos") return endsWith(UNIX_EXTS) || base === "s2.cpp" || !base.includes(".");
  return endsWith([...WINDOWS_EXTS, ...LINUX_EXTS]);
}

// --- External links ---

export type ExternalLinkKey = "engineSource" | "ggufSource" | "officialSourceLicense";

const EXTERNAL_LINKS: Record<ExternalLinkKey, string> = {
  engineSource: "https://github.com/rodrigomatta/s2.cpp",
  ggufSource: "https://huggingface.co/rodrigomt/s2-pro-gguf",
  officialSourceLicense: "https://huggingface.co/fishaudio/s2-pro",
};

export async function openExternalLink(key: ExternalLinkKey): Promise<void> {
  await openShell(EXTERNAL_LINKS[key]);
}

// --- File/folder pickers ---

export async function pickBinaryPath(): Promise<string | null> {
  const platform = getRuntimePlatform();
  const base = { title: "Select s2.cpp binary", multiple: false } as const;
  return openDialog(
    platform === "linux" || platform === "macos"
      ? base
      : { ...base, filters: [{ name: "Executable", extensions: ["exe", "cmd", "bat", "sh", "bin", "elf", "AppImage"] }, { name: "All files", extensions: ["*"] }] },
  ) as Promise<string | null>;
}

export async function pickFolderPath(title: string): Promise<string | null> {
  return invoke<string | null>("pick_folder", { title });
}

export async function pickGgufPath(): Promise<string | null> {
  return openDialog({
    title: "Select GGUF model file",
    filters: [{ name: "GGUF model", extensions: ["gguf"] }, { name: "All files", extensions: ["*"] }],
    multiple: false,
  }) as Promise<string | null>;
}

export async function pickAudioPath(): Promise<string | null> {
  return openDialog({
    title: "Select audio file",
    filters: [{ name: "Audio files", extensions: ["wav", "mp3", "flac"] }, { name: "All files", extensions: ["*"] }],
    multiple: false,
  }) as Promise<string | null>;
}

// --- Existence checks ---

export const checkBinaryExists = (binaryPath: string) => {
  if (!validateBinaryPath(binaryPath)) console.warn("[checkBinaryExists] validation failed for:", binaryPath);
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

// --- Tauri IPC client ---
// Flat object — no interface, no proxy layer. Each method is a direct invoke call.

export const studioClient = {
  getSystemInfo: () => invoke<SystemInfo>("get_system_info"),
  getAppConfig: () => invoke<AppConfig | null>("get_app_config"),
  saveAppConfig: (config: AppConfig) => invoke<AppConfig>("save_app_config", { config }),
  listLocalModels: () => invoke<ModelManifestEntry[]>("list_local_models"),
  downloadModel: (modelId: string) => invoke<ModelManifestEntry[]>("download_model", { modelId }),
  deleteModel: (modelId: string) => invoke<ModelManifestEntry[]>("delete_model", { modelId }),
  runGeneration: (request: GenerationRequest) => invoke<GenerationJob>("run_generation", { request }),
  cancelGeneration: (jobId: string) => invoke<boolean>("cancel_generation", { jobId }),
  readGenerationLogs: (jobId?: string) => invoke<ProcessLogLine[]>("read_generation_logs", { jobId }),
  getActiveJob: () => invoke<GenerationJob | null>("get_active_job"),
  openOutputFolder: (path: string) => invoke<void>("open_output_folder", { path }),
  openOutputFile: (path: string) => invoke<void>("open_file_path", { path }),
  listGenerationHistory: (limit?: number) => invoke<HistoryRecord[]>("list_generation_history", { limit }),
  listVoicePresets: () => invoke<VoicePreset[]>("list_voice_presets"),
  saveVoicePreset: (preset: VoicePreset) => invoke<VoicePreset>("save_voice_preset", { preset }),
  deleteVoicePreset: (id: string) => invoke<boolean>("delete_voice_preset", { id }),
  generateSentences: (text: string, language: string, modelId: string, voicePresetId?: string) =>
    invoke<SentenceClip[]>("generate_sentences", { text, language, modelId, voicePresetId }),
  seedBuiltInVoices: () => invoke("seed_built_in_voices"),
  exportEditorBundle: (clips: SentenceClip[], targetDir: string) =>
    invoke<string>("export_editor_bundle", { clips, targetDir }),
};
