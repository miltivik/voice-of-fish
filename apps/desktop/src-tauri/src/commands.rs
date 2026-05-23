use crate::config;
use crate::diagnostics;
use crate::downloads;
use crate::models::{
    AppConfig, GenerationJob, GenerationLogLine, GenerationRequest, LocalModel, SystemInfo,
};
use crate::process::ProcessManager;
use std::sync::Mutex;
use tauri::State;

#[tauri::command(rename_all = "camelCase")]
pub fn get_system_info() -> SystemInfo {
    diagnostics::get_mock_system_info()
}

#[tauri::command(rename_all = "camelCase")]
pub fn get_app_config() -> AppConfig {
    config::get_mock_config()
}

#[tauri::command(rename_all = "camelCase")]
pub fn save_app_config(config: AppConfig) -> AppConfig {
    config::save_mock_config(config)
}

#[tauri::command(rename_all = "camelCase")]
pub fn list_local_models() -> Vec<LocalModel> {
    downloads::list_mock_models()
}

#[tauri::command(rename_all = "camelCase")]
pub fn download_model(model_id: String) -> Vec<LocalModel> {
    downloads::mark_mock_downloaded(&model_id)
}

#[tauri::command(rename_all = "camelCase")]
pub fn delete_model(model_id: String) -> Vec<LocalModel> {
    downloads::mark_mock_deleted(&model_id)
}

#[tauri::command(rename_all = "camelCase")]
pub fn run_generation(
    request: GenerationRequest,
    process_manager: State<'_, Mutex<ProcessManager>>,
) -> GenerationJob {
    let job = GenerationJob::mock(request);
    if let Ok(mut manager) = process_manager.lock() {
        manager.active_job_id = None;
        manager.log_lines = GenerationLogLine::mock_lines();
    }
    job
}

#[tauri::command(rename_all = "camelCase")]
pub fn cancel_generation(
    job_id: String,
    process_manager: State<'_, Mutex<ProcessManager>>,
) -> bool {
    if let Ok(mut manager) = process_manager.lock() {
        if manager.active_job_id.as_deref() == Some(job_id.as_str()) {
            manager.active_job_id = None;
        }
    }
    true
}

#[tauri::command(rename_all = "camelCase")]
pub fn read_generation_logs(
    job_id: Option<String>,
    process_manager: State<'_, Mutex<ProcessManager>>,
) -> Vec<GenerationLogLine> {
    let _ = job_id;
    process_manager
        .lock()
        .map(|manager| manager.log_lines.clone())
        .unwrap_or_else(|_| GenerationLogLine::mock_lines())
}

#[tauri::command(rename_all = "camelCase")]
pub fn open_output_folder(path: String) -> bool {
    let _ = path;
    true
}
