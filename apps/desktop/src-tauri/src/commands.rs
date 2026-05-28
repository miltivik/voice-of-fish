use crate::config;
use crate::diagnostics;
use crate::downloads;
use crate::history;
use crate::models::{
    AppConfig, GenerationJob, GenerationLogLine, GenerationRequest,
    HistoryRecord, LocalModel, SystemInfo, VoicePreset,
};
use crate::presets;
use crate::process::ProcessManager;
use std::sync::Mutex;
use tauri::State;

#[tauri::command(rename_all = "camelCase")]
pub fn get_system_info() -> SystemInfo {
    diagnostics::get_real_system_info()
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
pub fn download_model(
    model_id: String,
    app: tauri::AppHandle,
) -> Result<Vec<LocalModel>, String> {
    let cfg = config::load_app_config(&app);
    let models_path = std::path::Path::new(&cfg.models_path);
    downloads::download_model_file(models_path, &model_id, Some(&app))
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
    let cfg = config::load_app_config(&app);

    if cfg.binary_path.is_empty() {
        return Err("binary path is not configured".to_string());
    }

    let models = downloads::list_local_models(std::path::Path::new(&cfg.models_path));
    let model = models
        .iter()
        .find(|m| m.id == request.model_id)
        .ok_or_else(|| format!("unknown model id: {}", request.model_id))?;

    if model.state != crate::models::ModelState::Installed {
        return Err(format!("model {} is not installed", request.model_id));
    }

    let job_id = format!("job-{}", chrono::Utc::now().timestamp_millis());
    let spec = crate::process::GenerationCommandSpec::from_request(
        &request, &cfg, model, &job_id,
    );

    let mut manager = process_manager
        .lock()
        .map_err(|e| format!("process manager lock failed: {e}"))?;

    if manager.child.is_some() {
        return Err("a generation is already in progress".to_string());
    }

    let job = manager.spawn_generation(&spec, &request, &job_id)?;
    // Build the history record while we hold the lock, then drop it.
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
    if let Ok(mut manager) = process_manager.lock() {
        if manager.active_job.as_ref().map(|j| &j.id) == Some(&job_id) {
            return manager.cancel_active();
        }
    }
    false
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
    let Ok(canonical) = std::fs::canonicalize(&binary_path) else {
        return false;
    };
    if !canonical.is_file() {
        return false;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let Ok(metadata) = std::fs::metadata(&canonical) else {
            return false;
        };
        metadata.permissions().mode() & 0o111 != 0
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

#[cfg(test)]
mod tests {
    use super::*;

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