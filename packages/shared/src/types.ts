export type AppMode = "simple" | "advanced";
export type AudioFormat = "wav";
export type ModelQuant = "Q8" | "Q6" | "Q5" | "Q4";
export type ModelState =
  | "not-installed"
  | "downloading"
  | "installed"
  | "error";
export type GenerationStatus =
  | "idle"
  | "preparing"
  | "generating"
  | "completed"
  | "failed";

export interface AppConfig {
  mode: AppMode;
  binaryPath: string;
  modelsPath: string;
  outputsPath: string;
  defaultModelId: string;
  defaultAudioFormat: AudioFormat;
  cpuThreads: number;
  gpuEnabled: boolean;
  advancedArgs: Record<string, string | number | boolean>;
}

export interface ModelManifestEntry {
  id: string;
  quant: ModelQuant;
  filename: string;
  displaySize: string;
  approxBytes: number;
  recommendation: string;
  tokenizerRequired: boolean;
  checksum?: string;
  state: ModelState;
}

export interface VoicePreset {
  id: string;
  name: string;
  language: string;
  referenceText: string;
  referenceFileName: string;
  referenceAudioPath?: string;
  notes?: string;
  durationSeconds?: number;
}

export interface GenerationRequest {
  text: string;
  language: string;
  modelId: string;
  seed?: number;
  voicePresetId?: string;
  referenceAudioPath?: string;
  referenceText?: string;
}

export interface GenerationJob extends GenerationRequest {
  id: string;
  status: GenerationStatus;
  outputPath?: string;
  audioUrl?: string;
  createdAt: string;
  completedAt?: string;
  durationSeconds?: number;
  error?: string;
}

export interface HistoryRecord {
  id: string;
  text: string;
  modelId: string;
  voiceName?: string;
  outputPath: string;
  createdAt: string;
  durationSeconds?: number;
  status: Exclude<GenerationStatus, "idle">;
}

export interface SystemInfo {
  os: string;
  cpu: string;
  ramLabel: string;
  gpu?: string;
  appVersion: string;
  engineVersion?: string;
  binaryFound?: boolean;
}

export interface ProcessLogLine {
  id: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
  createdAt: string;
}
