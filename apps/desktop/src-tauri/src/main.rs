use std::sync::Mutex;
use voice_of_fish_desktop::process::ProcessManager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(Mutex::new(ProcessManager::mock_with_logs()))
        .invoke_handler(tauri::generate_handler![
            voice_of_fish_desktop::commands::get_system_info,
            voice_of_fish_desktop::commands::get_app_config,
            voice_of_fish_desktop::commands::save_app_config,
            voice_of_fish_desktop::commands::list_local_models,
            voice_of_fish_desktop::commands::download_model,
            voice_of_fish_desktop::commands::delete_model,
            voice_of_fish_desktop::commands::run_generation,
            voice_of_fish_desktop::commands::cancel_generation,
            voice_of_fish_desktop::commands::read_generation_logs,
            voice_of_fish_desktop::commands::open_output_folder
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Voice of Fish desktop");
}
