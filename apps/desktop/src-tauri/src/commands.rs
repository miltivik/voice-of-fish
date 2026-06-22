use crate::built_in_voices;
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

/// Returns `Ok(())` if `job_id` is safe to use as a path component, or an
/// `Err` describing the rejection. The rule is deliberately tight: a job id
/// is server-generated (`job-{ms}`) and any other shape is a renderer-side
/// mistake or a hostile attempt to break out of a path with `..` or NUL.
pub fn validate_job_id(job_id: &str) -> Result<(), String> {
    if job_id.is_empty() {
        return Err("job_id is empty".to_string());
    }
    if job_id.len() > 64 {
        return Err("job_id exceeds 64 characters".to_string());
    }
    if !job_id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(format!(
            "job_id must match [A-Za-z0-9_-]+, got: {job_id:?}"
        ));
    }
    Ok(())
}

/// Returns `Ok(())` if `preset_id` is safe to persist as a JSON key in
/// `presets.json`, or an `Err` describing the rejection. Same shape as
/// `validate_job_id` but with a longer ceiling since voice preset ids
/// are user-visible (e.g. "dave-warm-narration"). A renderer-side XSS
/// cannot inject path traversal or NUL bytes through this entry point.
pub fn validate_preset_id(preset_id: &str) -> Result<(), String> {
    if preset_id.is_empty() {
        return Err("preset_id is empty".to_string());
    }
    if preset_id.len() > 128 {
        return Err("preset_id exceeds 128 characters".to_string());
    }
    if !preset_id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(format!(
            "preset_id must match [A-Za-z0-9_-]+, got: {preset_id:?}"
        ));
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn get_system_info(app: tauri::AppHandle) -> SystemInfo {
    diagnostics::get_real_system_info(&app)
}

#[tauri::command(rename_all = "camelCase")]
pub fn get_app_config(app: tauri::AppHandle) -> AppConfig {
    config::load_app_config(&app).unwrap_or_else(|_| config::get_default_config())
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
    let cfg = config::load_app_config(&app).unwrap_or_else(|_| config::get_default_config());
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
    tauri::async_runtime::spawn_blocking(move || -> Result<Vec<LocalModel>, String> {
        let cfg = config::load_app_config(&app_clone)?;
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
    let cfg = config::load_app_config(&app)?;
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

    let cfg = config::load_app_config(&app)?;

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


    // Resolve voice preset → reference audio path + text if not already provided.
    // The helper validates that reference_audio_path stays within outputs_path.
    let mut resolved_request = request.clone();
    if let Some(preset_id) = resolved_request.voice_preset_id.as_deref() {
        if resolved_request.reference_audio_path.is_none() {
            if let Some((audio_path, ref_text)) = presets::resolve_preset_reference(
                &cfg.outputs_path,
                preset_id,
            )? {
                resolved_request.reference_audio_path = Some(audio_path);
                if resolved_request.reference_text.is_none() {
                    resolved_request.reference_text = Some(ref_text);
                }
            }
        }
    }
    // Re-validate the final resolved path (whether from request or preset)
    // to close the gap where a persisted preset could have an out-of-scope path.
    if let Some(ref path) = resolved_request.reference_audio_path {
        crate::output_paths::validate_within_outputs(&cfg.outputs_path, path)?;
    }
    let job_id = format!("job-{}", chrono::Utc::now().timestamp_millis());
    // Tripwire: if a future refactor ever changes the job_id format, refuse
    // to start a generation whose id isn't safe to use as a path component.
    validate_job_id(&job_id)?;
    let spec = crate::process::GenerationCommandSpec::from_request(
        &resolved_request, &cfg, model, &job_id,
    );
    let mut manager = process_manager
        .lock()
        .map_err(|e| format!("process manager lock failed: {e}"))?;

    if manager.child.is_some() {
        return Err("a generation is already in progress".to_string());
    }

    let job = manager.spawn_generation(&spec, &resolved_request, &job_id, &cfg.outputs_path)?;
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
    // Reject renderer-supplied job_ids that aren't safe path components.
    if validate_job_id(&job_id).is_err() {
        return false;
    }
    // Extract the child from the manager, release the lock, then kill/wait.
    let child = {
        let mut manager = match process_manager.lock() {
            Ok(m) => m,
            Err(_) => return false,
        };
        if manager.active_job.as_ref().map(|j| &j.id) != Some(&job_id) {
            // Stale job_id (the active job has already finished, or the
            // renderer is racing a fresh spawn). Log so a silent `false`
            // is at least visible in dev. The TS caller can't tell
            // success from "nothing to cancel" with the current contract.
            eprintln!(
                "[cancel_generation] no matching active job for {job_id:?} \
                 (active={:?})",
                manager.active_job.as_ref().map(|j| &j.id)
            );
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
    // Clean up PID file since the job was cancelled.
    if let Some(ref pid_path) = manager.pid_file_path.take() {
        let _ = std::fs::remove_file(pid_path);
    }
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
pub fn get_active_job(
    process_manager: State<'_, Mutex<ProcessManager>>,
    app: tauri::AppHandle,
) -> Option<GenerationJob> {
    let mut manager = match process_manager.lock() {
        Ok(m) => m,
        Err(_) => return None,
    };
    manager.check_completion();
    let job = manager.active_job.clone();
    drop(manager);
    // If the job finished, persist the updated status to history.
    if let Some(ref job) = job {
        if matches!(job.status, GenerationStatus::Completed | GenerationStatus::Failed | GenerationStatus::Cancelled) {
            let cfg = config::load_app_config(&app).unwrap_or_else(|_| config::get_default_config());
            let record = history::record_from_job(job);
            let _ = history::update_history(&cfg.outputs_path, &record);
        }
    }
    job
}

#[tauri::command(rename_all = "camelCase")]
pub fn read_generation_logs(
    job_id: Option<String>,
    process_manager: State<'_, Mutex<ProcessManager>>,
    app: tauri::AppHandle,
) -> Vec<GenerationLogLine> {
    let mut manager = match process_manager.lock() {
        Ok(m) => m,
        Err(_) => return vec![],
    };

    manager.check_completion();

    if let Some(ref jid) = job_id {
        // Reject job_ids that aren't safe path components.
        if validate_job_id(jid).is_err() {
            return vec![];
        }
        let in_memory: Vec<GenerationLogLine> = manager
            .log_lines
            .iter()
            .filter(|line| line.id.starts_with(jid))
            .cloned()
            .collect();
        if !in_memory.is_empty() {
            return in_memory;
        }
        // After a restart, the in-memory buffer is empty — try the on-disk log file.
        let Ok(cfg) = config::load_app_config(&app) else {
            return in_memory;
        };
        let log_path = std::path::PathBuf::from(&cfg.outputs_path)
            .join(".voice-of-fish")
            .join("logs")
            .join(format!("{}.log", jid));
        if log_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&log_path) {
                let mut lines: Vec<GenerationLogLine> = content
                    .lines()
                    .filter_map(|l| serde_json::from_str::<GenerationLogLine>(l).ok())
                    .collect();
                lines.sort_by_key(|l| l.id.clone());
                return lines;
            }
        }
        in_memory
    } else {
        manager.log_lines.iter().cloned().collect()
    }
}

#[tauri::command(rename_all = "camelCase")]
pub fn open_output_folder(path: String, app: tauri::AppHandle) -> Result<(), String> {
    let cfg = config::load_validated_config(&app)?;
    crate::output_paths::open_output_folder(&cfg.outputs_path, &path)
}

#[tauri::command(rename_all = "camelCase")]
pub fn open_file_path(path: String, app: tauri::AppHandle) -> Result<(), String> {
    let cfg = config::load_validated_config(&app)?;
    crate::output_paths::open_file_path(&cfg.outputs_path, &path)
}

/// Returns the WAV bytes for a file inside `outputs_path`. Used by the renderer
/// to play generated audio without needing the `asset://` protocol.
#[tauri::command(rename_all = "camelCase")]
pub fn read_audio_bytes(path: String, app: tauri::AppHandle) -> Result<Vec<u8>, String> {
    let cfg = config::load_validated_config(&app)?;
    crate::audio_io::read_audio_bytes(&cfg.outputs_path, &path)
}

/// Imports a GGUF model file (e.g. from drag-and-drop) into `models_path`.
/// Validates the source path, the destination, and the file size before
/// copying. Returns the canonical destination path on success.
#[tauri::command(rename_all = "camelCase")]
pub fn import_model_file(
    source_path: String,
    file_name: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let cfg = config::load_validated_config(&app)?;
    let dest = crate::audio_io::import_model_file(&cfg.models_path, &source_path, &file_name)?;
    Ok(dest.to_string_lossy().to_string())
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
pub async fn pick_folder(title: Option<String>, app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    // Truncate the title to a reasonable bound — the native dialog truncates
    // safely but a multi-MB string still wastes cycles on the IPC bridge.
    let bounded_title = title
        .map(|t| t.chars().take(128).collect::<String>())
        .filter(|t: &String| !t.is_empty());
    let mut builder = app.dialog().file();
    if let Some(t) = bounded_title {
        builder = builder.set_title(t);
    }
    builder.pick_folder(move |result| {
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
    let cfg = config::load_app_config(&app).unwrap_or_else(|_| config::get_default_config());
    let mut records = history::list_history(&cfg.outputs_path, limit);
    let now = chrono::Utc::now();
    let cutoff = chrono::Duration::minutes(30);
    let mut modified = false;

    for record in &mut records {
        if record.status == GenerationStatus::Generating
            && record.completed_at.is_none()
        {
            if let Ok(created) = chrono::DateTime::parse_from_rfc3339(&record.created_at) {
                if now.signed_duration_since(created) > cutoff {
                    record.status = GenerationStatus::Failed;
                    record.error = Some("app restarted during generation".into());
                    modified = true;
                }
            }
        }
    }

    if modified {
        // Persist changes back to disk.
        for record in &records {
            if record.status == GenerationStatus::Failed
                && record.error.as_deref() == Some("app restarted during generation")
            {
                let _ = history::update_history(&cfg.outputs_path, record);
            }
        }
    }

    records
}

#[tauri::command(rename_all = "camelCase")]
pub fn delete_history_record(
    job_id: String,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    validate_job_id(&job_id)?;
    let cfg = config::load_app_config(&app).unwrap_or_else(|_| config::get_default_config());
    history::delete_history(&cfg.outputs_path, &job_id).map(|_| true)
}

#[tauri::command(rename_all = "camelCase")]
pub fn save_voice_preset(
    preset: VoicePreset,
    app: tauri::AppHandle,
) -> Result<VoicePreset, String> {
    let cfg = config::load_app_config(&app)?;
    validate_preset_id(&preset.id)?;
    presets::save_preset(&cfg.outputs_path, &preset)
}

#[tauri::command(rename_all = "camelCase")]
pub fn delete_voice_preset(
    id: String,
    app: tauri::AppHandle,
) -> Result<bool, String> {
    let cfg = config::load_app_config(&app)?;
    validate_preset_id(&id)?;
    presets::delete_preset(&cfg.outputs_path, &id)
}

#[tauri::command(rename_all = "camelCase")]
pub fn clear_history(app: tauri::AppHandle) -> Result<bool, String> {
    let cfg = config::load_app_config(&app).unwrap_or_else(|_| config::get_default_config());
    history::clear_all_history(&cfg.outputs_path).map(|_| true)
}

// --- Voice preset commands ---

#[tauri::command(rename_all = "camelCase")]
pub fn list_voice_presets(app: tauri::AppHandle) -> Vec<VoicePreset> {
    let cfg = config::load_app_config(&app).unwrap_or_else(|_| config::get_default_config());
    presets::list_presets(&cfg.outputs_path)
}

/// Export editor clips, SRT, and DaVinci import script to a folder.
#[tauri::command(rename_all = "camelCase")]
pub fn export_editor_bundle(
    clips: Vec<crate::models::SentenceClip>,
    target_dir: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let cfg = config::load_validated_config(&app)?;
    crate::output_paths::export_editor_bundle(&cfg.outputs_path, &clips, &target_dir)
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


    #[test]
    fn validate_preset_id_accepts_user_visible_ids() {
        assert!(validate_preset_id("dave-warm-narration").is_ok());
        assert!(validate_preset_id("preset-1").is_ok());
        assert!(validate_preset_id("a_b-c_1").is_ok());
    }

    #[test]
    fn validate_preset_id_rejects_traversal_and_separators() {
        assert!(validate_preset_id("../../../etc/passwd").is_err());
        assert!(validate_preset_id("foo/bar").is_err());
        assert!(validate_preset_id("foo\\bar").is_err());
        assert!(validate_preset_id("foo\0bar").is_err());
    }

    #[test]
    fn validate_preset_id_rejects_empty_and_oversize() {
        assert!(validate_preset_id("").is_err());
        let long = "a".repeat(129);
        assert!(validate_preset_id(&long).is_err());
    }

#[cfg(test)]
mod tests {
    use super::*;


    #[test]
    fn validate_job_id_accepts_normal_ids() {
        assert!(validate_job_id("job-1700000000000").is_ok());
        assert!(validate_job_id("job-1").is_ok());
        assert!(validate_job_id("a_b-c_1").is_ok());
    }

    #[test]
    fn validate_job_id_rejects_traversal() {
        assert!(validate_job_id("../../../etc/passwd").is_err());
        assert!(validate_job_id("..").is_err());
        assert!(validate_job_id(".").is_err());
    }

    #[test]
    fn validate_job_id_rejects_separators_and_nul() {
        assert!(validate_job_id("foo/bar").is_err());
        assert!(validate_job_id("foo\\bar").is_err());
        assert!(validate_job_id("foo\0bar").is_err());
    }

    #[test]
    fn validate_job_id_rejects_empty_and_oversize() {
        assert!(validate_job_id("").is_err());
        let long = "a".repeat(65);
        assert!(validate_job_id(&long).is_err());
    }
    #[test]
    fn check_binary_exists_empty_string() {
        assert!(!check_binary_exists("".to_string()));
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
}
#[cfg(test)]
mod export_tests {
    use crate::models::SentenceClip;

    #[test]
    fn export_creates_srt_and_copies_wavs() {
        let outputs_root = std::env::temp_dir().join("vof_export_outputs");
        let clips_dir = outputs_root.join("clips");
        std::fs::create_dir_all(&clips_dir).unwrap();

        // Create mock WAV files (valid RIFF headers)
        for i in 0..2u32 {
            let mut wav = Vec::new();
            wav.extend(b"RIFF");
            wav.extend(&44u32.to_le_bytes());
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
            std::fs::write(clips_dir.join(format!("clip_{i}.wav")), &wav).unwrap();
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

        let target = std::env::temp_dir().join("vof_export_target");
        let result = crate::output_paths::export_editor_bundle(
            &outputs_root.to_string_lossy(),
            &clips,
            &target.to_string_lossy(),
        );
        assert!(result.is_ok(), "export failed: {:?}", result.err());

        // Verify SRT content
        let srt_content = std::fs::read_to_string(target.join("subtitles.srt")).unwrap();
        assert!(srt_content.contains("00:00:00,000 --> 00:00:01,500"));
        assert!(srt_content.contains("00:00:01,500 --> 00:00:03,000"));
        assert!(srt_content.contains("Hello."));
        assert!(srt_content.contains("World!"));

        // Verify Kdenlive project
        let xml_content = std::fs::read_to_string(target.join("project.kdenlive")).unwrap();
        assert!(xml_content.contains(r#"<mlt LC_NUMERIC="C""#));
        assert!(xml_content.contains(r#"producer="producer0""#));
        assert!(xml_content.contains(r#"producer="producer1""#));

        // Verify WAV copies
        assert!(target.join("clip_0.wav").exists());
        assert!(target.join("clip_1.wav").exists());

        std::fs::remove_dir_all(&outputs_root).ok();
        std::fs::remove_dir_all(&target).ok();
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn seed_built_in_voices(
    app: tauri::AppHandle,
) -> Result<Vec<serde_json::Value>, String> {
    let cfg = config::load_app_config(&app)?;
    cfg.validate_paths()?;
    let results = built_in_voices::seed_built_in_voices(&cfg.outputs_path);
    let values: Vec<serde_json::Value> = results
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "voiceId": r.voice_id,
                "name": r.name,
                "success": r.success,
                "error": r.error,
            })
        })
        .collect();
    Ok(values)
}

#[tauri::command(rename_all = "camelCase")]
pub fn generate_sentences(
    text: String,
    language: String,
    model_id: String,
    voice_preset_id: Option<String>,
    app: tauri::AppHandle,
) -> Result<Vec<crate::models::SentenceClip>, String> {
    let cfg = config::load_app_config(&app)?;
    cfg.validate_executable()?;
    let models = downloads::list_local_models(std::path::Path::new(&cfg.models_path));
    let model = models
        .iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("unknown model id: {model_id}"))?;
    if model.state != crate::models::ModelState::Installed {
        return Err(format!("model {model_id} is not installed"));
    }
    // Resolve voice preset → prompt-audio + prompt-text, with output-root
    // validation to prevent arbitrary file access via preset paths.
    let (prompt_audio, prompt_text) = if let Some(ref preset_id) = voice_preset_id {
        if let Some((audio_path, ref_text)) = presets::resolve_preset_reference(
            &cfg.outputs_path,
            preset_id,
        )? {
            (Some(audio_path), Some(ref_text))
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };
    let sentences = crate::models::split_sentences(&text);
    if sentences.is_empty() {
        return Err("no sentences found in input text".to_string());
    }
    let outputs_dir = std::path::Path::new(&cfg.outputs_path);
    let mut clips = Vec::with_capacity(sentences.len());
    let mut elapsed_ms: u64 = 0;
    for (i, sentence) in sentences.iter().enumerate() {
        let output_path = outputs_dir.join(format!("clip_{i}.wav"));
        let sentence_request = GenerationRequest {
            text: sentence.clone(),
            language: language.clone(),
            model_id: model_id.clone(),
            seed: None,
            voice_preset_id: None,
            reference_audio_path: prompt_audio.clone(),
            reference_text: prompt_text.clone(),
        };
        let spec = crate::process::GenerationCommandSpec::from_request_with_output_path(
            &sentence_request,
            &cfg,
            model,
            output_path,
        );
        let mut child = std::process::Command::new(&spec.binary_path)
            .args(&spec.args)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("failed to spawn engine for sentence {i}: {e}"))?;
        // Wait with timeout (120s per sentence) to prevent indefinite hangs.
        let timeout = std::time::Duration::from_secs(120);
        let start = std::time::Instant::now();
        let status = loop {
            if let Some(s) = child.try_wait().map_err(|e| format!("engine wait error for sentence {i}: {e}"))? {
                break s;
            }
            if start.elapsed() >= timeout {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("engine timed out after 120s for sentence {i}"));
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        };
        if !status.success() {
            return Err(format!(
                "engine exited with code {} for sentence {}",
                status.code().unwrap_or(-1),
                i
            ));
        }
        let duration_ms = wav_duration_ms(&spec.output_path)?;
        clips.push(crate::models::SentenceClip {
            text: sentence.clone(),
            start_ms: elapsed_ms,
            end_ms: elapsed_ms + duration_ms,
            wav_path: spec.output_path.to_string_lossy().to_string(),
        });
        elapsed_ms += duration_ms;
    }
    Ok(clips)
}