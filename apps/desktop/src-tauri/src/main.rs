use std::sync::Mutex;
use voice_of_fish_desktop::config;
use voice_of_fish_desktop::process::ProcessManager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(Mutex::new(ProcessManager::default()))
        .setup(|app| {
            // Initialize the config store with defaults on first run.
            if let Err(e) = config::init_config(&app.handle()) {
                eprintln!("Voice of Fish: config init warning: {e}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            voice_of_fish_desktop::commands::get_system_info,
            voice_of_fish_desktop::commands::get_app_config,
            voice_of_fish_desktop::commands::save_app_config,
            voice_of_fish_desktop::commands::list_local_models,
            voice_of_fish_desktop::commands::download_model,
            voice_of_fish_desktop::commands::delete_model,
            voice_of_fish_desktop::commands::run_generation,
            voice_of_fish_desktop::commands::cancel_generation,
            voice_of_fish_desktop::commands::get_active_job,
            voice_of_fish_desktop::commands::read_generation_logs,
            voice_of_fish_desktop::commands::open_file_path,
            voice_of_fish_desktop::commands::open_output_folder,
            voice_of_fish_desktop::commands::check_binary_exists,
            voice_of_fish_desktop::commands::check_file_exists,
            voice_of_fish_desktop::commands::check_directory_exists,
            voice_of_fish_desktop::commands::pick_folder,
            voice_of_fish_desktop::commands::list_generation_history,
            voice_of_fish_desktop::commands::list_voice_presets,
            voice_of_fish_desktop::commands::save_voice_preset,
            voice_of_fish_desktop::commands::delete_voice_preset,
            voice_of_fish_desktop::commands::generate_sentences,
            voice_of_fish_desktop::commands::export_editor_bundle,
            voice_of_fish_desktop::commands::seed_built_in_voices,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Voice of Fish failed to start: {e}");
            std::process::exit(1);
        });
}
