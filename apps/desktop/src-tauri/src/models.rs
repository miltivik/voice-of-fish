use serde::{Deserialize, Serialize};
/// Maximum text length for a generation request (characters).
pub const MAX_TEXT_LENGTH: usize = 8_000;
/// Minimum text length for a generation request.
pub const MIN_TEXT_LENGTH: usize = 1;
/// Allowed language codes for generation requests.
pub const SUPPORTED_LANGUAGES: &[&str] = &[
    "en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl",
    "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi",
];
/// Allowed extensions for reference audio files.
pub const ALLOWED_AUDIO_EXTENSIONS: &[&str] = &["wav", "mp3", "flac"];


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
    Cancelled,
    Generating,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub binary_path: String,
    pub models_path: String,
    pub outputs_path: String,
    pub default_model_id: String,
    pub cpu_threads: u16,
    pub gpu_enabled: bool,
}

impl AppConfig {
    pub fn mock() -> Self {
        Self {
            binary_path: String::new(),
            models_path: "C:\\voice-of-fish\\models".to_string(),
            outputs_path: "C:\\voice-of-fish\\outputs".to_string(),
            default_model_id: "s2-q6".to_string(),
            cpu_threads: 8,
            gpu_enabled: true,
        }
    }

    /// Validates that binary_path is an existing executable file with an absolute path.
    /// Rejects relative paths, directories, and non-existent files.
    pub fn validate(&self) -> Result<(), String> {
        use std::path::Path;

        // binary_path: must be absolute and point to an existing file
        let bp = Path::new(&self.binary_path);
        if !bp.is_absolute() {
            return Err(format!(
                "binary_path must be absolute, got: {}",
                self.binary_path
            ));
        }
        if !bp.is_file() {
            return Err(format!(
                "binary_path does not exist or is not a file: {}",
                self.binary_path
            ));
        }

        // models_path: must be absolute
        let mp = Path::new(&self.models_path);
        if !mp.is_absolute() {
            return Err(format!(
                "models_path must be absolute, got: {}",
                self.models_path
            ));
        }

        // outputs_path: must be absolute
        let op = Path::new(&self.outputs_path);
        if !op.is_absolute() {
            return Err(format!(
                "outputs_path must be absolute, got: {}",
                self.outputs_path
            ));
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os: String,
    pub cpu: String,
    pub ram_label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu: Option<String>,
    pub app_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engine_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub binary_found: Option<bool>,
}

impl SystemInfo {
    /// Returns the OS label for the current platform.
    fn mock_os_label() -> String {
        match std::env::consts::OS {
            "windows" => "Windows".to_string(),
            "linux" => "Linux".to_string(),
            "macos" => "macOS".to_string(),
            other => format!("{} (mock)", other),
        }
    }

    pub fn mock() -> Self {
        Self {
            os: Self::mock_os_label(),
            cpu: "Mock local CPU".to_string(),
            ram_label: "16 GB".to_string(),
            gpu: Some("Detect through Tauri later".to_string()),
            app_version: "0.1.0".to_string(),
            engine_version: None,
            binary_found: Some(false),
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
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
                checksum: Some("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2".to_string()),
                download_url: Some(format!("https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{}", "s2-pro-q8_0.gguf")),
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
                checksum: Some("b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2".to_string()),
                download_url: Some(format!("https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{}", "s2-pro-q6_k.gguf")),
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
                checksum: Some("c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2".to_string()),
                download_url: Some(format!("https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{}", "s2-pro-q5_k_m.gguf")),
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
                checksum: Some("d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2".to_string()),
                download_url: Some(format!("https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{}", "s2-pro-q4_k_m.gguf")),
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice_preset_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_audio_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_text: Option<String>,
}

impl GenerationRequest {
    /// Validates the generation request server-side.
    /// Enforces text length limits, language allowlist, and reference audio path safety.
    pub fn validate(&self) -> Result<(), String> {
        let text_len = self.text.trim().len();
        if text_len < MIN_TEXT_LENGTH {
            return Err(format!(
                "text must be at least {} character(s), got {text_len}",
                MIN_TEXT_LENGTH
            ));
        }
        if text_len > MAX_TEXT_LENGTH {
            return Err(format!(
                "text exceeds maximum length of {MAX_TEXT_LENGTH} characters"
            ));
        }

        let lang = self.language.trim().to_lowercase();
        if !SUPPORTED_LANGUAGES.contains(&lang.as_str()) {
            return Err(format!("unsupported language: {lang}"));
        }

        if let Some(ref audio_path) = self.reference_audio_path {
            let ap = std::path::Path::new(audio_path);
            if !ap.is_absolute() {
                return Err(format!(
                    "reference_audio_path must be absolute, got: {audio_path}"
                ));
            }
            match ap.extension().and_then(|e| e.to_str()) {
                Some(ext) if ALLOWED_AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()) => {}
                Some(ext) => {
                    return Err(format!(
                        "reference audio file extension .{ext} is not allowed"
                    ));
                }
                None => {
                    return Err("reference_audio_path has no file extension".to_string());
                }
            }
            if !ap.is_file() {
                return Err(format!("reference audio file not found: {audio_path}"));
            }
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GenerationJob {
    pub text: String,
    pub language: String,
    pub model_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice_preset_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_audio_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_text: Option<String>,
    pub id: String,
    pub status: GenerationStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_url: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
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

/// A record of a completed or cancelled generation.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRecord {
    pub id: String,
    pub text: String,
    pub model_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice_name: Option<String>,
    pub output_path: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,
    pub status: GenerationStatus,
}

/// A user-created voice cloning preset.
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VoicePreset {
    pub id: String,
    pub name: String,
    pub language: String,
    pub reference_text: String,
    pub reference_file_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_audio_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::{
        GenerationJob, GenerationRequest, GenerationStatus, LocalModel, ModelQuant, ModelState,
        SystemInfo,
    };

    #[test]
    fn system_info_omits_absent_optional_fields() {
        let info = SystemInfo {
            os: "Test OS".to_string(),
            cpu: "Mock local CPU".to_string(),
            ram_label: "16 GB".to_string(),
            gpu: None,
            app_version: "0.1.0".to_string(),
            engine_version: None,
            binary_found: None,
        };
        let value = serde_json::to_value(info).expect("system info serializes");

        assert!(value.get("gpu").is_none());
        assert!(value.get("engineVersion").is_none());
        assert!(value.get("binaryFound").is_none());
    }

    #[test]
    fn local_model_omits_absent_checksum() {
        let model = LocalModel {
            id: "s2-q6".to_string(),
            quant: ModelQuant::Q6,
            filename: "s2-pro-q6_k.gguf".to_string(),
            display_size: "4.3 GB".to_string(),
            approx_bytes: 4_300_000_000,
            recommendation: "Recommended balance.".to_string(),
            tokenizer_required: true,
            checksum: None,
            state: ModelState::Installed,
            download_url: None,
        };

        let value = serde_json::to_value(model).expect("model serializes");

        assert!(value.get("checksum").is_none());
        assert!(value.get("checksum").is_none());
        assert!(value.get("downloadUrl").is_none());
    }

    #[test]
    fn generation_job_omits_absent_optional_fields() {
        let job = GenerationJob {
            text: "hello fish".to_string(),
            language: "en".to_string(),
            model_id: "s2-q6".to_string(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: None,
            reference_text: None,
            id: "mock-job-1".to_string(),
            status: GenerationStatus::Completed,
            output_path: None,
            audio_url: None,
            created_at: "2026-05-22T12:00:00.000Z".to_string(),
            completed_at: None,
            duration_seconds: None,
            error: None,
        };

        let value = serde_json::to_value(job).expect("job serializes");

        for field in [
            "seed",
            "voicePresetId",
            "referenceAudioPath",
            "referenceText",
            "outputPath",
            "audioUrl",
            "completedAt",
            "durationSeconds",
            "error",
        ] {
            assert!(value.get(field).is_none(), "{field} should be omitted");
        }
    }

    #[test]
    fn generation_request_omits_absent_optional_fields() {
        let request = GenerationRequest {
            text: "hello fish".to_string(),
            language: "en".to_string(),
            model_id: "s2-q6".to_string(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: None,
            reference_text: None,
        };

        let value = serde_json::to_value(request).expect("request serializes");

        for field in [
            "seed",
            "voicePresetId",
            "referenceAudioPath",
            "referenceText",
        ] {
            assert!(value.get(field).is_none(), "{field} should be omitted");
        }
    }
}
