use crate::models::GenerationLogLine;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationCommandSpec {
    pub binary_path: String,
    pub args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
    pub output_path: String,
}

impl GenerationCommandSpec {
    pub fn redacted_display(&self) -> String {
        let mut parts = Vec::with_capacity(self.args.len() + 1);
        parts.push("<binary>".to_string());
        parts.extend(self.args.iter().map(|arg| {
            if is_path_like(arg) {
                "<path>".to_string()
            } else {
                arg.clone()
            }
        }));
        parts.join(" ")
    }
}

#[derive(Debug, Default)]
pub struct ProcessManager {
    pub active_job_id: Option<String>,
    pub log_lines: Vec<GenerationLogLine>,
}

impl ProcessManager {
    pub fn mock_with_logs() -> Self {
        Self {
            active_job_id: None,
            log_lines: GenerationLogLine::mock_lines(),
        }
    }
}

fn is_path_like(value: &str) -> bool {
    value.contains(":\\")
        || value.contains(":/")
        || value.starts_with('/')
        || value.starts_with("~/")
        || value.starts_with("./")
        || value.starts_with("../")
        || value.contains('\\')
}

#[cfg(test)]
mod tests {
    use super::{GenerationCommandSpec, ProcessManager};

    #[test]
    fn redacted_display_hides_path_args_and_binary_name() {
        let spec = GenerationCommandSpec {
            binary_path: "C:\\voice-of-fish\\bin\\engine.exe".to_string(),
            args: vec![
                "--model".to_string(),
                "C:\\voice-of-fish\\models\\s2-pro-q6_k.gguf".to_string(),
                "--text".to_string(),
                "hello fish".to_string(),
                "--out".to_string(),
                "/tmp/voice-of-fish/out.wav".to_string(),
            ],
            cwd: Some("C:\\voice-of-fish".to_string()),
            output_path: "C:\\voice-of-fish\\outputs\\out.wav".to_string(),
        };

        let display = spec.redacted_display();

        assert!(display.starts_with("<binary>"));
        assert!(display.contains("--model <path>"));
        assert!(display.contains("--out <path>"));
        assert!(display.contains("--text hello fish"));
        assert!(!display.contains("engine.exe"));
        assert!(!display.contains("s2-pro-q6_k.gguf"));
        assert!(!display.contains("/tmp/voice-of-fish/out.wav"));
    }

    #[test]
    fn default_process_manager_has_no_active_job() {
        assert_eq!(ProcessManager::default().active_job_id, None);
    }
}
