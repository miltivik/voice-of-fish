//! Renderer-facing audio I/O.
//!
//! The renderer's only legitimate need for raw audio bytes is playback via
//! `<audio src="blob:...">`. Replacing the disabled `asset://` protocol with
//! a Rust command keeps the file-read surface behind the path-scope guard
//! and out of the WebView's reach.
//!
//! Both commands validate the path through `output_paths::validate_within_outputs`
//! before any read or copy, so a compromised renderer cannot read arbitrary
//! files under `outputs_path` either.

use std::path::{Path, PathBuf};

/// Maximum size of an audio file the renderer is allowed to fetch in one call.
/// 64 MiB comfortably fits a 5-minute 48 kHz stereo WAV; anything larger should
/// stream from disk rather than round-trip through IPC.
const MAX_AUDIO_BYTES: u64 = 64 * 1024 * 1024;

/// Maximum size of a GGUF model the renderer is allowed to import. 16 GiB
/// covers every quantization in the manifest with headroom.
const MAX_IMPORT_BYTES: u64 = 16 * 1024 * 1024 * 1024;

/// Read a WAV file from inside `outputs_path` and return its bytes.
///
/// Returns `Err` if:
/// - the path is not absolute or escapes `outputs_path`
/// - the file does not exist or is not a regular file
/// - the file exceeds `MAX_AUDIO_BYTES`
pub fn read_audio_bytes(outputs_path: &str, wav_path: &str) -> Result<Vec<u8>, String> {
    let canonical = crate::output_paths::validate_within_outputs(outputs_path, wav_path)?;
    if !canonical.is_file() {
        return Err(format!("not a file: {wav_path}"));
    }

    let metadata = std::fs::metadata(&canonical)
        .map_err(|e| format!("failed to stat audio file: {e}"))?;
    if metadata.len() > MAX_AUDIO_BYTES {
        return Err(format!(
            "audio file exceeds {} MiB limit",
            MAX_AUDIO_BYTES / (1024 * 1024)
        ));
    }

    std::fs::read(&canonical).map_err(|e| format!("failed to read audio file: {e}"))
}

/// Validate and copy a GGUF model file the renderer dropped onto the model
/// manager into the configured `models_path` directory.
///
/// Both the source path and the destination must satisfy guards:
/// - source: must be a `.gguf` file that exists
/// - destination: must resolve to a path *inside* `models_path`
/// - file size must be under `MAX_IMPORT_BYTES`
///
/// Returns the canonical destination path on success.
pub fn import_model_file(
    models_path: &str,
    source_path: &str,
    file_name: &str,
) -> Result<PathBuf, String> {
    // Source must exist, be a file, and have a .gguf extension.
    let source = Path::new(source_path);
    if !source.is_absolute() {
        return Err(format!("source path must be absolute: {source_path}"));
    }
    if !source.is_file() {
        return Err(format!("source file not found: {source_path}"));
    }
    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_ascii_lowercase());
    match ext.as_deref() {
        Some("gguf") => {}
        _ => return Err(format!("source must be a .gguf file, got: {source_path}")),
    }

    // Enforce size cap on the source before copying.
    let source_size = std::fs::metadata(source)
        .map_err(|e| format!("failed to stat source: {e}"))?
        .len();
    if source_size > MAX_IMPORT_BYTES {
        return Err(format!(
            "model file exceeds {} GiB limit",
            MAX_IMPORT_BYTES / (1024 * 1024 * 1024)
        ));
    }

    // Resolve the destination under models_path and ensure it stays inside.
    let models_root = std::fs::canonicalize(models_path)
        .map_err(|e| format!("failed to resolve models_path: {e}"))?;
    if !models_root.is_dir() {
        return Err(format!("models_path is not a directory: {models_path}"));
    }

    let sanitized_name = sanitize_basename(file_name)?;
    let dest = models_root.join(&sanitized_name);
    let dest_canonical = dest
        .canonicalize()
        .or_else(|_| {
            // Canonicalize fails when the destination doesn't exist yet;
            // fall back to validating against the parent.
            let parent = dest.parent().ok_or("destination has no parent")?;
            let parent_canonical = std::fs::canonicalize(parent)
                .map_err(|e| format!("failed to resolve dest parent: {e}"))?;
            if !parent_canonical.starts_with(&models_root) {
                return Err(format!("destination escapes models_path: {dest:?}"));
            }
            Ok(parent_canonical.join(sanitized_name))
        })?;

    if !dest_canonical.starts_with(&models_root) {
        return Err(format!("destination escapes models_path: {dest:?}"));
    }

    std::fs::copy(source, &dest_canonical)
        .map_err(|e| format!("failed to copy model: {e}"))?;
    Ok(dest_canonical)
}

/// Reject empty names, path separators, NUL bytes, and `..` segments so the
/// renderer can never influence where the copy lands via the filename it
/// reports. The OS file picker reports a single bare name like `model.gguf`;
/// anything with separators is hostile.
fn sanitize_basename(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("file_name is empty".to_string());
    }
    if trimmed.contains('\0') {
        return Err("file_name contains NUL byte".to_string());
    }
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err(format!("file_name must not contain path separators: {name}"));
    }
    if trimmed == "." || trimmed == ".." || trimmed.contains("..") {
        return Err(format!("file_name is not a safe basename: {name}"));
    }
    Ok(trimmed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn fresh_outputs() -> (TempDir, String) {
        let dir = TempDir::new().expect("tempdir");
        let path = dir.path().to_string_lossy().to_string();
        // Canonicalize once to match what `validate_within_outputs` will see.
        let canonical = std::fs::canonicalize(&path)
            .expect("canonicalize")
            .to_string_lossy()
            .to_string();
        (dir, canonical)
    }

    fn write_wav(path: &Path) {
        let mut f = std::fs::File::create(path).expect("create wav");
        f.write_all(b"RIFF....WAVEfmt ........data....").expect("write wav");
    }

    use tempfile::TempDir;

    #[test]
    fn read_audio_bytes_round_trip() {
        let (dir, outputs_path) = fresh_outputs();
        let wav = dir.path().join("clip.wav");
        write_wav(&wav);
        let bytes = read_audio_bytes(&outputs_path, &wav.to_string_lossy()).expect("read");
        assert!(bytes.starts_with(b"RIFF"));
    }

    #[test]
    fn read_audio_bytes_rejects_path_outside_outputs() {
        let (outputs_dir, outputs_path) = fresh_outputs();
        let other = tempfile::TempDir::new().expect("tempdir");
        let wav = other.path().join("clip.wav");
        write_wav(&wav);
        let result = read_audio_bytes(&outputs_path, &wav.to_string_lossy());
        assert!(result.is_err(), "should reject path outside outputs_path");
        drop(outputs_dir);
    }

    #[test]
    fn read_audio_bytes_rejects_traversal() {
        let (outputs_dir, outputs_path) = fresh_outputs();
        let outside = tempfile::TempDir::new().expect("tempdir");
        let outside_wav = outside.path().join("clip.wav");
        write_wav(&outside_wav);
        // Symlink trick: try to traverse up.
        let traversal = outputs_dir
            .path()
            .join("..")
            .join(outside.path().file_name().unwrap())
            .join("clip.wav");
        let result = read_audio_bytes(&outputs_path, &traversal.to_string_lossy());
        assert!(result.is_err(), "traversal must be rejected");
    }

    #[test]
    fn import_model_file_copies_into_models_dir() {
        let source_dir = tempfile::TempDir::new().expect("tempdir");
        let models_dir = tempfile::TempDir::new().expect("tempdir");
        let models_path = std::fs::canonicalize(models_dir.path())
            .expect("canon")
            .to_string_lossy()
            .to_string();

        let src = source_dir.path().join("s2-pro-q8_0.gguf");
        std::fs::write(&src, b"GGUF\x00\x00\x00\x03").expect("write source");

        let dest = import_model_file(
            &models_path,
            &src.to_string_lossy(),
            "s2-pro-q8_0.gguf",
        )
        .expect("import");
        assert!(dest.starts_with(models_dir.path()));
        assert!(dest.exists());
    }

    #[test]
    fn import_model_file_rejects_non_gguf_extension() {
        let source_dir = tempfile::TempDir::new().expect("tempdir");
        let models_dir = tempfile::TempDir::new().expect("tempdir");
        let models_path = std::fs::canonicalize(models_dir.path())
            .expect("canon")
            .to_string_lossy()
            .to_string();

        let src = source_dir.path().join("evil.exe");
        std::fs::write(&src, b"not a model").expect("write");

        let result = import_model_file(
            &models_path,
            &src.to_string_lossy(),
            "evil.exe",
        );
        assert!(result.is_err());
    }

    #[test]
    fn import_model_file_rejects_traversal_in_filename() {
        let source_dir = tempfile::TempDir::new().expect("tempdir");
        let models_dir = tempfile::TempDir::new().expect("tempdir");
        let models_path = std::fs::canonicalize(models_dir.path())
            .expect("canon")
            .to_string_lossy()
            .to_string();

        let src = source_dir.path().join("s2-pro-q8_0.gguf");
        std::fs::write(&src, b"GGUF").expect("write");

        let result = import_model_file(
            &models_path,
            &src.to_string_lossy(),
            "../escape.gguf",
        );
        assert!(result.is_err(), "filename with .. must be rejected");
    }

    #[test]
    fn import_model_file_rejects_path_separator_in_filename() {
        let source_dir = tempfile::TempDir::new().expect("tempdir");
        let models_dir = tempfile::TempDir::new().expect("tempdir");
        let models_path = std::fs::canonicalize(models_dir.path())
            .expect("canon")
            .to_string_lossy()
            .to_string();

        let src = source_dir.path().join("s2-pro-q8_0.gguf");
        std::fs::write(&src, b"GGUF").expect("write");

        let result = import_model_file(
            &models_path,
            &src.to_string_lossy(),
            "sub/evil.gguf",
        );
        assert!(result.is_err());
    }
}
