import { invoke } from "@tauri-apps/api/core";
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
  openOutputFolder: (path) => invoke<boolean>("open_output_folder", { path }),
};

export const checkBinaryExists = (binaryPath: string) =>
  invoke<boolean>("check_binary_exists", { binaryPath });

let models = structuredClone(S2_MODEL_MANIFEST);

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

export const studioClient: StudioClient = {
  getSystemInfo: () => tauriClient.getSystemInfo(),
  getAppConfig: () => tauriClient.getAppConfig(),
  saveAppConfig: (config) => tauriClient.saveAppConfig(config),
  listLocalModels: () => mockClient.listLocalModels(),
  downloadModel: (modelId) => mockClient.downloadModel(modelId),
  deleteModel: (modelId) => mockClient.deleteModel(modelId),
  runGeneration: (request) => mockClient.runGeneration(request),
  cancelGeneration: (jobId) => mockClient.cancelGeneration(jobId),
  readGenerationLogs: (jobId) => mockClient.readGenerationLogs(jobId),
  openOutputFolder: (path) => mockClient.openOutputFolder(path),
};