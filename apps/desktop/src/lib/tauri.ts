import { invoke } from "@tauri-apps/api/core";
import type {
  AppConfig,
  GenerationJob,
  GenerationRequest,
  ModelManifestEntry,
  ProcessLogLine,
  SystemInfo,
} from "@voice-of-fish/shared";
import { mockClient } from "./mock-data";

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
  deleteModel: (modelId) => invoke<ModelManifestEntry[]>("delete_model", { modelId }),
  runGeneration: (request) => invoke<GenerationJob>("run_generation", { request }),
  cancelGeneration: (jobId) => invoke<boolean>("cancel_generation", { jobId }),
  readGenerationLogs: (jobId) =>
    invoke<ProcessLogLine[]>("read_generation_logs", { jobId }),
  openOutputFolder: (path) => invoke<boolean>("open_output_folder", { path }),
};

const env = (import.meta as ImportMeta & {
  env?: { VITE_USE_TAURI_MOCKS?: string };
}).env;

export const studioClient =
  env?.VITE_USE_TAURI_MOCKS === "false" ? tauriClient : mockClient;
