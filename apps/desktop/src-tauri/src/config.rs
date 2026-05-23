use crate::models::AppConfig;
use std::sync::Mutex;

pub fn get_mock_config() -> AppConfig {
    AppConfig::mock()
}

pub fn save_mock_config(config: AppConfig) -> AppConfig {
    config
}

pub struct ConfigStore {
    inner: Mutex<Option<AppConfig>>,
}

impl ConfigStore {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn get_config(&self) -> Option<AppConfig> {
        self.inner.lock().ok().and_then(|guard| guard.clone())
    }

    pub fn set_config(&self, config: AppConfig) {
        if let Ok(mut guard) = self.inner.lock() {
            *guard = Some(config);
        }
    }
}

impl Default for ConfigStore {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_default_config() -> AppConfig {
    let home = dirs::home_dir().map(|p| p.to_string_lossy().to_string());
    let default_models = home
        .as_ref()
        .map(|h| format!("{}\\voice-of-fish\\models", h))
        .unwrap_or_else(|| "C:\\voice-of-fish\\models".to_string());
    let default_outputs = home
        .as_ref()
        .map(|h| format!("{}\\voice-of-fish\\outputs", h))
        .unwrap_or_else(|| "C:\\voice-of-fish\\outputs".to_string());

    AppConfig {
        mode: crate::models::AppMode::Simple,
        binary_path: String::new(),
        models_path: default_models,
        outputs_path: default_outputs,
        default_model_id: "s2-q6".to_string(),
        default_audio_format: crate::models::AudioFormat::Wav,
        cpu_threads: 8,
        gpu_enabled: true,
        advanced_args: std::collections::BTreeMap::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_store_basic_operations() {
        let store = ConfigStore::new();
        assert!(store.get_config().is_none());

        let config = get_default_config();
        store.set_config(config.clone());
        assert_eq!(store.get_config(), Some(config));
    }

    #[test]
    fn default_config_has_reasonable_paths() {
        let config = get_default_config();
        assert!(config.models_path.contains("voice-of-fish"));
        assert!(config.outputs_path.contains("voice-of-fish"));
    }
}