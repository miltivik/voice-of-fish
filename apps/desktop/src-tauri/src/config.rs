use crate::models::AppConfig;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const CONFIG_KEY: &str = "app_config";
const STORE_FILENAME: &str = "settings.json";

/// Initializes the config store on first setup. If no config exists, writes
/// the defaults and saves them immediately so subsequent loads see them.
pub fn init_config(app: &AppHandle) -> Result<(), String> {
    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("failed to open config store: {e}"))?;
    if store.get(CONFIG_KEY).is_none() {
        let default_config = get_default_config();
        let value = serde_json::to_value(&default_config)
            .map_err(|e| format!("failed to serialize default config: {e}"))?;
        store.set(CONFIG_KEY.to_string(), value);
        store
            .save()
            .map_err(|e| format!("failed to persist default config: {e}"))?;
    }
    Ok(())
}

/// Loads the persisted app config. Falls back to defaults if the store is
/// missing, empty, or contains corrupt data.
pub fn load_app_config(app: &AppHandle) -> AppConfig {
    let store = match app.store(STORE_FILENAME) {
        Ok(s) => s,
        Err(_) => return get_default_config(),
    };

    match store.get(CONFIG_KEY) {
        Some(raw) => serde_json::from_value(raw.clone()).unwrap_or_else(|_| get_default_config()),
        None => get_default_config(),
    }
}

/// Persists the app config to disk. Validates paths before saving.
pub fn save_app_config(app: &AppHandle, config: &AppConfig) -> Result<AppConfig, String> {
    // Server-side validation before persisting
    config.validate_paths()?;

    let store = app
        .store(STORE_FILENAME)
        .map_err(|e| format!("failed to open config store for save: {e}"))?;

    let value =
        serde_json::to_value(config).map_err(|e| format!("failed to serialize config: {e}"))?;

    store.set(CONFIG_KEY.to_string(), value);
    store
        .save()
        .map_err(|e| format!("failed to save config: {e}"))?;

    Ok(config.clone())
}

/// Returns reasonable default paths using the user's home directory.
pub fn get_default_config() -> AppConfig {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let models_path = home.join("voice-of-fish").join("models");
    let outputs_path = home.join("voice-of-fish").join("outputs");

    AppConfig {
        binary_path: String::new(),
        models_path: models_path.to_string_lossy().to_string(),
        outputs_path: outputs_path.to_string_lossy().to_string(),
        default_model_id: "s2-q6".to_string(),
        cpu_threads: 8,
        gpu_enabled: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_has_reasonable_paths() {
        let config = get_default_config();
        assert!(config.models_path.contains("voice-of-fish"));
        assert!(config.outputs_path.contains("voice-of-fish"));
        assert!(config.models_path.contains(std::path::MAIN_SEPARATOR));
    }

    #[test]
    fn default_config_has_expected_defaults() {
        let config = get_default_config();
        assert!(config.binary_path.is_empty());
        assert_eq!(config.default_model_id, "s2-q6");
        assert_eq!(config.cpu_threads, 8);
        assert!(config.gpu_enabled);
    }

    #[test]
    fn default_config_serializes_and_deserializes() {
        let config = get_default_config();
        let json = serde_json::to_value(&config).expect("serialize");
        let restored: AppConfig = serde_json::from_value(json).expect("deserialize");
        assert_eq!(config, restored);
    }
}
