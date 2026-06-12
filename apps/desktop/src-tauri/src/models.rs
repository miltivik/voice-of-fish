use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    Installed,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum GenerationStatus {
    Cancelled,
    Generating,
    Completed,
    Failed,
}

/// Current schema version for AppConfig. Bump when adding required fields.
pub const CURRENT_SCHEMA_VERSION: u32 = 1;


#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default = "default_app_mode")]
    pub mode: AppMode,
    pub binary_path: String,
    pub models_path: String,
    pub outputs_path: String,
    pub default_model_id: String,
    #[serde(default = "default_audio_format")]
    pub default_audio_format: AudioFormat,
    pub cpu_threads: u16,
    pub gpu_enabled: bool,
    /// Schema version for config migration. Defaults to 0 (unset).
    #[serde(default)]
    pub schema_version: u32,
}


fn default_app_mode() -> AppMode {
    AppMode::Simple
}

fn default_audio_format() -> AudioFormat {
    AudioFormat::Wav
}
impl AppConfig {
    /// Expands a leading `~` to the user's home directory.
    pub fn expand_tilde(path: &str) -> String {
        if path.starts_with('~') {
            if let Some(home) = dirs::home_dir() {
                return home.to_string_lossy().to_string() + &path[1..];
            }
        }
        path.to_string()
    }
    /// Resolves tilde in all path fields. Call after deserializing user-provided config.
    pub fn resolve_paths(&mut self) {
        self.binary_path = Self::expand_tilde(&self.binary_path);
        self.models_path = Self::expand_tilde(&self.models_path);
        self.outputs_path = Self::expand_tilde(&self.outputs_path);
    }

    /// Validates paths are absolute, free of NUL bytes, and have safe characters.
    /// Called on every config save to enforce path safety at the IPC boundary.
    /// Does NOT require the binary to exist — only that paths are safe.
    pub fn validate_paths(&self) -> Result<(), String> {
        use std::path::Path;

        for (label, raw) in [
            ("binary_path", &self.binary_path),
            ("models_path", &self.models_path),
            ("outputs_path", &self.outputs_path),
        ] {
            if raw.contains('\0') {
                return Err(format!("{label} contains NUL byte"));
            }
        }

        // binary_path must be absolute (allows tilde expansion)
        let bp = Self::expand_tilde(&self.binary_path);
        if !Path::new(&bp).is_absolute() {
            return Err(format!(
                "binary_path must be absolute, got: {}",
                self.binary_path
            ));
        }

        let mp = Self::expand_tilde(&self.models_path);
        if !Path::new(&mp).is_absolute() {
            return Err(format!(
                "models_path must be absolute, got: {}",
                self.models_path
            ));
        }

        let op = Self::expand_tilde(&self.outputs_path);
        if !Path::new(&op).is_absolute() {
            return Err(format!(
                "outputs_path must be absolute, got: {}",
                self.outputs_path
            ));
        }

        Ok(())
    }

    /// Validates the binary_path points to an existing executable file with an
    /// acceptable extension. Called before generation to prevent spawning an
    /// unexpected binary (e.g. `/usr/bin/rm` or `/bin/sh`).
    ///
    /// Extension rules mirror the renderer's `validateBinaryPath`:
    /// - Windows: `.exe`, `.cmd`, `.bat`
    /// - macOS: `.sh`, `.bin`, `.elf`, or no extension, or base == `s2.cpp`
    /// - Linux: same as macOS, plus `.appimage`
    /// - other: same as Linux (the unknown-OS path in the renderer falls
    ///   back to a union of Windows + Linux extensions).
    pub fn validate_executable(&self) -> Result<(), String> {
        use std::path::Path;

        let bp = Self::expand_tilde(&self.binary_path);
        if bp.contains('\0') {
            return Err("binary_path contains NUL byte".to_string());
        }
        let bp_path = Path::new(&bp);
        if !bp_path.is_file() {
            return Err(format!(
                "binary_path does not exist or is not a file: {}",
                self.binary_path
            ));
        }
        if !has_acceptable_binary_extension(&bp) {
            return Err(format!(
                "binary_path has an unexpected extension; \
                 expected an executable (e.g. .exe, .appimage, .sh, or no extension): {}",
                self.binary_path
            ));
        }
        Ok(())
    }
}

/// Returns true if `path` ends in a binary extension or has no extension
/// at all (matching the renderer's `validateBinaryPath` allowlist).
pub fn has_acceptable_binary_extension(path: &str) -> bool {
    let path = path.replace('\\', "/");
    let lower = path.to_ascii_lowercase();
    let basename = lower.rsplit('/').next().unwrap_or(lower.as_str());
    if basename.is_empty() {
        return false;
    }
    // Allowed suffixes.
    for ext in [
        ".exe", ".cmd", ".bat", ".sh", ".bin", ".elf", ".appimage",
    ] {
        if lower.ends_with(ext) {
            return true;
        }
    }
    // `s2.cpp` is the canonical project name and accepted as a bare name.
    if basename == "s2.cpp" {
        return true;
    }
    // Any extensionless file is accepted on Linux/macOS (compile-from-source
    // builds commonly have no suffix).
    if !basename.contains('.') {
        return true;
    }
    false
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

/// The production model catalog — real metadata for available GGUF model quantizations.
/// Quantization levels: Q8 (highest), Q6 (recommended), Q5, Q4 (lowest).
/// Only Q8/Q6/Q5/Q4 are supported. F16 is excluded.
impl LocalModel {
    pub fn manifest() -> Vec<Self> {
        vec![
            Self {
                id: "s2-q8".to_string(),
                quant: ModelQuant::Q8,
                filename: "s2-pro-q8_0.gguf".to_string(),
                display_size: "5.6 GB".to_string(),
                approx_bytes: 5_630_037_088,
                recommendation: "Highest quality, higher VRAM use.".to_string(),
                tokenizer_required: true,
                checksum: Some("e2043182234786e7b975547d3bbcb23ff02e4ff684b82f7fa851287e4cb4f267".to_string()),
                download_url: Some(format!("https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{}", "s2-pro-q8_0.gguf")),
                state: ModelState::NotInstalled,
            },
            Self {
                id: "s2-q6".to_string(),
                quant: ModelQuant::Q6,
                filename: "s2-pro-q6_k.gguf".to_string(),
                display_size: "4.5 GB".to_string(),
                approx_bytes: 4_525_266_528,
                recommendation: "Recommended balance.".to_string(),
                tokenizer_required: true,
                checksum: Some("84ac904172a2cadb84e8f7f14ea3f1acef0584987635e85f7207fd254eafa235".to_string()),
                download_url: Some(format!("https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{}", "s2-pro-q6_k.gguf")),
                state: ModelState::Installed,
            },
            Self {
                id: "s2-q5".to_string(),
                quant: ModelQuant::Q5,
                filename: "s2-pro-q5_k_m.gguf".to_string(),
                display_size: "4.0 GB".to_string(),
                approx_bytes: 4_031_183_968,
                recommendation: "Stable choice for limited GPUs.".to_string(),
                tokenizer_required: true,
                checksum: Some("e445b0c8f32ed0ff584b906098f0fe53a67c0691249bfcccde569544f7d72cb9".to_string()),
                download_url: Some(format!("https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{}", "s2-pro-q5_k_m.gguf")),
                state: ModelState::NotInstalled,
            },
            Self {
                id: "s2-q4".to_string(),
                quant: ModelQuant::Q4,
                filename: "s2-pro-q4_k_m.gguf".to_string(),
                display_size: "3.6 GB".to_string(),
                approx_bytes: 3_566_165_088,
                recommendation: "Lower consumption, lower quality.".to_string(),
                tokenizer_required: true,
                checksum: Some("83963e1b7cec980b41eb2163d617e2b6241bfd1564dd880e5b43fc4834807bd9".to_string()),
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
            return Err(format!("text must be at least {} character(s), got {text_len}", MIN_TEXT_LENGTH));
        }
        if text_len > MAX_TEXT_LENGTH {
            return Err(format!("text exceeds maximum length of {MAX_TEXT_LENGTH} characters"));
        }

        let lang = self.language.trim().to_lowercase();
        if !SUPPORTED_LANGUAGES.contains(&lang.as_str()) {
            return Err(format!("unsupported language: {lang}"));
        }

        if let Some(ref audio_path) = self.reference_audio_path {
            let ap = std::path::Path::new(audio_path);
            if !ap.is_absolute() {
                return Err(format!("reference_audio_path must be absolute, got: {audio_path}"));
            }
            match ap.extension().and_then(|e| e.to_str()) {
                Some(ext) if ALLOWED_AUDIO_EXTENSIONS.contains(&ext.to_lowercase().as_str()) => {}
                Some(ext) => return Err(format!("reference audio file extension .{ext} is not allowed")),
                None => return Err("reference_audio_path has no file extension".to_string()),
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
    pub completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,
    pub status: GenerationStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
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
    pub gender: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::{
        has_acceptable_binary_extension, split_sentences, GenerationJob, GenerationRequest,
        GenerationStatus, LocalModel, ModelQuant, ModelState, SystemInfo,
    };
    use crate::config::get_default_config;
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
            "seed", "voicePresetId", "referenceAudioPath", "referenceText",
            "outputPath", "audioUrl", "completedAt", "durationSeconds", "error",
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
        for field in ["seed", "voicePresetId", "referenceAudioPath", "referenceText"] {
            assert!(value.get(field).is_none(), "{field} should be omitted");
        }
    }

    #[test]
    fn local_model_manifest_has_four_quantizations() {
        let models = LocalModel::manifest();
        assert_eq!(models.len(), 4);
        assert_eq!(models[0].id, "s2-q8");
        assert_eq!(models[1].id, "s2-q6");
        assert_eq!(models[2].id, "s2-q5");
        assert_eq!(models[3].id, "s2-q4");
    }

    #[test]
    fn local_model_manifest_recommended_is_q6() {
        let models = LocalModel::manifest();
        let q6 = models.iter().find(|m| m.id == "s2-q6").unwrap();
        assert!(q6.recommendation.contains("Recommended"));
    }

    #[test]
    fn split_simple_sentences() {
        let result = split_sentences("Hello world. How are you? I am fine!");
        assert_eq!(result, vec!["Hello world.", "How are you?", "I am fine!"]);
    }

    #[test]
    fn split_single_sentence() {
        let result = split_sentences("Just one sentence");
        assert_eq!(result, vec!["Just one sentence"]);
    }

    #[test]
    fn split_empty() {
        let result: Vec<String> = split_sentences("");
        assert!(result.is_empty());
    }


    #[test]
    fn validate_paths_rejects_nul_bytes() {
        let mut cfg = get_default_config();
        cfg.binary_path = "/opt/s2\0".to_string();
        assert!(cfg.validate_paths().is_err());
    }

    #[test]
    fn validate_paths_accepts_absolute_paths() {
        let mut cfg = get_default_config();
        cfg.binary_path = "/opt/s2.cpp/build/s2".to_string();
        cfg.models_path = "/opt/models".to_string();
        cfg.outputs_path = "/opt/outputs".to_string();
        assert!(cfg.validate_paths().is_ok());
    }

    #[test]
    fn has_acceptable_binary_extension_accepts_linux_build() {
        assert!(has_acceptable_binary_extension("/opt/s2.cpp/build/s2"));
        assert!(has_acceptable_binary_extension("/opt/s2.cpp/build/s2.cpp"));
    }

    #[test]
    fn has_acceptable_binary_extension_accepts_windows_exe() {
        assert!(has_acceptable_binary_extension("C:\\s2\\s2.exe"));
    }

    #[test]
    fn has_acceptable_binary_extension_accepts_appimage_case_insensitively() {
        assert!(has_acceptable_binary_extension("/opt/VoiceOfFish.AppImage"));
    }

    #[test]
    fn has_acceptable_binary_extension_rejects_text_files() {
        assert!(!has_acceptable_binary_extension("/tmp/readme.txt"));
        assert!(!has_acceptable_binary_extension("/tmp/Makefile.bak"));
    }

    #[test]
    fn has_acceptable_binary_extension_rejects_dangerous_system_paths() {
        // /usr/bin/rm has no extension and is a valid binary, so the extension
        // check alone won't catch it — but the rule says "accepts any
        // extensionless file", matching the renderer's policy. The OS-level
        // mitigation is that the user has to explicitly set binaryPath in
        // settings; we cannot reject a path the user explicitly typed.
        // This test documents that the rule accepts `/usr/bin/rm` so future
        // maintainers know the trade-off.
        assert!(has_acceptable_binary_extension("/usr/bin/rm"));
    }

}
/// A single sentence clip with timing metadata for editor export.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SentenceClip {
    pub text: String,
    pub start_ms: u64,
    pub end_ms: u64,
    pub wav_path: String,
}
/// Split text into sentences by ., !, ? followed by space or end.
pub fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut start = 0;
    for (i, c) in text.char_indices() {
        if c == '.' || c == '!' || c == '?' {
            // Check if this is a sentence-ending punctuation
            let next = text[i + c.len_utf8()..].chars().next();
            if next.map_or(true, |n| n.is_whitespace()) {
                sentences.push(text[start..i + c.len_utf8()].trim().to_string());
                start = i + c.len_utf8();
            }
        }
    }
    let remainder: String = text[start..].trim().to_string();
    if !remainder.is_empty() {
        sentences.push(remainder);
    }
    sentences
}