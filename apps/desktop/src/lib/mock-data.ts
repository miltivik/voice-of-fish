import {
  MOCK_HISTORY,
  S2_MODEL_MANIFEST,
} from "@voice-of-fish/shared/constants";
import type {
  AppConfig,
  GenerationJob,
  GenerationRequest,
  ModelManifestEntry,
  ProcessLogLine,
  SystemInfo,
} from "@voice-of-fish/shared";
import type { StudioClient } from "./tauri";

let models = structuredClone(S2_MODEL_MANIFEST);

export const defaultConfig: AppConfig = {
  mode: "simple",
  binaryPath: "",
  modelsPath: "C:\\voice-of-fish\\models",
  outputsPath: "C:\\voice-of-fish\\outputs",
  defaultModelId: "s2-q6",
  defaultAudioFormat: "wav",
  cpuThreads: 8,
  gpuEnabled: true,
  advancedArgs: {},
};

const systemInfo: SystemInfo = {
  os: "Windows",
  cpu: "Mock local CPU",
  ramLabel: "16 GB",
  gpu: "Detect through Tauri later",
  appVersion: "0.1.0",
  binaryFound: false,
};

const logs: ProcessLogLine[] = [
  {
    id: "log-1",
    stream: "system",
    message: "Mock engine idle.",
    createdAt: "2026-05-22T12:00:00.000Z",
  },
];

const cloneModels = (): ModelManifestEntry[] => structuredClone(models);

function completedJob(request: GenerationRequest): GenerationJob {
  return {
    ...request,
    id: "mock-job-1",
    status: "completed",
    createdAt: "2026-05-22T12:00:00.000Z",
    completedAt: "2026-05-22T12:00:01.000Z",
    outputPath: "C:\\voice-of-fish\\outputs\\mock-generation.wav",
    durationSeconds: MOCK_HISTORY[0].durationSeconds,
  };
}

export const mockClient: StudioClient = {
  getSystemInfo: async () => systemInfo,
  getAppConfig: async () => null,
  saveAppConfig: async (config) => config,
  listLocalModels: async () => cloneModels(),
  downloadModel: async (modelId) => {
    models = cloneModels().map((model) =>
      model.id === modelId ? { ...model, state: "installed" } : model,
    );
    return cloneModels();
  },
  deleteModel: async (modelId) => {
    models = cloneModels().map((model) =>
      model.id === modelId ? { ...model, state: "not-installed" } : model,
    );
    return cloneModels();
  },
  runGeneration: async (request) => completedJob(request),
  cancelGeneration: async () => true,
  readGenerationLogs: async () => logs,
  openOutputFolder: async () => true,
};
