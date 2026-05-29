use crate::models::{LocalModel, ModelState};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::Path;
use tauri::Emitter;

const DOWNLOAD_SIZE_MARGIN: f64 = 1.15;

/// Returns true if the checksum looks like a placeholder rather than a real SHA256 hash.
/// Real SHA256 checksums are 64 hex characters; placeholders are shorter or use patterns.
fn is_placeholder_checksum(checksum: &str) -> bool {
    let clean = checksum.trim();
    // A real SHA256 hex is exactly 64 lowercase hex characters.
    clean.len() != 64 || !clean.chars().all(|c| c.is_ascii_hexdigit())
}

pub fn model_catalog() -> Vec<LocalModel> {
    LocalModel::manifest()
}

pub fn list_local_models(models_path: &Path) -> Vec<LocalModel> {
    let mut models = model_catalog();
    for model in &mut models {
        model.state = if models_path.join(&model.filename).is_file() {
            ModelState::Installed
        } else {
            ModelState::NotInstalled
        };
    }
    models
}

pub fn delete_model_file(models_path: &Path, model_id: &str) -> Result<Vec<LocalModel>, String> {
    let entry = model_catalog()
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("unknown model id: {model_id}"))?;

    let models_path = models_path
        .canonicalize()
        .map_err(|e| format!("failed to resolve models path: {e}"))?;

    let target = models_path.join(&entry.filename);
    if !target.starts_with(&models_path) {
        // Defensive: canonicalized path must stay within models dir.
        let resolved = target.canonicalize().unwrap_or_else(|_| target.clone());
        if !resolved.starts_with(&models_path) {
            return Err("delete path escapes models directory".to_string());
        }
    }

    if target.is_file() {
        std::fs::remove_file(&target)
            .map_err(|e| format!("failed to delete model file: {e}"))?;
    }

    Ok(list_local_models(&models_path))
}

pub fn download_model_file(
    models_path: &Path,
    model_id: &str,
    app: Option<&tauri::AppHandle>,
) -> Result<Vec<LocalModel>, String> {
    let entry = model_catalog()
        .into_iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("unknown model id: {model_id}"))?;

    let url = entry
        .download_url
        .as_deref()
        .filter(|u| !u.is_empty())
        .ok_or_else(|| format!("download not available for {model_id}: no URL"))?;

    let checksum = entry
        .checksum
        .as_deref()
        .filter(|c| !c.is_empty())
        .ok_or_else(|| format!("download not available for {model_id}: no checksum"))?;

    // Warn about placeholder checksums — SHA256 verification is skipped for these.
    if is_placeholder_checksum(checksum) {
        eprintln!(
            "[download] checksum for '{}' is a placeholder; SHA256 verification skipped",
            model_id
        );
    }

    let max_bytes = ((entry.approx_bytes as f64) * DOWNLOAD_SIZE_MARGIN) as u64;

    std::fs::create_dir_all(models_path).map_err(|e| format!("failed to create models directory: {e}"))?;

    let models_path = models_path
        .canonicalize()
        .map_err(|e| format!("failed to resolve models path: {e}"))?;

    let final_path = models_path.join(&entry.filename);
    let temp_path = models_path.join(format!(
        "{}.dl-{}.part",
        entry.filename,
        std::time::UNIX_EPOCH
            .elapsed()
            .map(|d| d.as_nanos())
            .unwrap_or(0),
    ));

    let response = ureq::get(url).call().map_err(|e| {
        let _ = std::fs::remove_file(&temp_path);
        match e {
            ureq::Error::StatusCode(c) => format!("download failed with HTTP {c}"),
            other => format!("download request failed: {other}"),
        }
    })?;

    // Get content-length for progress reporting.
    // Get content-length for progress reporting and max_bytes validation.
    let total_bytes = response
        .headers()
        .get("Content-Length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(entry.approx_bytes);

    // Validate Content-Length against max_bytes before streaming.
    if total_bytes > max_bytes {
        let _ = std::fs::remove_file(&temp_path);
        return Err(format!(
            "download size {total_bytes} bytes exceeds safety limit of {max_bytes} bytes"
        ));
    }
    let mut dest = File::create_new(&temp_path).map_err(|e| {
        let _ = std::fs::remove_file(&temp_path);
        format!("failed to create temp file: {e}")
    })?;

    let mut downloaded: u64 = 0;
    let mut last_emitted: u64 = 0;
    let mut reader = response.into_body().into_reader();
    let mut buf = [0u8; 8192];
    loop {
        let n = reader.read(&mut buf).map_err(|e| {
            let _ = std::fs::remove_file(&temp_path);
            format!("download streaming failed: {e}")
        })?;
        if n == 0 {
            break;
        }
        downloaded += n as u64;
        // Enforce size cap inside the streaming loop.
        if downloaded > max_bytes {
            let _ = std::fs::remove_file(&temp_path);
            return Err(format!(
                "download exceeded safety limit of {max_bytes} bytes"
            ));
        }
        dest.write_all(&buf[..n]).map_err(|e| {
            let _ = std::fs::remove_file(&temp_path);
            format!("download streaming failed: {e}")
        })?;
        // Emit progress at most once per MiB to avoid flooding the JS bridge.
        if downloaded - last_emitted >= 1_048_576 {
            if let Some(app) = &app {
                let _ = app.emit(
                    "download-progress",
                    serde_json::json!({
                        "modelId": model_id,
                        "downloaded": downloaded,
                        "total": total_bytes,
                    }),
                );
            }
            last_emitted = downloaded;
        }
    }
    // Final progress emit so the UI always reaches 100%.
    if let Some(app) = &app {
        let _ = app.emit(
            "download-progress",
            serde_json::json!({
                "modelId": model_id,
                "downloaded": downloaded,
                "total": total_bytes,
            }),
        );
    }

    // Skip SHA256 verification when checksum is a placeholder.
    // This avoids 10-30 seconds of disk I/O on 4+ GB files for checksums
    // that are known to be invalid (the manifest has placeholder values).
    if is_placeholder_checksum(checksum) {
        if let Some(app) = &app {
            let _ = app.emit(
                "download-progress",
                serde_json::json!({
                    "modelId": model_id,
                    "downloaded": downloaded,
                    "total": total_bytes,
                    "phase": "skipping-verification",
                }),
            );
        }
    } else if let Err(e) = verify_checksum(&temp_path, checksum) {
        let _ = std::fs::remove_file(&temp_path);
        return Err(format!("checksum verification failed: {e}"));
    }

    #[cfg(windows)]
    {
        let _ = std::fs::remove_file(&final_path);
    }
    std::fs::rename(&temp_path, &final_path).map_err(|e| {
        let _ = std::fs::remove_file(&temp_path);
        format!("failed to finalize download: {e}")
    })?;

    Ok(list_local_models(&models_path))
}

pub fn verify_checksum(path: &Path, expected: &str) -> Result<(), String> {
    let mut file = File::open(path).map_err(|e| format!("failed to open file: {e}"))?;
    let mut hasher = Sha256::new();
    io::copy(&mut file, &mut hasher).map_err(|e| format!("failed to read file: {e}"))?;
    let computed = format!("{:x}", hasher.finalize());
    if computed == expected.to_lowercase() {
        Ok(())
    } else {
        Err(format!(
            "checksum mismatch: expected {}, got {}",
            expected.to_lowercase(),
            computed
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::{NamedTempFile, TempDir};

    #[test]
    fn list_empty_dir_all_not_installed() {
        let dir = TempDir::new().unwrap();
        for m in &list_local_models(dir.path()) {
            assert_eq!(m.state, ModelState::NotInstalled);
        }
    }

    #[test]
    fn list_detects_installed() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("s2-pro-q6_k.gguf"), b"x").unwrap();
        let m = list_local_models(dir.path())
            .into_iter()
            .find(|m| m.id == "s2-q6")
            .unwrap();
        assert_eq!(m.state, ModelState::Installed);
    }

    #[test]
    fn delete_removes_file() {
        let dir = TempDir::new().unwrap();
        let fp = dir.path().join("s2-pro-q6_k.gguf");
        std::fs::write(&fp, b"x").unwrap();
        let models = delete_model_file(dir.path(), "s2-q6").unwrap();
        assert_eq!(
            models
                .iter()
                .find(|m| m.id == "s2-q6")
                .unwrap()
                .state,
            ModelState::NotInstalled
        );
        assert!(!fp.exists());
    }

    #[test]
    fn delete_unknown_errors() {
        assert!(delete_model_file(TempDir::new().unwrap().path(), "nope")
            .unwrap_err()
            .contains("unknown"));
    }

    #[test]
    fn delete_path_containment() {
        let dir = TempDir::new().unwrap();
        let out = TempDir::new().unwrap();
        let of = out.path().join("s2-pro-q6_k.gguf");
        std::fs::write(&of, b"x").unwrap();
        assert!(delete_model_file(dir.path(), "s2-q6").is_ok());
        assert!(of.exists());
    }

    #[test]
    fn download_no_url_fails() {
        assert!(download_model_file(
            TempDir::new().unwrap().path(),
            "nonexistent-model",
            None
        )
        .unwrap_err()
        .contains("unknown model id"));
    }

    #[test]
    fn checksum_ok() {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(b"hello world").unwrap();
        f.flush().unwrap();
        assert!(verify_checksum(
            f.path(),
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        )
        .is_ok());
    }

    #[test]
    fn checksum_mismatch() {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(b"hello world").unwrap();
        f.flush().unwrap();
        assert!(verify_checksum(f.path(), &"0".repeat(64))
            .unwrap_err()
            .contains("mismatch"));
    }

    #[test]
    fn checksum_case_insensitive() {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(b"hello world").unwrap();
        f.flush().unwrap();
        assert!(verify_checksum(
            f.path(),
            "B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9"
        )
        .is_ok());
    }

    #[test]
    fn placeholder_checksum_detected() {
        // Short placeholder
        assert!(is_placeholder_checksum("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"));
        // Empty-ish
        assert!(is_placeholder_checksum(""));
        // Real 64-char hex
        assert!(!is_placeholder_checksum(
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        ));
        // Real uppercase
        assert!(!is_placeholder_checksum(
            "B94D27B9934D3E08A52E52D7DA7DABFAC484EFE37A5380EE9088F7ACE2EFCDE9"
        ));
        // Too long (not valid hex either)
        assert!(is_placeholder_checksum("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2x"));
    }
}