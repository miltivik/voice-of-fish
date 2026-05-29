export const DEFAULT_APP_CONFIG = {
  mode: "simple",
  binaryPath: "",
  modelsPath: "",
  outputsPath: "",
  defaultModelId: "s2-q6",
  defaultAudioFormat: "wav",
  cpuThreads: 8,
  gpuEnabled: true,
  advancedArgs: {},
} as const;

import type { HistoryRecord, ModelManifestEntry } from "./types";

export const STYLE_TAGS = [
  "[laughing]",
  "[whisper]",
  "[sad]",
  "[angry]",
  "[excited]",
  "[professional broadcast tone]",
  "[calm]",
  "[serious]",
  "[narration]",
  "[conversation]",
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "pl", label: "Polish" },
  { value: "tr", label: "Turkish" },
  { value: "ru", label: "Russian" },
  { value: "nl", label: "Dutch" },
  { value: "cs", label: "Czech" },
  { value: "ar", label: "Arabic" },
  { value: "zh-cn", label: "Chinese (Simplified)" },
  { value: "ja", label: "Japanese" },
  { value: "hu", label: "Hungarian" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
] as const;
// Supported languages from Rust backend (s2.cpp)
export const SUPPORTED_LANGUAGES = [
  "en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi",
] as const;

export const S2_MODEL_MANIFEST: ModelManifestEntry[] = [
  {
    id: "s2-q8",
    quant: "Q8",
    filename: "s2-pro-q8_0.gguf",
    displaySize: "5.3 GB",
    approxBytes: 5_300_000_000,
    recommendation: "Highest quality, higher VRAM use.",
    tokenizerRequired: true,
    checksum: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    state: "not-installed",
    downloadUrl: "https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/s2-pro-q8_0.gguf",
  },
  {
    id: "s2-q6",
    quant: "Q6",
    filename: "s2-pro-q6_k.gguf",
    displaySize: "4.3 GB",
    approxBytes: 4_300_000_000,
    recommendation: "Recommended balance.",
    tokenizerRequired: true,
    checksum: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    state: "installed",
    downloadUrl: "https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/s2-pro-q6_k.gguf",
  },
  {
    id: "s2-q5",
    quant: "Q5",
    filename: "s2-pro-q5_k_m.gguf",
    displaySize: "3.8 GB",
    approxBytes: 3_800_000_000,
    recommendation: "Stable choice for limited GPUs.",
    tokenizerRequired: true,
    checksum: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    state: "not-installed",
    downloadUrl: "https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/s2-pro-q5_k_m.gguf",
  },
  {
    id: "s2-q4",
    quant: "Q4",
    filename: "s2-pro-q4_k_m.gguf",
    displaySize: "3.4 GB",
    approxBytes: 3_400_000_000,
    recommendation: "Lower consumption, lower quality.",
    tokenizerRequired: true,
    checksum: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    state: "not-installed",
    downloadUrl: "https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/s2-pro-q4_k_m.gguf",
  },
];

export const MOCK_HISTORY: HistoryRecord[] = [
  {
    id: "history-1",
    text: "[calm] Local generation stays on this workstation.",
    modelId: "s2-q6",
    voiceName: "Nora reference",
    outputPath: "C:\\voice-of-fish\\outputs\\calm-demo.wav",
    createdAt: "2026-05-22T12:00:00.000Z",
    durationSeconds: 6.4,
    status: "completed",
  },
];