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
  | "cancelled"
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
  advancedArgs: Record<string, AdvancedArgValue>;
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
  downloadUrl?: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  language: string;
  referenceText: string;
  referenceFileName: string;
  referenceAudioPath?: string;
  notes?: string;
  gender?: string;
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
  voiceName: string;
  outputPath: string;
  createdAt: string;
  durationSeconds: number;
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

export interface SentenceClip {
  text: string;
  startMs: number;
  endMs: number;
  wavPath: string;
}

export type VoiceGender = "female" | "male";

export interface BuiltInVoice {
  id: string;
  name: string;
  gender: VoiceGender;
  language: string;
  referenceText: string;
  /** URL to download the reference audio from (Hugging Face direct link). */
  referenceAudioUrl: string;
  /** Expected filename for the downloaded reference audio. */
  referenceFileName: string;
  /** Approximate duration of the reference audio in seconds. */
  durationSeconds: number;

export interface SeedResult {
  voiceId: string;
  name: string;
  success: boolean;
  error?: string;
}
}