# Model Download System — Implementation Plan

## Diagnóstico

El sistema de descarga **ya existe** en Rust (`downloads.rs`):
- `download_model_file` usa `ureq` para HTTP GET, escribe a temp file, verifica SHA256 con `sha2`, renombra al final
- `delete_model_file` elimina archivos con verificación de path containment
- `LocalModel` ya tiene campos `download_url: Option<String>` y `checksum: Option<String>`

Lo único que falta:
1. **URLs reales** en los manifiestos (TS + Rust) — los `download_url` están vacíos/ausentes
2. **Progress reporting** — emitir eventos Tauri durante la descarga para mostrar barra de progreso en el frontend

## Task 1 — Agregar download URLs a los manifiestos

**Archivos:**
- `packages/shared/src/constants.ts` — `S2_MODEL_MANIFEST`
- `apps/desktop/src-tauri/src/models.rs` — `LocalModel::mock_manifest()`

**URLs HuggingFace:**
```
https://huggingface.co/rodrigomt/s2-pro-gguf/resolve/main/{filename}
```

Añadir `downloadUrl` a cada entry del manifiesto.

**Verificación:** `pnpm test` + `cargo test`

## Task 2 — Progress reporting en la descarga

**Archivos:**
- `apps/desktop/src-tauri/src/commands.rs` — `download_model` (ya existe, pero el frontend necesita progress)
- `apps/desktop/src-tauri/src/downloads.rs` — modificar `download_model_file` para aceptar un callback de progress
- `apps/desktop/src/features/model-manager/ModelManagerPage.tsx` — escuchar eventos y mostrar `<Progress>`

**Cambio Rust:** En `download_model_file`, mientras se copia el stream a disco, emitir eventos Tauri:
```rust
app.emit("download-progress", DownloadProgress { model_id, bytes_downloaded, total_bytes })?;
```

**Cambio Frontend:** En `ModelManagerPage`, usar `listen("download-progress", ...)` de `@tauri-apps/api/event` y mostrar una barra `<Progress>`.

**Verificación:** `pnpm test` + `cargo test`

## Task 3 — Verificación final
```sh
pnpm test && cargo test && pnpm lint && pnpm build:web
```
