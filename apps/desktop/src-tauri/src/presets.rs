use crate::models::VoicePreset;
use std::path::PathBuf;

const PRESET_DIR: &str = ".voice-of-fish";
const PRESET_FILE: &str = "presets.json";

fn presets_path(outputs_path: &str) -> PathBuf {
    PathBuf::from(outputs_path)
        .join(PRESET_DIR)
        .join(PRESET_FILE)
}

/// Lists all voice presets from the JSON file.
pub fn list_presets(outputs_path: &str) -> Vec<VoicePreset> {
    let path = presets_path(outputs_path);
    let data = match std::fs::read_to_string(&path) {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };
    serde_json::from_str(&data).unwrap_or_default()
}

/// Saves a voice preset, validates audio extension, and persists to disk.
pub fn save_preset(
    outputs_path: &str,
    preset: &VoicePreset,
) -> Result<VoicePreset, String> {
    // Validate reference audio extension.
    let valid_extensions = [".wav", ".mp3", ".flac"];
    let ext = std::path::Path::new(&preset.reference_file_name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_lowercase()))
        .unwrap_or_default();

    if !valid_extensions.contains(&ext.as_str()) {
        return Err(format!(
            "invalid audio extension: {ext}. Must be wav, mp3, or flac."
        ));
    }

    let path = presets_path(outputs_path);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create presets directory: {e}"))?;
    }

    let mut presets = list_presets(outputs_path);

    // Upsert: replace existing preset with same id, otherwise push.
    if let Some(existing) = presets.iter_mut().find(|p| p.id == preset.id) {
        *existing = preset.clone();
    } else {
        presets.push(preset.clone());
    }

    let json = serde_json::to_string_pretty(&presets)
        .map_err(|e| format!("failed to serialize presets: {e}"))?;

    std::fs::write(&path, json)
        .map_err(|e| format!("failed to write presets file: {e}"))?;

    Ok(preset.clone())
}

/// Deletes a voice preset by ID.
pub fn delete_preset(outputs_path: &str, id: &str) -> Result<bool, String> {
    let path = presets_path(outputs_path);
    let mut presets = list_presets(outputs_path);

    let initial_len = presets.len();
    presets.retain(|p| p.id != id);

    if presets.len() == initial_len {
        return Ok(false); // not found
    }

    let json = serde_json::to_string_pretty(&presets)
        .map_err(|e| format!("failed to serialize presets: {e}"))?;

    std::fs::write(&path, json)
        .map_err(|e| format!("failed to write presets file: {e}"))?;

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_preset(id: &str, name: &str) -> VoicePreset {
        VoicePreset {
            id: id.to_string(),
            name: name.to_string(),
            language: "en".to_string(),
            reference_text: "Hello world".to_string(),
            reference_file_name: "ref.wav".to_string(),
            reference_audio_path: None,
            notes: None,
            gender: None,
            duration_seconds: None,
        }
    }

    #[test]
    fn empty_presets_returns_empty_list() {
        let dir = TempDir::new().unwrap();
        let presets = list_presets(dir.path().to_str().unwrap());
        assert!(presets.is_empty());
    }

    #[test]
    fn save_and_list_preset() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let preset = make_preset("preset-1", "My Voice");

        save_preset(outputs, &preset).unwrap();
        let presets = list_presets(outputs);
        assert_eq!(presets.len(), 1);
        assert_eq!(presets[0].name, "My Voice");
    }

    #[test]
    fn save_preset_upserts_by_id() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let preset = make_preset("preset-1", "Original");
        save_preset(outputs, &preset).unwrap();

        let updated = VoicePreset {
            name: "Updated".to_string(),
            ..preset
        };
        save_preset(outputs, &updated).unwrap();

        let presets = list_presets(outputs);
        assert_eq!(presets.len(), 1);
        assert_eq!(presets[0].name, "Updated");
    }

    #[test]
    fn delete_preset_removes_by_id() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        save_preset(outputs, &make_preset("p1", "One")).unwrap();
        save_preset(outputs, &make_preset("p2", "Two")).unwrap();

        let deleted = delete_preset(outputs, "p1").unwrap();
        assert!(deleted);

        let presets = list_presets(outputs);
        assert_eq!(presets.len(), 1);
        assert_eq!(presets[0].id, "p2");
    }

    #[test]
    fn delete_nonexistent_returns_false() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let deleted = delete_preset(outputs, "nonexistent").unwrap();
        assert!(!deleted);
    }

    #[test]
    fn rejects_invalid_audio_extension() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let mut preset = make_preset("p1", "Bad");
        preset.reference_file_name = "ref.txt".to_string();

        let result = save_preset(outputs, &preset);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("invalid audio extension"));
    }
}