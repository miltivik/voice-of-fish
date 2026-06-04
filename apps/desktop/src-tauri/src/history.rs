use crate::models::{GenerationJob, HistoryRecord};
use serde_json;
use std::path::PathBuf;

const HISTORY_DIR: &str = ".voice-of-fish";
const HISTORY_FILE: &str = "history.json";

fn history_path(outputs_path: &str) -> PathBuf {
    PathBuf::from(outputs_path)
        .join(HISTORY_DIR)
        .join(HISTORY_FILE)
}

/// Creates a `HistoryRecord` from a completed or cancelled `GenerationJob`.
pub fn record_from_job(job: &GenerationJob) -> HistoryRecord {
    HistoryRecord {
        id: job.id.clone(),
        text: job.text.clone(),
        model_id: job.model_id.clone(),
        voice_name: job.voice_preset_id.clone(),
        output_path: job.output_path.clone().unwrap_or_default(),
        created_at: job.created_at.clone(),
        duration_seconds: job.duration_seconds,
        status: job.status.clone(),
    }
}

/// Lists history records from the JSON file.
/// Returns an empty vec if the file does not exist or is corrupt.
pub fn list_history(outputs_path: &str, limit: Option<usize>) -> Vec<HistoryRecord> {
    let path = history_path(outputs_path);

    let data = match std::fs::read_to_string(&path) {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };

    let mut records: Vec<HistoryRecord> =
        serde_json::from_str(&data).unwrap_or_default();

    if let Some(n) = limit {
        let skip = records.len().saturating_sub(n);
        records = records.into_iter().skip(skip).collect();
    }
    records
}

/// Appends a history record and persists to disk.
pub fn append_history(outputs_path: &str, record: &HistoryRecord) -> Result<(), String> {
    let path = history_path(outputs_path);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create history directory: {e}"))?;
    }

    let mut records = list_history(outputs_path, None);
    records.push(record.clone());

    let json = serde_json::to_string_pretty(&records)
        .map_err(|e| format!("failed to serialize history: {e}"))?;

    std::fs::write(&path, json)
        .map_err(|e| format!("failed to write history file: {e}"))?;

    Ok(())
}

/// Updates an existing history record by id. If the record is not found,
/// appends it as a new record. Used when a generation completes to persist
/// the final status, duration, and output path.
pub fn update_history(outputs_path: &str, record: &HistoryRecord) -> Result<(), String> {
    let path = history_path(outputs_path);

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("failed to create history dir: {e}"))?;
    }

    let mut records = list_history(outputs_path, None);

    if let Some(existing) = records.iter_mut().find(|r| r.id == record.id) {
        existing.status = record.status.clone();
        existing.duration_seconds = record.duration_seconds;
        existing.output_path = record.output_path.clone();
    } else {
        records.push(record.clone());
    }

    let json = serde_json::to_string_pretty(&records)
        .map_err(|e| format!("failed to serialize history: {e}"))?;

    std::fs::write(&path, json)
        .map_err(|e| format!("failed to write history file: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::GenerationStatus;
    use tempfile::TempDir;

    fn make_record(id: &str, text: &str) -> HistoryRecord {
        HistoryRecord {
            id: id.to_string(),
            text: text.to_string(),
            model_id: "s2-q6".to_string(),
            voice_name: None,
            output_path: "/outputs/test.wav".to_string(),
            created_at: "2026-05-26T12:00:00.000Z".to_string(),
            duration_seconds: Some(3.5),
            status: GenerationStatus::Completed,
        }
    }

    #[test]
    fn empty_history_returns_empty_list() {
        let dir = TempDir::new().unwrap();
        let records = list_history(dir.path().to_str().unwrap(), None);
        assert!(records.is_empty());
    }

    #[test]
    fn append_creates_directory_and_file() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let record = make_record("job-1", "hello");

        append_history(outputs, &record).unwrap();
        let records = list_history(outputs, None);
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].id, "job-1");
    }

    #[test]
    fn limit_truncates_records() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();

        for i in 0..5 {
            append_history(outputs, &make_record(&format!("job-{i}"), "test")).unwrap();
        }

        let records = list_history(outputs, Some(2));
        assert_eq!(records.len(), 2);
    }

    #[test]
    fn corrupt_file_returns_empty() {
        let dir = TempDir::new().unwrap();
        let outputs = dir.path().to_str().unwrap();
        let history_dir = PathBuf::from(outputs).join(HISTORY_DIR);
        std::fs::create_dir_all(&history_dir).unwrap();
        std::fs::write(history_dir.join(HISTORY_FILE), b"not valid json").unwrap();

        let records = list_history(outputs, None);
        assert!(records.is_empty());
    }
}