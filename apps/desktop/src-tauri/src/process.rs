use crate::models::{
    GenerationJob, GenerationLogLine, GenerationRequest, GenerationStatus, LocalModel,
    LogStream,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::sync::{mpsc, LazyLock};

const MAX_LOG_LINES: usize = 5000;
/// Capacity of the bounded log channel. Backpressure from this limit prevents
/// unbounded memory growth when the UI polls logs slowly.
const LOG_CHANNEL_CAP: usize = 4096;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationCommandSpec {
    pub binary_path: PathBuf,
    pub args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<PathBuf>,
    pub output_path: PathBuf,
}

impl GenerationCommandSpec {
    pub fn from_request(
        request: &GenerationRequest,
        config: &crate::models::AppConfig,
        model: &LocalModel,
        job_id: &str,
    ) -> Self {
        let models_path = Path::new(&config.models_path);
        let outputs_path = Path::new(&config.outputs_path);
        let model_path = models_path.join(&model.filename);
        let tokenizer_path = models_path.join("tokenizer.json");
        let output_path = outputs_path.join(format!("{job_id}.wav"));
        let mut args: Vec<String> = vec![
            "--model".to_string(),
            model_path.to_string_lossy().to_string(),
            "--tokenizer".to_string(),
            tokenizer_path.to_string_lossy().to_string(),
            "--text".to_string(),
            request.text.clone(),
            "--output".to_string(),
            output_path.to_string_lossy().to_string(),
            "--threads".to_string(),
            config.cpu_threads.to_string(),
            "--normalize".to_string(),
            "--trim-silence".to_string(),
        ];
        if !config.gpu_enabled {
            args.push("-v".to_string());
            args.push("-1".to_string());
        }
        if let Some(ref ap) = request.reference_audio_path {
            args.push("--prompt-audio".to_string());
            args.push(ap.clone());
        }
        if let Some(ref rt) = request.reference_text {
            args.push("--prompt-text".to_string());
            args.push(rt.clone());
        }
        Self { binary_path: PathBuf::from(&config.binary_path), args, cwd: None, output_path }
    }

    pub fn redacted_display(&self) -> String {
        let mut parts = Vec::with_capacity(self.args.len() + 1);
        parts.push("<binary>".to_string());
        let mut i = 0;
        while i < self.args.len() {
            let arg = &self.args[i];
            if is_path_like(arg) {
                parts.push("<path>".to_string());
            } else if i > 0 && matches!(self.args[i - 1].as_str(), "--text" | "--prompt-text") {
                parts.push("<redacted>".to_string());
            } else {
                parts.push(arg.clone());
            }
            i += 1;
        }
        parts.join(" ")
    }
}

fn is_path_like(v: &str) -> bool {
    v.contains('\\') || v.contains(":/") || v.starts_with('/')
        || v.starts_with("~/") || v.starts_with("./") || v.starts_with("../")
}

static ANSI_RE: LazyLock<regex_lite::Regex> =
    LazyLock::new(|| regex_lite::Regex::new("\x1b\\[[0-9;]*[a-zA-Z]").unwrap());

pub fn sanitize_log_message(raw: &str) -> String {
    let cleaned = ANSI_RE.replace_all(raw, "").to_string();
    if cleaned.len() > 4096 {
        let mut boundary = 4090;
        while boundary > 0 && !cleaned.is_char_boundary(boundary) {
            boundary -= 1;
        }
        let mut t = cleaned[..boundary].to_string();
        t.push_str("...");
        t
    } else {
        cleaned
    }
}

pub struct ProcessManager {
    pub child: Option<std::process::Child>,
    pub active_job: Option<GenerationJob>,
    pub started_at: Option<chrono::DateTime<Utc>>,
    pub log_lines: VecDeque<GenerationLogLine>,
    log_rx: Option<mpsc::Receiver<GenerationLogLine>>,
    handles: Vec<std::thread::JoinHandle<()>>,
}

impl Drop for ProcessManager {
    fn drop(&mut self) {
        if let Some(ref mut child) = self.child {
            let _ = child.kill();
            let _ = child.wait();
        }
        for h in self.handles.drain(..) {
            let _ = h.join();
        }
    }
}

impl Default for ProcessManager {
    fn default() -> Self {
        Self {
            child: None,
            active_job: None,
            started_at: None,
            log_lines: VecDeque::new(),
            log_rx: None,
            handles: Vec::new(),
        }
    }
}

impl ProcessManager {
    pub fn spawn_generation(
        &mut self, spec: &GenerationCommandSpec, request: &GenerationRequest, job_id: &str,
    ) -> Result<GenerationJob, String> {
        use std::process::{Command, Stdio};

        let mut cmd = Command::new(&spec.binary_path);
        cmd.args(&spec.args).stdout(Stdio::piped()).stderr(Stdio::piped());
        if let Some(ref cwd) = spec.cwd { cmd.current_dir(cwd); }

        let mut child = cmd.spawn().map_err(|e| format!("failed to spawn engine: {e}"))?;

        // Bounded channel — backpressure if the UI stops polling logs.
        let (tx, rx) = mpsc::sync_channel::<GenerationLogLine>(LOG_CHANNEL_CAP);
        let tx_out = tx.clone();
        let tx_err = tx;
        let jid_out = job_id.to_string();
        let jid_err = job_id.to_string();

        if let Some(stdout) = child.stdout.take() {
            let mut seq = 0u64;
            self.handles.push(std::thread::spawn(move || {
                for line in BufReader::new(stdout).lines().flatten() {
                    let _ = tx_out.send(GenerationLogLine {
                        id: format!("{}-stdout-{}", jid_out, seq),
                        stream: LogStream::Stdout,
                        message: sanitize_log_message(&line),
                        created_at: Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                    });
                    seq += 1;
                }
            }));
        }

        if let Some(stderr) = child.stderr.take() {
            let mut seq = 0u64;
            self.handles.push(std::thread::spawn(move || {
                for line in BufReader::new(stderr).lines().flatten() {
                    let _ = tx_err.send(GenerationLogLine {
                        id: format!("{}-stderr-{}", jid_err, seq),
                        stream: LogStream::Stderr,
                        message: sanitize_log_message(&line),
                        created_at: Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                    });
                    seq += 1;
                }
            }));
        }

        let now = Utc::now();
        let now_str = now.to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

        let job = GenerationJob {
            text: request.text.clone(),
            language: request.language.clone(),
            model_id: request.model_id.clone(),
            seed: request.seed,
            voice_preset_id: request.voice_preset_id.clone(),
            reference_audio_path: request.reference_audio_path.clone(),
            reference_text: request.reference_text.clone(),
            id: job_id.to_string(),
            status: GenerationStatus::Generating,
            output_path: Some(spec.output_path.to_string_lossy().to_string()),
            audio_url: None,
            created_at: now_str.clone(),
            completed_at: None,
            duration_seconds: None,
            error: None,
        };

        self.child = Some(child);
        self.active_job = Some(job.clone());
        self.started_at = Some(now);
        self.log_lines = VecDeque::new();
        self.log_lines.push_back(GenerationLogLine {
            id: format!("{job_id}-system-0"),
            stream: LogStream::System,
            message: spec.redacted_display(),
            created_at: now_str,
        });
        self.log_rx = Some(rx);

        Ok(job)
    }

    /// Drops the log channel receiver, stopping sender backpressure.
    /// Use when finalizing or cancelling a job.
    pub fn clear_log_channel(&mut self) {
        self.log_rx = None;
    }

    /// Drains the log channel into `log_lines`, trimming to MAX_LOG_LINES.
    pub fn drain(&mut self) {
        if let Some(ref rx) = self.log_rx {
            while let Ok(line) = rx.try_recv() {
                while self.log_lines.len() >= MAX_LOG_LINES {
                    self.log_lines.pop_front();
                }
                self.log_lines.push_back(line);
            }
        }
    }

    /// Joins finished reader threads, freeing their resources.
    /// Threads that are still running are left in `handles`.
    pub fn join_finished_handles(&mut self) {
        let mut i = 0;
        while i < self.handles.len() {
            if self.handles[i].is_finished() {
                let h = self.handles.swap_remove(i);
                let _ = h.join();
            } else {
                i += 1;
            }
        }
    }

    fn finish(&mut self, status: Option<std::process::ExitStatus>) {
        self.drain();
        self.join_finished_handles();
        let ts = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        if let Some(ref mut job) = self.active_job {
            job.completed_at = Some(ts);
            if let Some(ref st) = self.started_at {
                job.duration_seconds =
                    Some((Utc::now() - *st).num_milliseconds() as f64 / 1000.0);
            }
            match status {
                Some(s) if s.success() => job.status = GenerationStatus::Completed,
                Some(s) => {
                    job.status = GenerationStatus::Failed;
                    job.error = Some(format!("exit code {}", s.code().unwrap_or(-1)));
                }
                None => {
                    job.status = GenerationStatus::Failed;
                    job.error = Some("terminated".into());
                }
            }
        }
    }

    /// Cancels the active job. Kills the child, drains final logs, joins handles.
    /// The caller SHOULD extract the child, kill/wait outside the mutex, then
    /// re-acquire the lock and call this to finalize state.
    pub fn cancel_active(&mut self) -> bool {
        self.drain();
        if let Some(ref mut child) = self.child {
            let _ = child.kill();
            let _ = child.wait();
            self.child = None;
            self.drain();
            self.join_finished_handles();
            self.log_rx = None;
            if let Some(ref mut job) = self.active_job {
                if !matches!(job.status, GenerationStatus::Completed | GenerationStatus::Failed) {
                    job.status = GenerationStatus::Cancelled;
                    job.completed_at =
                        Some(Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true));
                }
            }
            true
        } else {
            false
        }
    }

    pub fn check_completion(&mut self) -> bool {
        self.drain();
        if let Some(ref mut child) = self.child {
            match child.try_wait() {
                Ok(Some(status)) => {
                    self.child = None;
                    self.finish(Some(status));
                    true
                }
                Ok(None) => false,
                Err(_) => false,
            }
        } else {
            true
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AppConfig, AppMode, AudioFormat, LocalModel, ModelQuant, ModelState};

    #[test]
    fn sanitize_removes_ansi() {
        assert_eq!(sanitize_log_message("\x1b[31mErr\x1b[0m"), "Err");
    }

    #[test]
    fn sanitize_truncates() {
        let o = sanitize_log_message(&"x".repeat(5000));
        assert!(o.len() <= 4093 && o.ends_with("..."));
    }

    #[test]
    fn sanitize_multibyte_safe() {
        let o = sanitize_log_message(&format!("{}魚x", "a".repeat(4200)));
        assert!(o.ends_with("..."));
    }

    #[test]
    fn redacted_no_leak_text() {
        let s = GenerationCommandSpec {
            binary_path: "/b".into(),
            args: vec!["--text".into(), "sec".into()],
            cwd: None,
            output_path: "/o".into(),
        };
        assert!(!s.redacted_display().contains("sec"));
    }
    #[test]
    fn redacted_no_leak_prompt_text() {
        let s = GenerationCommandSpec {
            binary_path: "/b".into(),
            args: vec!["--prompt-text".into(), "sec".into()],
            cwd: None,
            output_path: "/o".into(),
        };
        assert!(!s.redacted_display().contains("sec"));
    }
    #[test]
    fn spec_maps_core_args() {
        let r = GenerationRequest {
            text: "hello world".into(),
            language: "en".into(),
            model_id: "s2".into(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: None,
            reference_text: None,
        };
        let c = AppConfig {
            mode: AppMode::Simple,
            binary_path: "/b".into(),
            models_path: "/m".into(),
            outputs_path: "/o".into(),
            default_model_id: "s2".into(),
            default_audio_format: AudioFormat::Wav,
            cpu_threads: 4,
            gpu_enabled: true,
            advanced_args: Default::default(),
        };
        let m = LocalModel {
            id: "s2".into(),
            quant: ModelQuant::Q6,
            filename: "model.gguf".into(),
            display_size: "1".into(),
            approx_bytes: 1,
            recommendation: "r".into(),
            tokenizer_required: true,
            checksum: None,
            download_url: None,
            state: ModelState::Installed,
        };
        let s = GenerationCommandSpec::from_request(&r, &c, &m, "j1");
        // Core required args
        assert!(s.args.contains(&"--model".to_string()));
        assert!(s.args.contains(&"--tokenizer".to_string()));
        assert!(s.args.contains(&"--text".to_string()));
        assert!(s.args.contains(&"hello world".to_string()));
        assert!(s.args.contains(&"--output".to_string()));
        assert!(s.args.contains(&"--threads".to_string()));
        assert!(s.args.contains(&"4".to_string()));
        assert!(s.args.contains(&"--normalize".to_string()));
        assert!(s.args.contains(&"--trim-silence".to_string()));
        // Tokenizer path derived from models_path
        assert!(s.args.contains(&"/m/tokenizer.json".to_string()));
        // Output path contains job_id
        assert!(s.output_path.to_string_lossy().contains("j1"));
    }
    #[test]
    fn spec_no_dead_flags() {
        let r = GenerationRequest {
            text: "hi".into(),
            language: "en".into(),
            model_id: "s2".into(),
            seed: Some(42),
            voice_preset_id: None,
            reference_audio_path: None,
            reference_text: None,
        };
        let c = AppConfig {
            mode: AppMode::Simple,
            binary_path: "/b".into(),
            models_path: "/m".into(),
            outputs_path: "/o".into(),
            default_model_id: "s2".into(),
            default_audio_format: AudioFormat::Wav,
            cpu_threads: 1,
            gpu_enabled: true,
            advanced_args: Default::default(),
        };
        let m = LocalModel {
            id: "s2".into(),
            quant: ModelQuant::Q6,
            filename: "f".into(),
            display_size: "1".into(),
            approx_bytes: 1,
            recommendation: "r".into(),
            tokenizer_required: false,
            checksum: None,
            download_url: None,
            state: ModelState::Installed,
        };
        let s = GenerationCommandSpec::from_request(&r, &c, &m, "j1");
        // These flags do not exist in the real s2 CLI
        assert!(!s.args.contains(&"--lang".to_string()));
        assert!(!s.args.contains(&"en".to_string()));
        assert!(!s.args.contains(&"--seed".to_string()));
        assert!(!s.args.contains(&"42".to_string()));
        assert!(!s.args.contains(&"--out".to_string()));
        assert!(!s.args.contains(&"--no-gpu".to_string()));
    }
    #[test]
    fn spec_gpu_disabled_uses_vulkan_cpu() {
        let r = GenerationRequest {
            text: "hi".into(),
            language: "en".into(),
            model_id: "s2".into(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: None,
            reference_text: None,
        };
        let c = AppConfig {
            mode: AppMode::Simple,
            binary_path: "/b".into(),
            models_path: "/m".into(),
            outputs_path: "/o".into(),
            default_model_id: "s2".into(),
            default_audio_format: AudioFormat::Wav,
            cpu_threads: 1,
            gpu_enabled: false,
            advanced_args: Default::default(),
        };
        let m = LocalModel {
            id: "s2".into(),
            quant: ModelQuant::Q6,
            filename: "f".into(),
            display_size: "1".into(),
            approx_bytes: 1,
            recommendation: "r".into(),
            tokenizer_required: false,
            checksum: None,
            download_url: None,
            state: ModelState::Installed,
        };
        let s = GenerationCommandSpec::from_request(&r, &c, &m, "j1");
        assert!(s.args.contains(&"-v".to_string()));
        assert!(s.args.contains(&"-1".to_string()));
    }
    #[test]
    fn spec_voice_cloning_args() {
        let r = GenerationRequest {
            text: "hi".into(),
            language: "en".into(),
            model_id: "s2".into(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: Some("/audio/ref.wav".into()),
            reference_text: Some("reference transcript".into()),
        };
        let c = AppConfig {
            mode: AppMode::Simple,
            binary_path: "/b".into(),
            models_path: "/m".into(),
            outputs_path: "/o".into(),
            default_model_id: "s2".into(),
            default_audio_format: AudioFormat::Wav,
            cpu_threads: 1,
            gpu_enabled: true,
            advanced_args: Default::default(),
        };
        let m = LocalModel {
            id: "s2".into(),
            quant: ModelQuant::Q6,
            filename: "f".into(),
            display_size: "1".into(),
            approx_bytes: 1,
            recommendation: "r".into(),
            tokenizer_required: false,
            checksum: None,
            download_url: None,
            state: ModelState::Installed,
        };
        let s = GenerationCommandSpec::from_request(&r, &c, &m, "j1");
        assert!(s.args.contains(&"--prompt-audio".to_string()));
        assert!(s.args.contains(&"/audio/ref.wav".to_string()));
        assert!(s.args.contains(&"--prompt-text".to_string()));
        assert!(s.args.contains(&"reference transcript".to_string()));
        // Old placeholder flags must be absent
        assert!(!s.args.contains(&"--ref-audio".to_string()));
        assert!(!s.args.contains(&"--ref-text".to_string()));
    }
    #[test]
    fn default_pm_idle() {
        let p = ProcessManager::default();
        assert!(p.child.is_none());
    }
    #[test]
    fn cancel_noop() {
        assert!(!ProcessManager::default().cancel_active());
    }
}
