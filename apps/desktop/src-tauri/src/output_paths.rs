//! Output-scoped filesystem operations.
//!
//! Single trust-boundary module: every path that reaches OS shell, XML output,
//! or the engine binary MUST pass through [`validate_within_outputs`] before
//! use. This prevents path traversal, symlink escapes, and out-of-scope file
//! access from compromised or malicious frontend input.

use std::path::{Path, PathBuf};

// ---------------------------------------------------------------------------
// Shared trust-boundary helper
// ---------------------------------------------------------------------------

/// Validates that `candidate_path` is an absolute path that resolves to a
/// location inside `outputs_path` (canonicalized). Returns the canonical
/// [`PathBuf`] on success so callers never operate on the raw user string.
///
/// This is the **single** security gate for all path-sensitive operations.
/// `canonicalize` resolves `..`, symlinks, and relative segments, making the
/// `starts_with` check a real trust boundary rather than a string prefix.
pub fn validate_within_outputs(
    outputs_path: &str,
    candidate_path: &str,
) -> Result<PathBuf, String> {
    if candidate_path.trim().is_empty() {
        return Err("path is empty".to_string());
    }

    let outputs_root = std::fs::canonicalize(outputs_path)
        .map_err(|e| format!("failed to resolve outputs_path '{outputs_path}': {e}"))?;
    if !outputs_root.is_dir() {
        return Err(format!(
            "outputs_path is not a directory: {outputs_path}"
        ));
    }

    let candidate = Path::new(candidate_path);
    if !candidate.is_absolute() {
        return Err(format!(
            "path must be absolute, got: {candidate_path}"
        ));
    }

    let canonical = std::fs::canonicalize(candidate)
        .map_err(|e| format!("failed to resolve path '{candidate_path}': {e}"))?;

    if !canonical.starts_with(&outputs_root) {
        return Err(format!(
            "path escapes outputs_path: {candidate_path}"
        ));
    }

    Ok(canonical)
}

// ---------------------------------------------------------------------------
// Open helpers (C-1, C-2)
// ---------------------------------------------------------------------------

/// Validate that `requested_path` is a directory inside `outputs_path`, then
/// spawn the platform file-manager opener. Propagates spawn errors instead of
/// silently returning success.
pub fn open_output_folder(
    outputs_path: &str,
    requested_path: &str,
) -> Result<(), String> {
    let canonical = validate_within_outputs(outputs_path, requested_path)?;
    if !canonical.is_dir() {
        return Err(format!(
            "not a directory: {requested_path}"
        ));
    }
    spawn_file_opener(&canonical)
}

/// Validate that `requested_path` is a file inside `outputs_path`, then
/// spawn the platform file opener.
pub fn open_file_path(
    outputs_path: &str,
    requested_path: &str,
) -> Result<(), String> {
    let canonical = validate_within_outputs(outputs_path, requested_path)?;
    if !canonical.is_file() {
        return Err(format!("not a file: {requested_path}"));
    }
    spawn_file_opener(&canonical)
}

/// Spawn the platform-appropriate file/folder opener. Returns `Err` if the
/// spawn fails so callers can distinguish "opened" from "failed to open".
fn spawn_file_opener(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("failed to open folder with xdg-open: {e}"))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("failed to open folder with open: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &path.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("failed to open folder with cmd: {e}"))?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Export editor bundle (C-3)
// ---------------------------------------------------------------------------

/// Export editor clips, SRT, and Kdenlive project to `target_dir`.
///
/// Validates every `clip.wav_path` is inside `outputs_path` **before**
/// creating the target directory or copying any files (fail-fast). Escapes
/// file paths when interpolating into XML to prevent injection.
pub fn export_editor_bundle(
    outputs_path: &str,
    clips: &[crate::models::SentenceClip],
    target_dir: &str,
) -> Result<String, String> {
    use std::io::Write;

    // Validate all clip paths BEFORE any filesystem side effects.
    let mut validated = Vec::with_capacity(clips.len());
    for clip in clips {
        let canonical = validate_within_outputs(outputs_path, &clip.wav_path)?;
        if !canonical.is_file() {
            return Err(format!(
                "clip source file not found: {}",
                clip.wav_path
            ));
        }
        validated.push((canonical, clip));
    }

    let target = Path::new(target_dir);
    std::fs::create_dir_all(target)
        .map_err(|e| format!("failed to create export folder: {e}"))?;

    let mut count = 0u32;

    // Copy WAV files (using canonical paths).
    for (canonical, clip) in &validated {
        let dest_name = canonical.file_name().unwrap_or_default();
        let dest = target.join(dest_name);
        std::fs::copy(canonical, &dest)
            .map_err(|e| format!("failed to copy {}: {e}", clip.wav_path))?;
        count += 1;
    }

    // Generate SRT
    let srt_path = target.join("subtitles.srt");
    let mut srt = std::fs::File::create(&srt_path)
        .map_err(|e| format!("failed to create SRT: {e}"))?;
    for (i, (_, clip)) in validated.iter().enumerate() {
        let start = format_srt_time(clip.start_ms);
        let end = format_srt_time(clip.end_ms);
        let text = split_subtitle_lines(&clip.text, 42);
        writeln!(srt, "{}", i + 1).map_err(|e| format!("write error: {e}"))?;
        writeln!(srt, "{start} --> {end}").map_err(|e| format!("write error: {e}"))?;
        writeln!(srt, "{text}").map_err(|e| format!("write error: {e}"))?;
        writeln!(srt).map_err(|e| format!("write error: {e}"))?;
    }

    // Generate Kdenlive MLT XML project (with XML-escaped paths).
    let kdenlive_xml = generate_kdenlive_xml(&validated);
    std::fs::write(target.join("project.kdenlive"), &kdenlive_xml)
        .map_err(|e| format!("failed to write project.kdenlive: {e}"))?;

    let script_src = Path::new("resolve_import.py");
    if script_src.is_file() {
        std::fs::copy(script_src, target.join("resolve_import.py"))
            .map_err(|e| format!("failed to copy script: {e}"))?;
    }

    Ok(format!("Exported {count} clip(s) to {target_dir}"))
}

fn generate_kdenlive_xml(
    validated: &[(PathBuf, &crate::models::SentenceClip)],
) -> String {
    let mut xml = String::new();
    xml.push_str("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
    xml.push_str("<mlt LC_NUMERIC=\"C\" version=\"7.0.0\">\n");
    xml.push_str("  <profile width=\"1920\" height=\"1080\" frame_rate_num=\"25\" frame_rate_den=\"1\" display_aspect_num=\"16\" display_aspect_den=\"9\" sample_aspect_num=\"1\" sample_aspect_den=\"1\" colorspace=\"709\" progressive=\"1\"/>\n");
    xml.push_str("  <tractor id=\"tractor0\" title=\"Voice of Fish\">\n");
    xml.push_str("    <track producer=\"playlist0\"/>\n");
    xml.push_str("  </tractor>\n");
    xml.push_str("  <playlist id=\"playlist0\">\n");
    for (i, (_, clip)) in validated.iter().enumerate() {
        let in_frames = clip.start_ms * 25 / 1000;
        let out_frames = clip.end_ms * 25 / 1000;
        xml.push_str(&format!(
            "    <entry producer=\"producer{i}\" in=\"{in_frames}\" out=\"{out_frames}\"/>\n"
        ));
    }
    xml.push_str("  </playlist>\n");
    for (i, (canonical, clip)) in validated.iter().enumerate() {
        let out_frames = (clip.end_ms - clip.start_ms) * 25 / 1000;
        let escaped_path = escape_xml_text(&canonical.to_string_lossy());
        xml.push_str(&format!(
            "  <producer id=\"producer{i}\" in=\"0\" out=\"{out_frames}\">\n\
             \x20   <property name=\"resource\">{escaped_path}</property>\n\
             \x20   <property name=\"mlt_type\">audio</property>\n\
             \x20 </producer>\n"
        ));
    }
    xml.push_str("</mlt>\n");
    xml
}

fn escape_xml_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn split_subtitle_lines(text: &str, max_line: usize) -> String {
    let text = text.trim();
    if text.len() <= max_line {
        return text.to_string();
    }

    let mut result = String::new();
    let mut current = String::new();

    for word in text.split_whitespace() {
        if current.is_empty() {
            current = word.to_string();
        } else if current.len() + 1 + word.len() <= max_line {
            current.push(' ');
            current.push_str(word);
        } else {
            if !result.is_empty() {
                result.push('\n');
            }
            result.push_str(&current);
            current = word.to_string();
        }
    }

    if !current.is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str(&current);
    }

    result
}

fn format_srt_time(ms: u64) -> String {
    let hours = ms / 3_600_000;
    let minutes = (ms % 3_600_000) / 60_000;
    let seconds = (ms % 60_000) / 1_000;
    let millis = ms % 1_000;
    format!("{hours:02}:{minutes:02}:{seconds:02},{millis:03}")
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::SentenceClip;

    // --- validate_within_outputs ---

    #[test]
    fn validate_outputs_accepts_inside_path() {
        let temp = std::env::temp_dir().join("vof_validate_inside");
        std::fs::create_dir_all(&temp).unwrap();
        let sub = temp.join("sub");
        std::fs::create_dir_all(&sub).unwrap();

        let result = validate_within_outputs(
            &temp.to_string_lossy(),
            &sub.to_string_lossy(),
        );
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), std::fs::canonicalize(&sub).unwrap());

        std::fs::remove_dir_all(&temp).ok();
    }

    #[test]
    fn validate_outputs_rejects_outside_path() {
        let temp = std::env::temp_dir().join("vof_validate_outside");
        std::fs::create_dir_all(&temp).unwrap();
        let outside = std::env::temp_dir().join("vof_validate_outside_other");
        std::fs::create_dir_all(&outside).unwrap();

        let result = validate_within_outputs(
            &temp.to_string_lossy(),
            &outside.to_string_lossy(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("escapes outputs_path"));

        std::fs::remove_dir_all(&temp).ok();
        std::fs::remove_dir_all(&outside).ok();
    }

    #[test]
    fn validate_outputs_rejects_empty() {
        let result = validate_within_outputs("/tmp", "");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn validate_outputs_rejects_relative() {
        let result = validate_within_outputs("/tmp", "relative/path");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("absolute"));
    }

    #[test]
    fn validate_outputs_rejects_nonexistent_outputs_path() {
        let result = validate_within_outputs(
            "/nonexistent/path/that/does/not/exist",
            "/tmp/something",
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("outputs_path"));
    }

    #[cfg(unix)]
    #[test]
    fn validate_outputs_rejects_symlink_escape() {
        let temp = std::env::temp_dir().join("vof_validate_symlink");
        std::fs::create_dir_all(&temp).unwrap();
        let outside = std::env::temp_dir().join("vof_validate_symlink_target");
        std::fs::create_dir_all(&outside).unwrap();
        let link = temp.join("escape");
        std::os::unix::fs::symlink(&outside, &link).unwrap();

        let result = validate_within_outputs(
            &temp.to_string_lossy(),
            &link.to_string_lossy(),
        );
        // Symlink resolves to `outside`, which is NOT inside `temp` → rejected.
        assert!(result.is_err(), "symlink escape should be rejected");

        std::fs::remove_dir_all(&temp).ok();
        std::fs::remove_dir_all(&outside).ok();
    }

    // --- open_output_folder ---

    #[test]
    fn open_output_folder_rejects_outside_path() {
        let temp = std::env::temp_dir().join("vof_open_outside");
        std::fs::create_dir_all(&temp).unwrap();
        let outside = std::env::temp_dir().join("vof_open_outside_other");
        std::fs::create_dir_all(&outside).unwrap();

        let result = open_output_folder(
            &temp.to_string_lossy(),
            &outside.to_string_lossy(),
        );
        assert!(result.is_err());

        std::fs::remove_dir_all(&temp).ok();
        std::fs::remove_dir_all(&outside).ok();
    }

    #[test]
    fn open_output_folder_rejects_file() {
        let temp = std::env::temp_dir().join("vof_open_file_not_dir");
        std::fs::create_dir_all(&temp).unwrap();
        let file = temp.join("not_a_dir.txt");
        std::fs::write(&file, "test").unwrap();

        let result = open_output_folder(
            &temp.to_string_lossy(),
            &file.to_string_lossy(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a directory"));

        std::fs::remove_dir_all(&temp).ok();
    }

    // --- open_file_path ---

    #[test]
    fn open_file_path_rejects_outside_path() {
        let temp = std::env::temp_dir().join("vof_openfile_outside");
        std::fs::create_dir_all(&temp).unwrap();
        let outside = std::env::temp_dir().join("vof_openfile_outside.txt");
        std::fs::write(&outside, "test").unwrap();

        let result = open_file_path(
            &temp.to_string_lossy(),
            &outside.to_string_lossy(),
        );
        assert!(result.is_err());

        std::fs::remove_dir_all(&temp).ok();
        std::fs::remove_file(&outside).ok();
    }

    #[test]
    fn open_file_path_rejects_directory() {
        let temp = std::env::temp_dir().join("vof_openfile_dir");
        std::fs::create_dir_all(&temp).unwrap();
        let dir = temp.join("is_a_dir");
        std::fs::create_dir_all(&dir).unwrap();

        let result = open_file_path(
            &temp.to_string_lossy(),
            &dir.to_string_lossy(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a file"));

        std::fs::remove_dir_all(&temp).ok();
    }

    // --- export_editor_bundle ---

    #[test]
    fn export_bundle_happy_path() {
        let outputs_root = std::env::temp_dir().join("vof_export_outputs");
        let clips_dir = outputs_root.join("clips");
        std::fs::create_dir_all(&clips_dir).unwrap();

        // Create mock WAV files (valid RIFF headers)
        for i in 0..2u32 {
            let mut wav = Vec::new();
            wav.extend(b"RIFF");
            wav.extend(&44u32.to_le_bytes());
            wav.extend(b"WAVE");
            wav.extend(b"fmt ");
            wav.extend(&16u32.to_le_bytes());
            wav.extend(&1u16.to_le_bytes()); // PCM
            wav.extend(&1u16.to_le_bytes()); // mono
            wav.extend(&44100u32.to_le_bytes());
            wav.extend(&176400u32.to_le_bytes());
            wav.extend(&4u16.to_le_bytes());
            wav.extend(&32u16.to_le_bytes());
            wav.extend(b"data");
            wav.extend(&0u32.to_le_bytes());
            std::fs::write(clips_dir.join(format!("clip_{i}.wav")), &wav).unwrap();
        }

        let target = std::env::temp_dir().join("vof_export_target");
        let clips = vec![
            SentenceClip {
                text: "Hello.".to_string(),
                start_ms: 0,
                end_ms: 1500,
                wav_path: clips_dir.join("clip_0.wav").to_string_lossy().to_string(),
            },
            SentenceClip {
                text: "World!".to_string(),
                start_ms: 1500,
                end_ms: 3000,
                wav_path: clips_dir.join("clip_1.wav").to_string_lossy().to_string(),
            },
        ];

        let result = export_editor_bundle(
            &outputs_root.to_string_lossy(),
            &clips,
            &target.to_string_lossy(),
        );
        assert!(result.is_ok(), "export failed: {:?}", result.err());

        // SRT
        let srt_content = std::fs::read_to_string(target.join("subtitles.srt")).unwrap();
        assert!(srt_content.contains("00:00:00,000 --> 00:00:01,500"));
        assert!(srt_content.contains("00:00:01,500 --> 00:00:03,000"));
        assert!(srt_content.contains("Hello."));
        assert!(srt_content.contains("World!"));

        // Kdenlive XML
        let xml_content = std::fs::read_to_string(target.join("project.kdenlive")).unwrap();
        assert!(xml_content.contains(r#"<mlt LC_NUMERIC="C""#));
        assert!(xml_content.contains(r#"producer="producer0""#));
        assert!(xml_content.contains(r#"producer="producer1""#));

        // WAV copies
        assert!(target.join("clip_0.wav").exists());
        assert!(target.join("clip_1.wav").exists());

        std::fs::remove_dir_all(&outputs_root).ok();
        std::fs::remove_dir_all(&target).ok();
    }

    #[test]
    fn export_bundle_rejects_outside_clip() {
        let outputs_root = std::env::temp_dir().join("vof_export_outside_root");
        std::fs::create_dir_all(&outputs_root).unwrap();
        let outside_wav = std::env::temp_dir().join("vof_export_outside.wav");
        std::fs::write(&outside_wav, b"RIFF____WAVE").unwrap();

        let target = std::env::temp_dir().join("vof_export_outside_target");
        let clips = vec![SentenceClip {
            text: "Bad.".to_string(),
            start_ms: 0,
            end_ms: 100,
            wav_path: outside_wav.to_string_lossy().to_string(),
        }];

        let result = export_editor_bundle(
            &outputs_root.to_string_lossy(),
            &clips,
            &target.to_string_lossy(),
        );
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("escapes outputs_path"));

        // Target dir should NOT have been created (fail-fast before side effects).
        assert!(!target.exists());

        std::fs::remove_dir_all(&outputs_root).ok();
        std::fs::remove_file(&outside_wav).ok();
    }

    // --- XML escaping ---

    #[test]
    fn escape_xml_special_chars() {
        let raw = "path/with <angle> & \"quotes\" 'apostrophe'";
        let escaped = escape_xml_text(raw);
        // All dangerous characters must be replaced with their entity equivalents.
        assert!(!escaped.contains("<angle>"), "bare angle brackets must be escaped");
        assert!(!escaped.contains("\"quotes\""), "bare quotes must be escaped");
        assert!(escaped.contains("&lt;"));
        assert!(escaped.contains("&gt;"));
        assert!(escaped.contains("&amp;"));
        assert!(escaped.contains("&quot;"));
        assert!(escaped.contains("&apos;"));
    }

    #[test]
    fn format_srt_time_midnight() {
        assert_eq!(format_srt_time(0), "00:00:00,000");
    }

    #[test]
    fn format_srt_time_milliseconds() {
        assert_eq!(format_srt_time(1500), "00:00:01,500");
    }

    #[test]
    fn format_srt_time_seconds() {
        assert_eq!(format_srt_time(65000), "00:01:05,000");
    }

    #[test]
    fn format_srt_time_hour() {
        assert_eq!(format_srt_time(3_725_000), "01:02:05,000");
    }

    #[test]
    fn split_subtitle_lines_short_text() {
        assert_eq!(split_subtitle_lines("Hello.", 42), "Hello.");
    }

    #[test]
    fn split_subtitle_lines_wraps_long_text() {
        let text = "This is a long sentence that should wrap";
        let result = split_subtitle_lines(text, 20);
        assert!(result.contains('\n'));
        for line in result.lines() {
            assert!(line.len() <= 20);
        }
    }
}
