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
        let outputs_path = Path::new(&config.outputs_path);
        let output_path = outputs_path.join(format!("{job_id}.wav"));
        Self::from_request_with_output_path(request, config, model, output_path)
    }
    pub fn from_request_with_output_path(
        request: &GenerationRequest,
        config: &crate::models::AppConfig,
        model: &LocalModel,
        output_path: PathBuf,
    ) -> Self {
        let models_path = Path::new(&config.models_path);
        let model_path = models_path.join(&model.filename);
        let tokenizer_path = models_path.join("tokenizer.json");
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
    log_file_path: Option<PathBuf>,
    pub pid_file_path: Option<PathBuf>,
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
            log_file_path: None,
            pid_file_path: None,
        }
    }
}

impl ProcessManager {
    pub fn spawn_generation(
        &mut self, spec: &GenerationCommandSpec, request: &GenerationRequest, job_id: &str,
        outputs_path: &str,
    ) -> Result<GenerationJob, String> {
        use std::process::{Command, Stdio};

        let mut cmd = Command::new(&spec.binary_path);
        cmd.args(&spec.args).stdout(Stdio::piped()).stderr(Stdio::piped());
        if let Some(ref cwd) = spec.cwd { cmd.current_dir(cwd); }

        let mut child = cmd.spawn().map_err(|e| format!("failed to spawn engine: {e}"))?;

        // Write PID file for crash recovery.
        let pid = child.id();
        let pids_dir = PathBuf::from(outputs_path).join(".voice-of-fish").join("pids");
        if let Err(e) = std::fs::create_dir_all(&pids_dir) {
            eprintln!("[ProcessManager] failed to create pids dir: {e}");
        } else {
            let pid_path = pids_dir.join(format!("{job_id}.pid"));
            if let Err(e) = std::fs::write(&pid_path, pid.to_string()) {
                eprintln!("[ProcessManager] failed to write PID file {}: {e}", pid_path.display());
            } else {
                self.pid_file_path = Some(pid_path);
            }
        }

        // Create log file for crash recovery (persist all log lines to disk).
        let logs_dir = PathBuf::from(outputs_path).join(".voice-of-fish").join("logs");
        if let Err(e) = std::fs::create_dir_all(&logs_dir) {
            eprintln!("[ProcessManager] failed to create logs dir: {e}");
        } else {
            let log_path = logs_dir.join(format!("{job_id}.log"));
            // Truncate any leftover log file from a previous run with the same job_id.
            let _ = std::fs::write(&log_path, "");
            self.log_file_path = Some(log_path);
        }

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
            audio_url: Some(format!("file://{}", spec.output_path.display())),
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
    /// Also persists each line to the on-disk log file for crash recovery.
    pub fn drain(&mut self) {
        if let Some(ref rx) = self.log_rx {
            while let Ok(line) = rx.try_recv() {
                self.persist_log_line(&line);
                while self.log_lines.len() >= MAX_LOG_LINES {
                    self.log_lines.pop_front();
                }
                self.log_lines.push_back(line);
            }
        }
    }

    /// Appends a single log line (as JSON) to the on-disk log file.
    /// No-op if no log file is configured.
    pub fn persist_log_line(&self, line: &GenerationLogLine) {
        if let Some(ref log_path) = self.log_file_path {
            if let Ok(json) = serde_json::to_string(line) {
                use std::io::Write;
                if let Ok(mut file) = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(log_path)
                {
                    let _ = writeln!(file, "{json}");
                }
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
        // Clean up PID file since the job ended normally.
        if let Some(ref pid_path) = self.pid_file_path.take() {
            let _ = std::fs::remove_file(pid_path);
        }
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
            // Clean up PID file since the job ended.
            if let Some(ref pid_path) = self.pid_file_path.take() {
                let _ = std::fs::remove_file(pid_path);
            }
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
                Err(e) => {
                    // try_wait can fail if the child process is in a bad state
                    // (e.g., already reaped by another call). Log and force-finish
                    // the job so it doesn't get stuck in "Generating" forever.
                    eprintln!(
                        "[ProcessManager] try_wait failed (possible \
                         double-wait or zombie process): {e}. Forcing completion."
                    );
                    self.child = None;
                    self.finish(None);
                    true
                }
            }
        } else {
            true
        }
    }
}


/// Scans the `.voice-of-fish/pids/` directory for leftover PID files from a
/// previous crash. For each PID that is no longer running, removes the PID file
/// and the corresponding partial output file.
pub fn reap_orphan_jobs(outputs_path: &str) {
    let pids_dir = PathBuf::from(outputs_path).join(".voice-of-fish").join("pids");
    let entries = match std::fs::read_dir(&pids_dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(true, |e| e != "pid") {
            continue;
        }

        let pid_str = match std::fs::read_to_string(&path) {
            Ok(s) => s.trim().to_string(),
            Err(_) => {
                let _ = std::fs::remove_file(&path);
                continue;
            }
        };

        let pid: u32 = match pid_str.parse() {
            Ok(p) => p,
            Err(_) => {
                let _ = std::fs::remove_file(&path);
                continue;
            }
        };

        if !is_process_alive(pid) {
            eprintln!(
                "[ProcessManager] reaping orphan job from PID file {} (pid {pid} not alive)",
                path.display()
            );
            // Remove the PID file.
            let _ = std::fs::remove_file(&path);
            // Remove partial output WAV if the job ID can be derived from the PID filename.
            let job_id = path.file_stem().unwrap_or_default().to_string_lossy();
            let output_file = PathBuf::from(outputs_path).join(format!("{}.wav", job_id));
            if output_file.exists() {
                let _ = std::fs::remove_file(&output_file);
            }
        }
    }
}

/// Returns true if a process with the given PID is alive.
#[cfg(unix)]
fn is_process_alive(pid: u32) -> bool {
    // kill(pid, 0) checks for existence without sending a signal.
    // On macOS, /bin/kill is available; on Linux we prefer /proc.
    if std::path::Path::new(&format!("/proc/{pid}")).exists() {
        return true;
    }
    std::process::Command::new("kill")
        .arg("-0")
        .arg(pid.to_string())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Returns true if a process with the given PID is alive (Windows).
#[cfg(windows)]
fn is_process_alive(pid: u32) -> bool {
    std::process::Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH"])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .output()
        .map(|o| {
            let output = String::from_utf8_lossy(&o.stdout);
            output.contains(&pid.to_string())
        })
        .unwrap_or(false)
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
        let c = AppConfig { mode: AppMode::Simple,
        binary_path: "/b".into(),
        models_path: "/m".into(),
        outputs_path: "/o".into(),
        default_model_id: "s2".into(),
        default_audio_format: AudioFormat::Wav,
        cpu_threads: 4,
        gpu_enabled: true, advanced_args: Default::default(), schema_version: 1, };
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
        let c = AppConfig { mode: AppMode::Simple,
        binary_path: "/b".into(),
        models_path: "/m".into(),
        outputs_path: "/o".into(),
        default_model_id: "s2".into(),
        default_audio_format: AudioFormat::Wav,
        cpu_threads: 1,
        gpu_enabled: true, advanced_args: Default::default(), schema_version: 1, };
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
        let c = AppConfig { mode: AppMode::Simple,
        binary_path: "/b".into(),
        models_path: "/m".into(),
        outputs_path: "/o".into(),
        default_model_id: "s2".into(),
        default_audio_format: AudioFormat::Wav,
        cpu_threads: 1,
        gpu_enabled: false, advanced_args: Default::default(), schema_version: 1, };
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
        let c = AppConfig { mode: AppMode::Simple,
        binary_path: "/b".into(),
        models_path: "/m".into(),
        outputs_path: "/o".into(),
        default_model_id: "s2".into(),
        default_audio_format: AudioFormat::Wav,
        cpu_threads: 1,
        gpu_enabled: true, advanced_args: Default::default(), schema_version: 1, };
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
    fn spec_with_output_path_uses_exact_output() {
        let r = GenerationRequest {
            text: "hello".into(),
            language: "en".into(),
            model_id: "s2".into(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: None,
            reference_text: None,
        };
        let c = AppConfig { mode: AppMode::Simple,
        binary_path: "/b".into(),
        models_path: "/m".into(),
        outputs_path: "/o".into(),
        default_model_id: "s2".into(),
        default_audio_format: AudioFormat::Wav,
        cpu_threads: 1,
        gpu_enabled: true, advanced_args: Default::default(), schema_version: 1, };
        let m = LocalModel {
            id: "s2".into(),
            quant: ModelQuant::Q6,
            filename: "model.gguf".into(),
            display_size: "1".into(),
            approx_bytes: 1,
            recommendation: "r".into(),
            tokenizer_required: false,
            checksum: None,
            download_url: None,
            state: ModelState::Installed,
        };
        let output_path = tempfile::TempDir::new().unwrap().path().join("custom-out.wav");
        let s = GenerationCommandSpec::from_request_with_output_path(&r, &c, &m, output_path.clone());
        assert_eq!(s.output_path, output_path);
        let output_idx = s.args.iter().position(|a| a == "--output").unwrap();
        assert_eq!(s.args[output_idx + 1], output_path.to_string_lossy().to_string());
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
    #[test]
    #[ignore]
    fn smoke_real_s2_outputs_wav_when_env_configured() {
        use std::path::PathBuf;
        let bin_path = std::env::var("VOF_S2_CPP_BIN")
            .expect("VOF_S2_CPP_BIN env var must be set for smoke test");
        let model_path = std::env::var("VOF_S2_MODEL")
            .expect("VOF_S2_MODEL env var must be set for smoke test");
        let test_text = std::env::var("VOF_S2_TEST_TEXT")
            .unwrap_or_else(|_| "Hello from Voice of Fish.".to_string());
        let model_path = PathBuf::from(&model_path);
        let models_path = model_path
            .parent()
            .expect("VOF_S2_MODEL must have a parent directory");
        let tokenizer_path = models_path.join("tokenizer.json");
        assert!(
            tokenizer_path.is_file(),
            "tokenizer.json must exist at {} for smoke test",
            tokenizer_path.display()
        );
        let outputs_dir = tempfile::TempDir::new().unwrap();
        let config = AppConfig { mode: AppMode::Simple,
        binary_path: bin_path,
        models_path: models_path.to_string_lossy().to_string(),
        outputs_path: outputs_dir.path().to_string_lossy().to_string(),
        default_model_id: "s2".into(),
        default_audio_format: AudioFormat::Wav,
        cpu_threads: 1,
        gpu_enabled: false, advanced_args: Default::default(), schema_version: 1, };
        let model = LocalModel {
            id: "s2".into(),
            quant: ModelQuant::Q6,
            filename: model_path.file_name().unwrap().to_string_lossy().to_string(),
            display_size: "1".into(),
            approx_bytes: 1,
            recommendation: "r".into(),
            tokenizer_required: true,
            checksum: None,
            download_url: None,
            state: ModelState::Installed,
        };
        let request = GenerationRequest {
            text: test_text,
            language: "en".into(),
            model_id: "s2".into(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: None,
            reference_text: None,
        };
        let output_path = outputs_dir.path().join("smoke.wav");
        let spec = GenerationCommandSpec::from_request_with_output_path(
            &request,
            &config,
            &model,
            output_path.clone(),
        );
        let status = std::process::Command::new(&spec.binary_path)
            .args(&spec.args)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .expect("failed to spawn s2.cpp");
        assert!(status.success(), "s2.cpp exited with: {:?}", status);
        assert!(
            output_path.is_file(),
            "expected output WAV at {}",
            output_path.display()
        );
        let bytes = std::fs::read(&output_path).expect("failed to read output WAV");
        assert!(bytes.len() >= 12, "WAV file too short: {} bytes", bytes.len());
        assert_eq!(&bytes[0..4], b"RIFF");
        assert_eq!(&bytes[8..12], b"WAVE");
    }
}
