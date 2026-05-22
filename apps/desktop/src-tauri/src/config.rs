use crate::models::AppConfig;

pub fn get_mock_config() -> AppConfig {
    AppConfig::mock()
}

pub fn save_mock_config(config: AppConfig) -> AppConfig {
    config
}
