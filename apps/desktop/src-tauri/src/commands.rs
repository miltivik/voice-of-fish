use crate::config;
use crate::diagnostics;
use crate::downloads;
use crate::history;
use crate::models::{
    AppConfig, GenerationJob, GenerationLogLine, GenerationRequest, GenerationStatus,
    HistoryRecord, LocalModel, SystemInfo, VoicePreset,
};
use crate::presets;
use crate::process::ProcessManager;
use std::sync::Mutex;
use tauri::State;

#[tauri::command(rename_all = "camelCase")]
pub fn get_system_info(app: tauri::AppHandle) -> SystemInfo {
    diagnostics::get_real_system_info(&app)
}

#[tauri::command(rename_all = "camelCase")]
pub fn get_app_config(app: tauri::AppHandle) -> AppConfig {
    config::load_app_config(&app)
}

#[tauri::command(rename_all = "camelCase")]
pub fn save_app_config(
    config: AppConfig,
    app: tauri::AppHandle,
) -> Result<AppConfig, String> {
    config::save_app_config(&app, &config)
}

#[tauri::command(rename_all = "camelCase")]
pub fn list_local_models(app: tauri::AppHandle) -> Vec<LocalModel> {
    let cfg = config::load_app_config(&app);
    let models_path = std::path::Path::new(&cfg.models_path);
    downloads::list_local_models(models_path)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn download_model(
    model_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<LocalModel>, String> {
    // Offload the blocking HTTP download + checksum I/O to a worker thread.
    // Without spawn_blocking, this would freeze the entire UI for the duration
    // of the download because Tauri 2 runs synchronous commands on the main thread.
    let app_clone = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let cfg = config::load_app_config(&app_clone);
        let models_path = std::path::Path::new(&cfg.models_path);
        downloads::download_model_file(models_path, &model_id, Some(&app_clone))
    })
    .await
    .map_err(|e| format!("download task panicked: {e}"))?
}
#[tauri::command(rename_all = "camelCase")]
pub fn delete_model(
    model_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<LocalModel>, String> {
    let cfg = config::load_app_config(&app);
    let models_path = std::path::Path::new(&cfg.models_path);
    downloads::delete_model_file(models_path, &model_id)
}

#[tauri::command(rename_all = "camelCase")]
pub fn run_generation(
    request: GenerationRequest,
    process_manager: State<'_, Mutex<ProcessManager>>,
    app: tauri::AppHandle,
) -> Result<GenerationJob, String> {
    // Server-side request validation before touching filesystem or spawning.
    request.validate()?;

    let cfg = config::load_app_config(&app);

    // Validate persisted config before spawning.
    cfg.validate_paths()?;
    cfg.validate_executable()?;

    let models = downloads::list_local_models(std::path::Path::new(&cfg.models_path));
    let model = models
        .iter()
        .find(|m| m.id == request.model_id)
        .ok_or_else(|| format!("unknown model id: {}", request.model_id))?;

    if model.state != crate::models::ModelState::Installed {
        return Err(format!("model {} is not installed", request.model_id));
    }


    // Resolve voice preset → reference audio path + text if not already provided
    let mut resolved_request = request.clone();
    if resolved_request.voice_preset_id.is_some()
        && resolved_request.reference_audio_path.is_none()
    {
        let presets = presets::list_presets(&cfg.outputs_path);
        if let Some(preset) = presets
            .iter()
            .find(|p| Some(&p.id) == resolved_request.voice_preset_id.as_ref())
        {
            resolved_request.reference_audio_path = preset.reference_audio_path.clone();
            if resolved_request.reference_text.is_none() {
                resolved_request.reference_text = Some(preset.reference_text.clone());
            }
        }
    }
    let job_id = format!("job-{}", chrono::Utc::now().timestamp_millis());
    let spec = crate::process::GenerationCommandSpec::from_request(
        &resolved_request, &cfg, model, &job_id,
    );
    let mut manager = process_manager
        .lock()
        .map_err(|e| format!("process manager lock failed: {e}"))?;

    if manager.child.is_some() {
        return Err("a generation is already in progress".to_string());
    }

    let job = manager.spawn_generation(&spec, &resolved_request, &job_id)?;
    let record = history::record_from_job(&job);
    drop(manager);

    // Disk I/O outside the mutex — does not block cancel/log reads.
    let _ = history::append_history(&cfg.outputs_path, &record);
    Ok(job)
}
#[tauri::command(rename_all = "camelCase")]

pub fn cancel_generation(
    job_id: String,
    process_manager: State<'_, Mutex<ProcessManager>>,
) -> bool {
    // Extract the child from the manager, release the lock, then kill/wait.
    let child = {
        let mut manager = match process_manager.lock() {
            Ok(m) => m,
            Err(_) => return false,
        };
        if manager.active_job.as_ref().map(|j| &j.id) != Some(&job_id) {
            return false;
        }
        manager.child.take()
    };

    let Some(mut child) = child else {
        return false;
    };

    // Kill and wait outside the lock — prevents blocking log reads.
    let _ = child.kill();
    let _ = child.wait();

    // Re-acquire lock to finalize state.
    let mut manager = match process_manager.lock() {
        Ok(m) => m,
        Err(_) => return false,
    };
    manager.drain();
    manager.clear_log_channel();
    manager.join_finished_handles();
    if let Some(ref mut job) = manager.active_job {
        if !matches!(job.status, GenerationStatus::Completed | GenerationStatus::Failed) {
            job.status = GenerationStatus::Cancelled;
            job.completed_at =
                Some(chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true));
        }
    }
    true
}

#[tauri::command(rename_all = "camelCase")]
pub fn read_generation_logs(
    job_id: Option<String>,
    process_manager: State<'_, Mutex<ProcessManager>>,
) -> Vec<GenerationLogLine> {
    let mut manager = match process_manager.lock() {
        Ok(m) => m,
        Err(_) => return GenerationLogLine::mock_lines(),
    };

    manager.check_completion();

    if let Some(ref jid) = job_id {
        manager
            .log_lines
            .iter()
            .filter(|line| line.id.starts_with(jid))
            .cloned()
            .collect()
    } else {
        manager.log_lines.iter().cloned().collect()
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn open_output_folder(path: String) -> bool {
    if path.is_empty() {
        return false;
    }
    let Ok(canonical) = std::fs::canonicalize(&path) else {
        return false;
    };
    canonical.is_dir()
}

#[tauri::command(rename_all = "camelCase")]
pub fn check_binary_exists(binary_path: String) -> bool {
    if binary_path.is_empty() {
        return false;
    }

    // Try canonical path first, fall back to raw path.
    let path_to_check = match std::fs::canonicalize(&binary_path) {
        Ok(canonical) => canonical,
        Err(e) => {
            eprintln!(
                "[check_binary_exists] canonicalize failed for '{}': {e}",
                binary_path
            );
            // Fall back to checking the raw path directly.
            std::path::PathBuf::from(&binary_path)
        }
    };

    if !path_to_check.is_file() {
        eprintln!(
            "[check_binary_exists] not a file: '{}'",
            path_to_check.display()
        );
        return false;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        match std::fs::metadata(&path_to_check) {
            Ok(metadata) => {
                let has_exec = metadata.permissions().mode() & 0o111 != 0;
                if !has_exec {
                    eprintln!(
                        "[check_binary_exists] no execute permission: '{}'",
                        path_to_check.display()
                    );
                }
                has_exec
            }
            Err(e) => {
                eprintln!(
                    "[check_binary_exists] metadata failed for '{}': {e}",
                    path_to_check.display()
                );
                false
            }
        }
    }

    #[cfg(not(unix))]
    {
        true
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn check_file_exists(file_path: String) -> bool {
    if file_path.is_empty() {
        return false;
    }
    let Ok(canonical) = std::fs::canonicalize(&file_path) else {
        return false;
    };
    canonical.is_file()
}

#[tauri::command(rename_all = "camelCase")]
pub fn check_directory_exists(dir_path: String) -> bool {
    if dir_path.is_empty() {
        return false;
    }
    let Ok(canonical) = std::fs::canonicalize(&dir_path) else {
        return false;
    };
    canonical.is_dir()
}




#[tauri::command(rename_all = "camelCase")]
pub async fn pick_folder(_title: Option<String>, app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .pick_folder(move |result| {
            let _ = tx.send(result);
        });
    rx.await
        .ok()
        .flatten()
        .and_then(|p| p.as_path().map(|path| path.to_string_lossy().to_string()))
}

// --- History commands ---

#[tauri::command(rename_all = "camelCase")]
pub fn list_generation_history(
    limit: Option<usize>,
    app: tauri::AppHandle,
) -> Vec<HistoryRecord> {
    let cfg = config::load_app_config(&app);
    history::list_history(&cfg.outputs_path, limit)
}

// --- Voice preset commands ---

#[tauri::command(rename_all = "camelCase")]
pub fn list_voice_presets(app: tauri::AppHandle) -> Vec<VoicePreset> {
    let cfg = config::load_app_config(&app);
    presets::list_presets(&cfg.outputs_path)
}

#[tauri::command(rename_all = "camelCase")]
pub fn save_voice_preset(
    preset: VoicePreset,
    app: tauri::AppHandle,
) -> Result<VoicePreset, String> {
    let cfg = config::load_app_config(&app);
    presets::save_preset(&cfg.outputs_path, &preset)
}

#[tauri::command(rename_all = "camelCase")]
pub fn delete_voice_preset(
    id: String,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let cfg = config::load_app_config(&app);
    presets::delete_preset(&cfg.outputs_path, &id)
}

/// Export editor clips, SRT, and DaVinci import script to a folder.
#[tauri::command(rename_all = "camelCase")]
pub fn export_editor_bundle(
    clips: Vec<crate::models::SentenceClip>,
    target_dir: String,
) -> Result<String, String> {
    use std::io::Write;
    let target = std::path::Path::new(&target_dir);
    std::fs::create_dir_all(target)
        .map_err(|e| format!("failed to create export folder: {e}"))?;

    let mut count = 0u32;

    // Copy WAV files
    for clip in &clips {
        let src = std::path::Path::new(&clip.wav_path);
        if src.is_file() {
            let dest_name = src.file_name().unwrap_or_default();
            let dest = target.join(dest_name);
            std::fs::copy(src, &dest)
                .map_err(|e| format!("failed to copy {}: {e}", clip.wav_path))?;
            count += 1;
        }
    }

    // Generate SRT
    let srt_path = target.join("subtitles.srt");
    let mut srt = std::fs::File::create(&srt_path)
        .map_err(|e| format!("failed to create SRT: {e}"))?;
    for (i, clip) in clips.iter().enumerate() {
        let start = format_srt_time(clip.start_ms);
        let end = format_srt_time(clip.end_ms);
        let text = split_subtitle_lines(&clip.text, 42);
        writeln!(srt, "{start} --> {end}").map_err(|e| format!("write error: {e}"))?;
        writeln!(srt, "{text}").map_err(|e| format!("write error: {e}"))?;
    }

    // Copy resolve_import.py from Tauri resource
    let script_src = std::path::Path::new("resolve_import.py");
    if script_src.is_file() {
        std::fs::copy(script_src, target.join("resolve_import.py"))
            .map_err(|e| format!("failed to copy script: {e}"))?;
    }

    Ok(format!("Exported {} clip(s) to {}", count, target_dir))
}

fn split_subtitle_lines(text: &str, max_line: usize) -> String {
    let text = text.trim();
    if text.len() <= max_line {
        return text.to_string();
    }

    // Find split point near max_line at a word boundary
    let mut split_at = max_line;
    while split_at > 0 && !text.as_bytes().get(split_at).map_or(true, |&b| b == b' ') {
        split_at -= 1;
    }

    // If no space found, fall back to hard split
    if split_at == 0 {
        split_at = max_line;
    }

    let first = text[..split_at].trim();
    let second = text[split_at..].trim();

    // If second line still too long, truncate with ellipsis
    let second = if second.len() > max_line {
        let mut trunc = second[..max_line].to_string();
        trunc.push_str("…");
        trunc
    } else {
        second.to_string()
    };

    format!("{first}\n{second}")
}

fn format_srt_time(ms: u64) -> String {
    let h = ms / 3_600_000;
    let m = (ms % 3_600_000) / 60_000;
    let s = (ms % 60_000) / 1000;
    let millis = ms % 1000;
    format!("{:02}:{:02}:{:02},{:03}", h, m, s, millis)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_binary_exists_empty_string() {
    }

    #[test]
    fn check_binary_exists_nonexistent_path() {
        assert!(!check_binary_exists("/nonexistent/path/should/fail.exe".to_string()));
    }

    #[test]
    fn check_binary_exists_temp_file() {
        use std::io::Write;
        let temp_dir = std::env::temp_dir();
        let temp_file_path = temp_dir.join("vof_test_binary_check.txt");
        let mut file = std::fs::File::create(&temp_file_path).unwrap();
        use std::os::unix::fs::PermissionsExt;
        // Set executable bits so check_binary_exists passes on unix
        let mut perms = file.metadata().unwrap().permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&temp_file_path, perms).unwrap();
        write!(file, "test").unwrap();

        let path_str = temp_file_path.to_string_lossy().to_string();
        assert!(check_binary_exists(path_str.clone()));

        std::fs::remove_file(&temp_file_path).ok();
    }

    #[test]
    #[cfg(unix)]
    fn check_binary_exists_rejects_non_executable() {
        use std::io::Write;
        let temp_dir = std::env::temp_dir();
        let temp_file_path = temp_dir.join("vof_test_noexec");
        let mut file = std::fs::File::create(&temp_file_path).unwrap();
        write!(file, "not executable").unwrap();

        let path_str = temp_file_path.to_string_lossy().to_string();
        // File exists but has no exec bits → should fail on unix
        assert!(!check_binary_exists(path_str));

        std::fs::remove_file(&temp_file_path).ok();
    }

    #[test]
    #[cfg(unix)]
    fn check_binary_exists_accepts_executable() {
        use std::io::Write;
        use std::os::unix::fs::PermissionsExt;
        let temp_dir = std::env::temp_dir();
        let temp_file_path = temp_dir.join("vof_test_exec");
        let mut file = std::fs::File::create(&temp_file_path).unwrap();
        write!(file, "executable").unwrap();

        // Set executable bits
        let mut perms = file.metadata().unwrap().permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&temp_file_path, perms).unwrap();

        let path_str = temp_file_path.to_string_lossy().to_string();
        assert!(check_binary_exists(path_str));

        std::fs::remove_file(&temp_file_path).ok();
    }

    #[test]
    fn check_file_exists_valid_temp_file() {
        use std::io::Write;
        let temp_dir = std::env::temp_dir();
        let temp_file_path = temp_dir.join("vof_test_file_check.txt");
        let mut file = std::fs::File::create(&temp_file_path).unwrap();
        write!(file, "test").unwrap();

        let path_str = temp_file_path.to_string_lossy().to_string();
        assert!(check_file_exists(path_str.clone()));

        std::fs::remove_file(&temp_file_path).ok();
    }

    #[test]
    fn check_directory_exists_valid_temp_dir() {
        let temp_dir = std::env::temp_dir();
        let test_dir = temp_dir.join("vof_test_dir_check");
        std::fs::create_dir_all(&test_dir).ok();

        let path_str = test_dir.to_string_lossy().to_string();
        assert!(check_directory_exists(path_str.clone()));

        std::fs::remove_dir(&test_dir).ok();
    }

    #[test]
    fn check_directory_exists_empty_string() {
        assert!(!check_directory_exists("".to_string()));
    }

    #[test]
    fn open_output_folder_empty_string() {
        assert!(!open_output_folder("".to_string()));
    }

    #[test]
    fn open_output_folder_nonexistent_path() {
        assert!(!open_output_folder("/nonexistent/folder/should/fail".to_string()));
    }

    #[test]
    fn open_output_folder_temp_dir() {
        let temp_dir = std::env::temp_dir();
        let test_dir = temp_dir.join("vof_test_folder_check");
        std::fs::create_dir_all(&test_dir).ok();

        let path_str = test_dir.to_string_lossy().to_string();
        assert!(open_output_folder(path_str.clone()));

        std::fs::remove_dir(&test_dir).ok();
    }
}
#[cfg(test)]
mod export_tests {
    use super::*;
    use crate::models::SentenceClip;
    use std::io::Read;

    #[test]
    fn format_srt_time_midnight() {
        assert_eq!(format_srt_time(0), "00:00:00,000");
    }

    #[test]
    fn format_srt_time_milliseconds() {
        assert_eq!(format_srt_time(1500), "00:00:01,500");
    }

    #[test]
    fn format_srt_time_seconds() {
        assert_eq!(format_srt_time(65000), "00:01:05,000");
    }

    #[test]
    fn format_srt_time_hour() {
        assert_eq!(format_srt_time(3_725_000), "01:02:05,000");
    }

    #[test]
    fn export_creates_srt_and_copies_wavs() {
        let temp_dir = std::env::temp_dir().join("vof_export_test");
        let clips_dir = std::env::temp_dir().join("vof_clips_test");
        std::fs::create_dir_all(&clips_dir).ok();

        // Create mock WAV files (valid RIFF headers)
        for i in 0..2 {
            let mut wav = Vec::new();
            wav.extend(b"RIFF");
            wav.extend(&44u32.to_le_bytes()); // file size
            wav.extend(b"WAVE");
            wav.extend(b"fmt ");
            wav.extend(&16u32.to_le_bytes());
            wav.extend(&1u16.to_le_bytes()); // PCM
            wav.extend(&1u16.to_le_bytes()); // mono
            wav.extend(&44100u32.to_le_bytes());
            wav.extend(&176400u32.to_le_bytes());
            wav.extend(&4u16.to_le_bytes());
            wav.extend(&32u16.to_le_bytes());
            wav.extend(b"data");
            wav.extend(&0u32.to_le_bytes());
            std::fs::write(clips_dir.join(format!("clip_{i}.wav")), &wav).ok();
        }

        let clips = vec![
            SentenceClip {
                text: "Hello.".to_string(),
                start_ms: 0,
                end_ms: 1500,
                wav_path: clips_dir.join("clip_0.wav").to_string_lossy().to_string(),
            },
            SentenceClip {
                text: "World!".to_string(),
                start_ms: 1500,
                end_ms: 3000,
                wav_path: clips_dir.join("clip_1.wav").to_string_lossy().to_string(),
            },
        ];

        let result = export_editor_bundle(clips, temp_dir.to_string_lossy().to_string());
        assert!(result.is_ok(), "export failed: {:?}", result.err());

        // Verify SRT content
        let srt_path = temp_dir.join("subtitles.srt");
        assert!(srt_path.exists());
        let mut srt_content = String::new();
        std::fs::File::open(&srt_path)
            .unwrap()
            .read_to_string(&mut srt_content)
            .ok();
        assert!(srt_content.contains("00:00:00,000 --> 00:00:01,500"));
        assert!(srt_content.contains("00:00:01,500 --> 00:00:03,000"));
        assert!(srt_content.contains("Hello."));
        assert!(srt_content.contains("World!"));

        // Verify WAV copies
        assert!(temp_dir.join("clip_0.wav").exists());
        assert!(temp_dir.join("clip_1.wav").exists());

        // Cleanup
        std::fs::remove_dir_all(&temp_dir).ok();
        std::fs::remove_dir_all(&clips_dir).ok();
    }
}
fn wav_duration_ms(path: &std::path::Path) -> Result<u64, String> {
    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("failed to open WAV: {e}"))?;
    use std::io::Read;
    let mut header = [0u8; 44];
    file.read_exact(&mut header)
        .map_err(|e| format!("failed to read WAV header: {e}"))?;
    let byte_rate = u32::from_le_bytes([header[28], header[29], header[30], header[31]]);
    let data_size = u32::from_le_bytes([header[40], header[41], header[42], header[43]]);

    if byte_rate == 0 {
        return Err("WAV byte rate is zero".to_string());
    }

    let duration_secs = data_size as f64 / byte_rate as f64;
    Ok((duration_secs * 1000.0) as u64)
}

/// Generate audio for each sentence in the input text, returning clips with
/// cumulative timestamps suitable for SRT/subtitle export.
#[tauri::command(rename_all = "camelCase")]
pub fn generate_sentences(
    text: String,
    language: String,
    model_id: String,
    voice_preset_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<Vec<crate::models::SentenceClip>, String> {
    let cfg = config::load_app_config(&app);
    cfg.validate_executable()?;

    let models = downloads::list_local_models(std::path::Path::new(&cfg.models_path));
    let model = models
        .iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("unknown model id: {model_id}"))?;

    if model.state != crate::models::ModelState::Installed {
        return Err(format!("model {model_id} is not installed"));
    }

    // Resolve voice preset → prompt-audio + prompt-text
    let (prompt_audio, prompt_text) = if let Some(ref preset_id) = voice_preset_id {
        let presets = presets::list_presets(&cfg.outputs_path);
        presets
            .iter()
            .find(|p| p.id == *preset_id)
            .map(|p| (p.reference_audio_path.clone(), Some(p.reference_text.clone())))
            .unwrap_or((None, None))
    } else {
        (None, None)
    };

    let sentences = crate::models::split_sentences(&text);
    if sentences.is_empty() {
        return Err("no sentences found in input text".to_string());
    }

    let outputs_dir = std::path::Path::new(&cfg.outputs_path);
    let model_path = std::path::Path::new(&cfg.models_path).join(&model.filename);
    let mut clips = Vec::with_capacity(sentences.len());
    let mut elapsed_ms: u64 = 0;

    for (i, sentence) in sentences.iter().enumerate() {
        let output_path = outputs_dir.join(format!("clip_{i}.wav"));

        let mut cmd = std::process::Command::new(&cfg.binary_path);
        cmd.arg("--model")
            .arg(model_path.to_string_lossy().to_string())
            .arg("--text")
            .arg(sentence.as_str())
            .arg("--lang")
            .arg(&language)
            .arg("--out")
            .arg(output_path.to_string_lossy().to_string())
            .arg("--threads")
            .arg(cfg.cpu_threads.to_string())
            .arg("--log-level")
            .arg("error");
        if let Some(ref audio) = prompt_audio {
            cmd.arg("--prompt-audio").arg(audio);
        }
        if let Some(ref text) = prompt_text {
            cmd.arg("--prompt-text").arg(text);
        }

        let mut child = cmd
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("failed to spawn engine for sentence {i}: {e}"))?;

        let status = child
            .wait()
            .map_err(|e| format!("engine crashed for sentence {i}: {e}"))?;

        if !status.success() {
            return Err(format!(
                "engine exited with code {} for sentence {}",
                status.code().unwrap_or(-1),
                i
            ));
        }

        let duration_ms = wav_duration_ms(&output_path)?;

        clips.push(crate::models::SentenceClip {
            text: sentence.clone(),
            start_ms: elapsed_ms,
            end_ms: elapsed_ms + duration_ms,
            wav_path: output_path.to_string_lossy().to_string(),
        });

        elapsed_ms += duration_ms;
    }

    Ok(clips)
}