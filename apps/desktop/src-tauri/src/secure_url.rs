//! Bounded, allowed-host HTTP fetcher for built-in voice + model downloads.
//!
//! All HTTP fetches the app makes must go through this module so that:
//! - The URL scheme is `https://` only (no `http://`, no `file://`).
//! - The host is in a pinned allowlist (`huggingface.co` and its
//!   subdomains like `cdn-lfs.huggingface.co`).
//! - The response advertises a `Content-Length` within a per-call cap.
//! - The streaming byte counter enforces the cap *during* the body read,
//!   not just from the header (defends against missing/lying Content-Length).
//!
//! These are defense-in-depth rules: today every URL is a hard-coded
//! literal in Rust source. The guards exist so a future maintainer who
//! adds a new host or a new URL source cannot accidentally open the app
//! to a cleartext download or a multi-GB bomb.

use std::collections::HashSet;
use std::io::Read;

/// Allowlist of hosts the app will fetch from. Matched case-insensitively
/// against the URL's host. Subdomains are allowed (so `cdn-lfs.huggingface.co`
/// also matches the bare `huggingface.co` entry).
const ALLOWED_HOSTS: &[&str] = &["huggingface.co"];

/// Maximum size of a single built-in voice reference audio. 50 MiB
/// comfortably covers an hour of MP3 at 128 kbps; anything larger is
/// almost certainly hostile or misconfigured.
pub const MAX_BUILTIN_REFERENCE_BYTES: u64 = 50 * 1024 * 1024;

/// Maximum size of a single model download. Set generously above the
/// largest entry in `models::manifest` (the current ceiling is around
/// 8 GiB); the streaming cap will still abort before the cap is reached.
pub const MAX_MODEL_BYTES: u64 = 32 * 1024 * 1024 * 1024;

/// Read the entire body of `url` into `dest`, enforcing scheme, host
/// allowlist, and a hard `max_bytes` cap (checked against `Content-Length`
/// *and* the actual stream). Returns the number of bytes written.
pub fn download_to_path(
    url: &str,
    max_bytes: u64,
    dest: &std::path::Path,
) -> Result<u64, String> {
    validate_url(url)?;

    let response = ureq::get(url)
        .call()
        .map_err(|e| format!("download request failed: {e}"))?;

    if let Some(len) = response
        .headers()
        .get("Content-Length")
        .and_then(|v| v.to_str().ok())
    {
        let advertised = len
            .parse::<u64>()
            .map_err(|_| format!("invalid Content-Length: {len:?}"))?;
        if advertised > max_bytes {
            return Err(format!(
                "Content-Length {advertised} exceeds cap {max_bytes}"
            ));
        }
    }

    let mut reader = response.into_body().into_reader().take(max_bytes);
    let mut file =
        std::fs::File::create(dest).map_err(|e| format!("failed to create file: {e}"))?;
    let written =
        std::io::copy(&mut reader, &mut file).map_err(|e| format!("failed to write file: {e}"))?;

    // `take(max_bytes)` silently truncates at the cap rather than erroring.
    // Detect truncation by trying to read one more byte; if that succeeds
    // the body exceeded the cap and we should fail closed.
    if (written as u64) >= max_bytes {
        let mut probe = [0u8; 1];
        let overflow = reader
            .read(&mut probe)
            .map_err(|e| format!("post-cap read failed: {e}"))?;
        if overflow > 0 {
            // Best-effort cleanup of the partial file so we don't leave
            // a 32 GiB truncated artifact on disk.
            let _ = std::fs::remove_file(dest);
            return Err(format!(
                "download exceeded {max_bytes} byte cap (truncated)"
            ));
        }
    }

    Ok(written as u64)
}

/// Validate a URL's scheme and host without making the request. Returns
/// `Ok(())` or an `Err` describing the rejection.
///
/// Hand-rolled parser rather than a `url` crate dep — the trust boundary
/// only needs scheme + host, and adding a third-party parser widens the
/// supply-chain surface for negligible benefit.
pub fn validate_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("url is empty".to_string());
    }
    if url.contains('\0') {
        return Err("url contains NUL byte".to_string());
    }
    let (scheme, rest) = url
        .split_once("://")
        .ok_or_else(|| "url missing scheme://".to_string())?;
    if !scheme.eq_ignore_ascii_case("https") {
        return Err(format!("url scheme must be https://, got {scheme}://"));
    }
    // Host ends at the first `/`, `?`, `#`, or end of string. Lowercase
    // for case-insensitive comparison. Strip an optional `:port`.
    let host_end = rest
        .find(|c: char| c == '/' || c == '?' || c == '#')
        .unwrap_or(rest.len());
    let raw_host = &rest[..host_end];
    let host = raw_host
        .rsplit_once(':')
        .map(|(h, _)| h)
        .unwrap_or(raw_host)
        .to_ascii_lowercase();
    if host.is_empty() {
        return Err("url has no host".to_string());
    }
    if !host_matches_allowlist(&host) {
        return Err(format!("host {host:?} is not in the download allowlist"));
    }
    Ok(())
}

fn host_matches_allowlist(host: &str) -> bool {
    let allowed: HashSet<&str> = ALLOWED_HOSTS.iter().copied().collect();
    if allowed.contains(host) {
        return true;
    }
    for base in ALLOWED_HOSTS {
        if host.ends_with(&format!(".{base}")) {
            return true;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_url_accepts_huggingface() {
        assert!(validate_url(
            "https://huggingface.co/owner/repo/resolve/main/file.gguf"
        )
        .is_ok());
        assert!(validate_url("https://huggingface.co:443/path").is_ok());
    }

    #[test]
    fn validate_url_accepts_huggingface_subdomains() {
        assert!(validate_url("https://cdn-lfs.huggingface.co/file").is_ok());
    }

    #[test]
    fn validate_url_rejects_http() {
        assert!(validate_url("http://huggingface.co/file").is_err());
    }

    #[test]
    fn validate_url_rejects_other_hosts() {
        assert!(validate_url("https://evil.example.com/file").is_err());
        assert!(validate_url("https://huggingface.co.evil.example/file").is_err());
    }

    #[test]
    fn validate_url_rejects_empty_and_nul() {
        assert!(validate_url("").is_err());
        assert!(validate_url("https://huggingface.co/\0").is_err());
    }

    #[test]
    fn validate_url_rejects_garbage() {
        assert!(validate_url("not a url").is_err());
        assert!(validate_url("file:///etc/passwd").is_err());
        assert!(validate_url("javascript:alert(1)").is_err());
    }
}
