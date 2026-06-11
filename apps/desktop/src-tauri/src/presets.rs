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

/// Saves a voice preset, validates audio extension AND reference_audio_path
/// scope, and persists to disk.
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

    // Validate reference_audio_path is within outputs_path (C-5).
    let mut validated = preset.clone();
    if let Some(ref audio_path) = preset.reference_audio_path {
        let canonical =
            crate::output_paths::validate_within_outputs(outputs_path, audio_path)?;
        validated.reference_audio_path = Some(canonical.to_string_lossy().to_string());
    }

    let path = presets_path(outputs_path);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create presets directory: {e}"))?;
    }

    let mut presets = list_presets(outputs_path);

    let id = validated.id.clone();

    // Upsert: replace existing preset with same id, otherwise push.
    if let Some(existing) = presets.iter_mut().find(|p| p.id == id) {
        *existing = validated;
    } else {
        presets.push(validated);
    }

    write_presets_atomic(&path, &presets)?;

    // Return the persisted preset from the in-memory vec we just wrote.
    Ok(presets.into_iter().find(|p| p.id == id).expect("just-inserted"))
}

/// Writes presets to disk atomically via temp file + rename.
fn write_presets_atomic(path: &std::path::Path, presets: &[VoicePreset]) -> Result<(), String> {
    let json = serde_json::to_string_pretty(presets)
        .map_err(|e| format!("failed to serialize presets: {e}"))?;

    let tmp_path = path.with_extension("tmp");
    std::fs::write(&tmp_path, json)
        .map_err(|e| format!("failed to write presets temp file: {e}"))?;
    std::fs::rename(&tmp_path, path)
        .map_err(|e| format!("failed to atomically rename presets file: {e}"))?;

    Ok(())
}

/// Looks up a preset by ID and validates that its `reference_audio_path`
/// is within `outputs_path`. Returns `(reference_audio_path, reference_text)`
/// on success so callers can safely merge into a generation request.
pub fn resolve_preset_reference(
    outputs_path: &str,
    preset_id: &str,
) -> Result<Option<(String, String)>, String> {
    let presets = list_presets(outputs_path);
    let Some(preset) = presets.iter().find(|p| p.id == preset_id) else {
        return Ok(None);
    };
    let Some(ref audio_path) = preset.reference_audio_path else {
        return Ok(None);
    };
    let canonical =
        crate::output_paths::validate_within_outputs(outputs_path, audio_path)?;
    Ok(Some((
        canonical.to_string_lossy().to_string(),
        preset.reference_text.clone(),
    )))
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

    write_presets_atomic(&path, &presets)?;

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

    #[test]
    fn save_preset_validates_reference_audio_within_outputs() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let audio_file = dir.path().join("ref.wav");
        std::fs::write(&audio_file, b"RIFF____WAVE").unwrap();

        let mut preset = make_preset("p1", "Good");
        preset.reference_file_name = "ref.wav".to_string();
        preset.reference_audio_path = Some(audio_file.to_string_lossy().to_string());

        let result = save_preset(outputs, &preset);
        assert!(result.is_ok(), "should accept reference within outputs: {:?}", result.err());

        let saved = list_presets(outputs);
        assert_eq!(saved.len(), 1);
        assert!(saved[0].reference_audio_path.is_some());
    }

    #[test]
    fn save_preset_rejects_reference_audio_outside_outputs() {
        let dir = TempDir::new().unwrap();
        let outside = TempDir::new().unwrap();
        let audio_file = outside.path().join("ref.wav");
        std::fs::write(&audio_file, b"RIFF____WAVE").unwrap();

        let mut preset = make_preset("p1", "Bad");
        preset.reference_file_name = "ref.wav".to_string();
        preset.reference_audio_path = Some(audio_file.to_string_lossy().to_string());

        let result = save_preset(dir.path().to_str().unwrap(), &preset);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("escapes outputs_path"));
    }

    #[test]
    fn resolve_preference_reference_returns_validated_path() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let audio_file = dir.path().join("ref.wav");
        std::fs::write(&audio_file, b"RIFF____WAVE").unwrap();

        let mut preset = make_preset("p1", "My Voice");
        preset.reference_file_name = "ref.wav".to_string();
        preset.reference_audio_path = Some(audio_file.to_string_lossy().to_string());
        save_preset(outputs, &preset).unwrap();

        let result = resolve_preset_reference(outputs, "p1").unwrap();
        assert!(result.is_some());
        let (path, text) = result.unwrap();
        assert!(path.contains("ref.wav"));
        assert_eq!(text, "Hello world");
    }

    #[test]
    fn resolve_preset_reference_returns_none_for_unknown() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();

        let result = resolve_preset_reference(outputs, "nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn resolve_preset_reference_rejects_outside_path() {
        // Save a preset with a stale out-of-scope path.
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        // Directly write a bad preset to disk to simulate corrupted data.
        let preset = VoicePreset {
            id: "bad".to_string(),
            name: "Bad".to_string(),
            language: "en".to_string(),
            reference_text: "Hi".to_string(),
            reference_file_name: "ref.wav".to_string(),
            reference_audio_path: Some("/etc/passwd".to_string()),
            notes: None,
            gender: None,
            duration_seconds: None,
        };
        let path = std::path::PathBuf::from(outputs)
            .join(".voice-of-fish")
            .join("presets.json");
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(&path, serde_json::to_string_pretty(&[preset]).unwrap()).unwrap();

        let result = resolve_preset_reference(outputs, "bad");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("escapes outputs_path"));
    }
}