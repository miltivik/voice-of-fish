import type { HistoryRecord, ModelManifestEntry, VoicePreset } from "./types";

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
  { value: "ja", label: "Japanese" },
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
    state: "not-installed",
  },
  {
    id: "s2-q6",
    quant: "Q6",
    filename: "s2-pro-q6_k.gguf",
    displaySize: "4.3 GB",
    approxBytes: 4_300_000_000,
    recommendation: "Recommended balance.",
    tokenizerRequired: true,
    state: "installed",
  },
  {
    id: "s2-q5",
    quant: "Q5",
    filename: "s2-pro-q5_k_m.gguf",
    displaySize: "3.8 GB",
    approxBytes: 3_800_000_000,
    recommendation: "Stable choice for limited GPUs.",
    tokenizerRequired: true,
    state: "not-installed",
  },
  {
    id: "s2-q4",
    quant: "Q4",
    filename: "s2-pro-q4_k_m.gguf",
    displaySize: "3.4 GB",
    approxBytes: 3_400_000_000,
    recommendation: "Lower consumption, lower quality.",
    tokenizerRequired: true,
    state: "not-installed",
  },
];

export const MOCK_VOICES: VoicePreset[] = [
  {
    id: "voice-nora",
    name: "Nora reference",
    language: "en",
    referenceText: "Local voices keep their reference transcript.",
    referenceFileName: "nora-reference.wav",
    durationSeconds: 14,
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
