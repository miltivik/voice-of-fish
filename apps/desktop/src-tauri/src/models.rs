use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AppMode {
    Simple,
    Advanced,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AudioFormat {
    Wav,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub enum ModelQuant {
    Q8,
    Q6,
    Q5,
    Q4,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ModelState {
    NotInstalled,
    Downloading,
    Installed,
    Error,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum GenerationStatus {
    Idle,
    Preparing,
    Generating,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(untagged)]
pub enum ConfigValue {
    String(String),
    Number(f64),
    Bool(bool),
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub mode: AppMode,
    pub binary_path: String,
    pub models_path: String,
    pub outputs_path: String,
    pub default_model_id: String,
    pub default_audio_format: AudioFormat,
    pub cpu_threads: u16,
    pub gpu_enabled: bool,
    pub advanced_args: BTreeMap<String, ConfigValue>,
}

impl AppConfig {
    pub fn mock() -> Self {
        Self {
            mode: AppMode::Simple,
            binary_path: String::new(),
            models_path: "C:\\voice-of-fish\\models".to_string(),
            outputs_path: "C:\\voice-of-fish\\outputs".to_string(),
            default_model_id: "s2-q6".to_string(),
            default_audio_format: AudioFormat::Wav,
            cpu_threads: 8,
            gpu_enabled: true,
            advanced_args: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os: String,
    pub cpu: String,
    pub ram_label: String,
    pub gpu: Option<String>,
    pub app_version: String,
    pub engine_version: Option<String>,
}

impl SystemInfo {
    pub fn mock() -> Self {
        Self {
            os: "Windows".to_string(),
            cpu: "Mock local CPU".to_string(),
            ram_label: "16 GB".to_string(),
            gpu: Some("Detect through Tauri later".to_string()),
            app_version: "0.1.0".to_string(),
            engine_version: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalModel {
    pub id: String,
    pub quant: ModelQuant,
    pub filename: String,
    pub display_size: String,
    pub approx_bytes: u64,
    pub recommendation: String,
    pub tokenizer_required: bool,
    pub checksum: Option<String>,
    pub state: ModelState,
}

impl LocalModel {
    pub fn mock_manifest() -> Vec<Self> {
        vec![
            Self {
                id: "s2-q8".to_string(),
                quant: ModelQuant::Q8,
                filename: "s2-pro-q8_0.gguf".to_string(),
                display_size: "5.3 GB".to_string(),
                approx_bytes: 5_300_000_000,
                recommendation: "Highest quality, higher VRAM use.".to_string(),
                tokenizer_required: true,
                checksum: None,
                state: ModelState::NotInstalled,
            },
            Self {
                id: "s2-q6".to_string(),
                quant: ModelQuant::Q6,
                filename: "s2-pro-q6_k.gguf".to_string(),
                display_size: "4.3 GB".to_string(),
                approx_bytes: 4_300_000_000,
                recommendation: "Recommended balance.".to_string(),
                tokenizer_required: true,
                checksum: None,
                state: ModelState::Installed,
            },
            Self {
                id: "s2-q5".to_string(),
                quant: ModelQuant::Q5,
                filename: "s2-pro-q5_k_m.gguf".to_string(),
                display_size: "3.8 GB".to_string(),
                approx_bytes: 3_800_000_000,
                recommendation: "Stable choice for limited GPUs.".to_string(),
                tokenizer_required: true,
                checksum: None,
                state: ModelState::NotInstalled,
            },
            Self {
                id: "s2-q4".to_string(),
                quant: ModelQuant::Q4,
                filename: "s2-pro-q4_k_m.gguf".to_string(),
                display_size: "3.4 GB".to_string(),
                approx_bytes: 3_400_000_000,
                recommendation: "Lower consumption, lower quality.".to_string(),
                tokenizer_required: true,
                checksum: None,
                state: ModelState::NotInstalled,
            },
        ]
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GenerationRequest {
    pub text: String,
    pub language: String,
    pub model_id: String,
    pub seed: Option<i64>,
    pub voice_preset_id: Option<String>,
    pub reference_audio_path: Option<String>,
    pub reference_text: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GenerationJob {
    pub text: String,
    pub language: String,
    pub model_id: String,
    pub seed: Option<i64>,
    pub voice_preset_id: Option<String>,
    pub reference_audio_path: Option<String>,
    pub reference_text: Option<String>,
    pub id: String,
    pub status: GenerationStatus,
    pub output_path: Option<String>,
    pub audio_url: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
    pub duration_seconds: Option<f64>,
    pub error: Option<String>,
}

impl GenerationJob {
    pub fn mock(request: GenerationRequest) -> Self {
        Self {
            text: request.text,
            language: request.language,
            model_id: request.model_id,
            seed: request.seed,
            voice_preset_id: request.voice_preset_id,
            reference_audio_path: request.reference_audio_path,
            reference_text: request.reference_text,
            id: "mock-job-1".to_string(),
            status: GenerationStatus::Completed,
            output_path: Some("C:\\voice-of-fish\\outputs\\mock-generation.wav".to_string()),
            audio_url: None,
            created_at: "2026-05-22T12:00:00.000Z".to_string(),
            completed_at: Some("2026-05-22T12:00:01.000Z".to_string()),
            duration_seconds: Some(6.4),
            error: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LogStream {
    Stdout,
    Stderr,
    System,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GenerationLogLine {
    pub id: String,
    pub stream: LogStream,
    pub message: String,
    pub created_at: String,
}

impl GenerationLogLine {
    pub fn mock_lines() -> Vec<Self> {
        vec![Self {
            id: "log-1".to_string(),
            stream: LogStream::System,
            message: "Mock engine idle.".to_string(),
            created_at: "2026-05-22T12:00:00.000Z".to_string(),
        }]
    }
}
