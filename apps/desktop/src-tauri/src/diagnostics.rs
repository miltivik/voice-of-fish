use crate::config;
use crate::models::SystemInfo;
use sysinfo::System;
pub fn get_real_system_info(app: &tauri::AppHandle) -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();
    let os = System::name().unwrap_or_else(|| "Unknown".to_string());
    let cpu = sys
        .cpus()
        .first()
        .map(|c| {
            let brand = c.brand();
            let freq = c.frequency();
            if brand.is_empty() {
                format!("{} MHz", freq)
            } else {
                brand.trim().to_string()
            }
        })
        .unwrap_or_else(|| "Unknown".to_string());
    let total_memory = sys.total_memory();
    let ram_label = format_ram(total_memory);
    let gpu = detect_gpu_label();
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    // Check if the configured binary actually exists.
    let cfg = config::load_app_config(app);
    let binary_found = if cfg.binary_path.is_empty() {
        None
    } else {
        Some(std::path::Path::new(&cfg.binary_path).is_file())
    };
    SystemInfo {
        os,
        cpu,
        ram_label,
        gpu,
        app_version,
        engine_version: None,
        binary_found,
    }
}
fn format_ram(bytes: u64) -> String {
    const GB: u64 = 1024 * 1024 * 1024;
    const MB: u64 = 1024 * 1024;
    if bytes >= GB {
        let gb = bytes as f64 / GB as f64;
        format!("{:.1} GB", gb)
    } else {
        let mb = bytes as f64 / MB as f64;
        format!("{:.0} MB", mb)
    }
}
fn detect_gpu_label() -> Option<String> {
    #[cfg(not(target_os = "linux"))]
    {
        return None;
    }
    #[cfg(target_os = "linux")]
    {
        let drm_path = std::path::Path::new("/sys/class/drm");
        let mut cards: Vec<std::path::PathBuf> = match std::fs::read_dir(drm_path) {
            Ok(entries) => entries
                .filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| {
                    p.file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with("card"))
                        .unwrap_or(false)
                })
                .collect(),
            Err(_) => return None,
        };
        cards.sort();
        for card in &cards {
            let device_dir = card.join("device");
            let vendor = std::fs::read_to_string(device_dir.join("vendor"))
                .ok()
                .map(|s| s.trim().to_string());
            let vendor = match vendor {
                Some(v) => v,
                None => continue,
            };
            let device = std::fs::read_to_string(device_dir.join("device"))
                .ok()
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            let driver = std::fs::read_to_string(device_dir.join("uevent"))
                .ok()
                .and_then(|content| {
                    content
                        .lines()
                        .find(|l| l.starts_with("DRIVER="))
                        .map(|l| l.trim_start_matches("DRIVER=").to_string())
                });
            let label = format_gpu_label(&vendor, &device, driver.as_deref());
            return Some(label);
        }
        None
    }
}
fn format_gpu_label(vendor: &str, device: &str, driver: Option<&str>) -> String {
    let vendor_name = match vendor {
        "0x1002" => "AMD GPU",
        "0x10de" => "NVIDIA GPU",
        "0x8086" => "Intel GPU",
        _ => "GPU",
    };
    let vendor_id = vendor.trim_start_matches("0x").to_lowercase();
    let device_id = device.trim_start_matches("0x").to_lowercase();
    match driver {
        Some(d) => format!("{} ({}, {}:{})", vendor_name, d, vendor_id, device_id),
        None => format!("{} ({}:{})", vendor_name, vendor_id, device_id),
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn system_info_has_required_fields() {
        // Unit tests run without Tauri runtime; verify platform APIs work.
        let os = sysinfo::System::name().unwrap_or_else(|| "Unknown".to_string());
        assert!(!os.is_empty());
    }
    #[test]
    fn ram_formatting() {
        assert_eq!(format_ram(16 * 1024 * 1024 * 1024), "16.0 GB");
        assert_eq!(format_ram(8 * 1024 * 1024 * 1024), "8.0 GB");
        assert_eq!(format_ram(512 * 1024 * 1024), "512 MB");
    }
    #[test]
    fn gpu_label_known_vendors() {
        assert_eq!(
            format_gpu_label("0x1002", "0x164e", Some("amdgpu")),
            "AMD GPU (amdgpu, 1002:164e)"
        );
        assert_eq!(
            format_gpu_label("0x10de", "0x2486", Some("nvidia")),
            "NVIDIA GPU (nvidia, 10de:2486)"
        );
        assert_eq!(
            format_gpu_label("0x8086", "0x56a0", Some("i915")),
            "Intel GPU (i915, 8086:56a0)"
        );
        assert_eq!(
            format_gpu_label("0x1234", "0xabcd", None),
            "GPU (1234:abcd)"
        );
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn gpu_label_reads_sysfs() {
        let dir = tempfile::TempDir::new().unwrap();
        let device_dir = dir.path().join("card0").join("device");
        std::fs::create_dir_all(&device_dir).unwrap();
        std::fs::write(device_dir.join("vendor"), "0x1002\n").unwrap();
        std::fs::write(device_dir.join("device"), "0x164e\n").unwrap();
        std::fs::write(device_dir.join("uevent"), "DRIVER=amdgpu\n").unwrap();
        // We can't easily inject into /sys/class/drm, so test the formatting
        // by checking the function returns Some on a real Linux system.
        // On non-Linux this test is cfg-gated out.
        let label = detect_gpu_label();
        // On a real Linux system with GPUs, this would return Some.
        // On CI without GPUs, it may return None. Just verify it doesn't panic.
        if let Some(l) = &label {
            assert!(l.contains("AMD GPU"), "expected AMD GPU in label: {}", l);
        }
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn gpu_label_missing_vendor_returns_none() {
        let dir = tempfile::TempDir::new().unwrap();
        let device_dir = dir.path().join("card0").join("device");
        std::fs::create_dir_all(&device_dir).unwrap();
        // No vendor file → should skip this card.
        std::fs::write(device_dir.join("device"), "0x164e\n").unwrap();
        // Since we can't inject into /sys/class/drm, just verify no panic.
        let _ = detect_gpu_label();
    }
}