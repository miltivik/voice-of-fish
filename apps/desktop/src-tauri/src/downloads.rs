use crate::models::{LocalModel, ModelState};

pub fn list_mock_models() -> Vec<LocalModel> {
    LocalModel::mock_manifest()
}

pub fn mark_mock_downloaded(model_id: &str) -> Vec<LocalModel> {
    LocalModel::mock_manifest()
        .into_iter()
        .map(|mut model| {
            if model.id == model_id {
                model.state = ModelState::Installed;
            }
            model
        })
        .collect()
}

pub fn mark_mock_deleted(model_id: &str) -> Vec<LocalModel> {
    LocalModel::mock_manifest()
        .into_iter()
        .map(|mut model| {
            if model.id == model_id {
                model.state = ModelState::NotInstalled;
            }
            model
        })
        .collect()
}
