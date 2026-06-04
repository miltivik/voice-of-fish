use crate::models::VoicePreset;
use crate::presets;
use std::path::PathBuf;

/// A built-in voice definition with reference audio that can be downloaded
/// and registered as a VoicePreset on first run.
#[derive(Debug, Clone)]
pub struct BuiltInVoice {
    pub id: String,
    pub name: String,
    pub gender: String,
    pub language: String,
    pub reference_text: String,
    pub reference_audio_url: String,
    pub reference_file_name: String,
    pub duration_seconds: u32,
}

/// The catalog of built-in voices shipped with the app.
/// Two voices per language (one female, one male) for EN, ES, JP.
///
/// Reference audio files are from the MiniMaxAI/TTS-Multilingual-Test-Set dataset
/// on Hugging Face (Apache 2.0 license), sourced from Mozilla Common Voice.
pub fn catalog() -> Vec<BuiltInVoice> {
    vec![
        // ── English ──────────────────────────────────────────
        BuiltInVoice {
            id: "built-in-en-female-1".into(),
            name: "Alice".into(),
            gender: "female".into(),
            language: "en".into(),
            reference_text: "Hello, this is a sample voice for text to speech synthesis.".into(),
            reference_audio_url: "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/english/english_female/common_voice_en_42357710.mp3".into(),
            reference_file_name: "en_female_alice.mp3".into(),
            duration_seconds: 12,
        },
        BuiltInVoice {
            id: "built-in-en-male-1".into(),
            name: "Daniel".into(),
            gender: "male".into(),
            language: "en".into(),
            reference_text: "Hello, this is a sample voice for text to speech synthesis.".into(),
            reference_audio_url: "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/english/english_male/common_voice_en_42238763.mp3".into(),
            reference_file_name: "en_male_daniel.mp3".into(),
            duration_seconds: 12,
        },
        // ── Spanish ──────────────────────────────────────────
        BuiltInVoice {
            id: "built-in-es-female-1".into(),
            name: "Carmen".into(),
            gender: "female".into(),
            language: "es".into(),
            reference_text: "Hola, esta es una voz de muestra para síntesis de texto a voz.".into(),
            reference_audio_url: "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/spanish/spanish_female/common_voice_es_42626286.mp3".into(),
            reference_file_name: "es_female_carmen.mp3".into(),
            duration_seconds: 12,
        },
        BuiltInVoice {
            id: "built-in-es-male-1".into(),
            name: "Diego".into(),
            gender: "male".into(),
            language: "es".into(),
            reference_text: "Hola, esta es una voz de muestra para síntesis de texto a voz.".into(),
            reference_audio_url: "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/spanish/spanish_male/common_voice_es_42009030.mp3".into(),
            reference_file_name: "es_male_diego.mp3".into(),
            duration_seconds: 12,
        },
        // ── Japanese ─────────────────────────────────────────
        BuiltInVoice {
            id: "built-in-ja-female-1".into(),
            name: "Sakura".into(),
            gender: "female".into(),
            language: "ja".into(),
            reference_text: "こんにちは、これはテキストから音声への合成のためのサンプル音声です。".into(),
            reference_audio_url: "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/japanese/japanese_female/common_voice_ja_40928196.mp3".into(),
            reference_file_name: "ja_female_sakura.mp3".into(),
            duration_seconds: 12,
        },
        BuiltInVoice {
            id: "built-in-ja-male-1".into(),
            name: "Haruto".into(),
            gender: "male".into(),
            language: "ja".into(),
            reference_text: "こんにちは、これはテキストから音声への合成のためのサンプル音声です。".into(),
            reference_audio_url: "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/japanese/japanese_male/common_voice_ja_40899872.mp3".into(),
            reference_file_name: "ja_male_haruto.mp3".into(),
            duration_seconds: 12,
        },
    ]
}

/// Result of a built-in voice seeding operation.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeedResult {
    pub voice_id: String,
    pub name: String,
    pub success: bool,
    pub error: Option<String>,
}

/// Downloads a file from a URL to a local path using ureq.
fn download_file(url: &str, dest: &PathBuf) -> Result<(), String> {
    let response = ureq::get(url)
        .call()
        .map_err(|e| format!("download request failed: {e}"))?;

    let mut reader = response.into_body().into_reader();
    let mut file = std::fs::File::create(dest)
        .map_err(|e| format!("failed to create file: {e}"))?;

    std::io::copy(&mut reader, &mut file)
        .map_err(|e| format!("failed to write file: {e}"))?;

    Ok(())
}

/// Seeds built-in voices into the presets system.
///
/// For each built-in voice:
/// 1. Skip if a preset with the same ID already exists.
/// 2. Download the reference audio to the outputs directory.
/// 3. Create and save a VoicePreset.
///
/// Returns a list of results indicating success/failure per voice.
pub fn seed_built_in_voices(outputs_path: &str) -> Vec<SeedResult> {
    let existing = presets::list_presets(outputs_path);
    let existing_ids: std::collections::HashSet<&str> =
        existing.iter().map(|p| p.id.as_str()).collect();

    let ref_dir = PathBuf::from(outputs_path)
        .join(".voice-of-fish")
        .join("built-in-refs");

    catalog()
        .into_iter()
        .map(|voice| {
            // Skip if already seeded.
            if existing_ids.contains(voice.id.as_str()) {
                return SeedResult {
                    voice_id: voice.id.clone(),
                    name: voice.name.clone(),
                    success: true,
                    error: Some("already exists".into()),
                };
            }

            // Create reference audio directory.
            if let Err(e) = std::fs::create_dir_all(&ref_dir) {
                return SeedResult {
                    voice_id: voice.id,
                    name: voice.name,
                    success: false,
                    error: Some(format!("failed to create ref dir: {e}")),
                };
            }

            let ref_path = ref_dir.join(&voice.reference_file_name);

            // Download reference audio.
            if let Err(e) = download_file(&voice.reference_audio_url, &ref_path) {
                return SeedResult {
                    voice_id: voice.id,
                    name: voice.name,
                    success: false,
                    error: Some(e),
                };
            }

            // Create and save the VoicePreset.
            let preset = VoicePreset {
                id: voice.id.clone(),
                name: voice.name.clone(),
                language: voice.language.clone(),
                reference_text: voice.reference_text.clone(),
                reference_file_name: voice.reference_file_name.clone(),
                reference_audio_path: Some(ref_path.to_string_lossy().to_string()),
                notes: Some(format!(
                    "Built-in voice — {} ({})",
                    voice.name, voice.gender
                )),
                gender: Some(voice.gender.clone()),
                duration_seconds: Some(voice.duration_seconds as f64),
            };

            if let Err(e) = presets::save_preset(outputs_path, &preset) {
                return SeedResult {
                    voice_id: voice.id,
                    name: voice.name,
                    success: false,
                    error: Some(format!("failed to save preset: {e}")),
                };
            }

            SeedResult {
                voice_id: voice.id,
                name: voice.name,
                success: true,
                error: None,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_has_six_voices() {
        let cat = catalog();
        assert_eq!(cat.len(), 6);
    }

    #[test]
    fn catalog_has_two_per_language() {
        let cat = catalog();
        for lang in &["en", "es", "ja"] {
            let count = cat.iter().filter(|v| v.language == *lang).count();
            assert_eq!(count, 2, "expected 2 voices for {lang}");
        }
    }

    #[test]
    fn catalog_has_one_female_one_male_per_language() {
        let cat = catalog();
        for lang in &["en", "es", "ja"] {
            let lang_voices: Vec<_> = cat.iter().filter(|v| v.language == *lang).collect();
            assert_eq!(lang_voices.len(), 2);
            let genders: std::collections::HashSet<_> =
                lang_voices.iter().map(|v| v.gender.as_str()).collect();
            assert!(genders.contains("female"), "missing female for {lang}");
            assert!(genders.contains("male"), "missing male for {lang}");
        }
    }

    #[test]
    fn catalog_ids_are_unique() {
        let cat = catalog();
        let ids: Vec<_> = cat.iter().map(|v| v.id.as_str()).collect();
        let unique: std::collections::HashSet<_> = ids.iter().copied().collect();
        assert_eq!(ids.len(), unique.len(), "duplicate IDs in catalog");
    }

    #[test]
    fn catalog_all_have_required_fields() {
        let cat = catalog();
        for voice in &cat {
            assert!(!voice.id.is_empty(), "empty id");
            assert!(!voice.name.is_empty(), "empty name for {}", voice.id);
            assert!(!voice.reference_audio_url.is_empty(), "empty url for {}", voice.id);
            assert!(!voice.reference_file_name.is_empty(), "empty filename for {}", voice.id);
            assert!(!voice.reference_text.is_empty(), "empty text for {}", voice.id);
            assert!(voice.duration_seconds > 0, "zero duration for {}", voice.id);
        }
    }

    #[test]
    fn catalog_urls_point_to_huggingface() {
        let cat = catalog();
        for voice in &cat {
            assert!(
                voice.reference_audio_url.starts_with("https://huggingface.co/datasets/"),
                "URL should point to Hugging Face: {}",
                voice.reference_audio_url
            );
        }
    }

    #[test]
    fn catalog_file_names_use_mp3_extension() {
        let cat = catalog();
        for voice in &cat {
            assert!(
                voice.reference_file_name.ends_with(".mp3"),
                "filename should be .mp3: {}",
                voice.reference_file_name
            );
        }
    }
}
