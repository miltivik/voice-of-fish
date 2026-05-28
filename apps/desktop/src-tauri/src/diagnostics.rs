use crate::models::SystemInfo;
use sysinfo::System;

pub fn get_real_system_info() -> SystemInfo {
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

    // sysinfo does not reliably enumerate GPUs; leave as None for now.
    let gpu: Option<String> = None;

    let app_version = env!("CARGO_PKG_VERSION").to_string();

    SystemInfo {
        os,
        cpu,
        ram_label,
        gpu,
        app_version,
        engine_version: None,
        binary_found: None,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn system_info_has_all_required_fields() {
        let info = get_real_system_info();
        assert!(!info.os.is_empty());
        assert!(!info.cpu.is_empty());
        assert!(!info.ram_label.is_empty());
        assert!(!info.app_version.is_empty());
    }

    #[test]
    fn ram_formatting() {
        assert_eq!(format_ram(16 * 1024 * 1024 * 1024), "16.0 GB");
        assert_eq!(format_ram(8 * 1024 * 1024 * 1024), "8.0 GB");
        assert_eq!(format_ram(512 * 1024 * 1024), "512 MB");
    }
}