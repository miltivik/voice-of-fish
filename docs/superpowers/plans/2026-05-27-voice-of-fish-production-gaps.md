# Voice of Fish Production-Ready Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

## Summary

Close 7 production-readiness gaps: real s2.cpp generation with controlled arg vectors, POSIX executable permission checks, merge duplicate mock clients, async folder picker, Hyprland window class, React error boundary, and loading skeletons.

## 1. Goal

Make Voice of Fish actually generate audio by spawning the configured `s2.cpp` binary with controlled CLI arguments, validate the binary is a real executable (not just any file), eliminate duplicated mock code, make the Rust folder picker non-blocking, add Hyprland-friendly window class, and add basic error/loading UI resilience.

Success criteria:
- `run_generation` spawns `s2.cpp` with `--model`, `--text`, `--language`, `--output` args and returns a real `GenerationJob`
- `check_binary_exists` on Linux verifies POSIX executable permissions
- Only one `mockClient` exists (in `lib/mock-data.ts`; `lib/tauri.ts` re-exports it)
- `pick_folder` uses async Tauri dialog API
- Window has `initialClass: "Voice of Fish"` for Hyprland matching
- App has `<ErrorBoundary>` wrapping routes
- Dashboard shows `<Skeleton>` while system info loads

## 2. Scope

### In scope
- Spawn `s2.cpp` with arg vectors from `GenerationCommandSpec`
- POSIX `is_executable()` check in `check_binary_exists`
- Deduplicate mock clients
- Async folder picker
- Window class config
- `ErrorBoundary` + `Skeleton` components
- Tests covering the above

### Out of scope
- Model downloads / Hugging Face integration
- Voice presets / cloning
- History persistence (beyond existing stubs)
- Settings page implementation
- E2E test expansion (requires Tauri runtime)

## 3. Task breakdown

### Task 1 — Fix binary validation: POSIX executable check

**Files:**
- Modify `apps/desktop/src-tauri/src/commands.rs` (around `check_binary_exists`)

**Steps:**
1. Read the current `check_binary_exists` implementation
2. On Linux (`#[cfg(unix)]`), after `canonical.is_file()`, add `std::fs::metadata(&canonical).map(|m| m.permissions().mode() & 0o111 != 0).unwrap_or(false)`
3. Add Rust tests: temp file without exec bit → false, temp file with exec bit → true
4. Run: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`

**Acceptance:** Linux-only executable check passes. Windows unchanged. 44+ Rust tests pass.

---

### Task 2 — Real s2.cpp generation

**Files:**
- Modify `apps/desktop/src-tauri/src/process.rs` — `spawn_generation()`
- Modify `apps/desktop/src-tauri/src/commands.rs` — `run_generation()`
- Modify `apps/desktop/src-tauri/src/models.rs` — `GenerationCommandSpec`

**Steps:**
1. Read current `spawn_generation` in `process.rs`
2. Replace mock spawn with real `std::process::Command::new(spec.binary_path)` using arg vector from `spec.args`
3. Map `GenerationRequest` fields to `s2.cpp` CLI flags:
   - `--model <model_path>` — from config modelsPath + model filename
   - `--text <text>` — from request.text
   - `--language <lang>` — from request.language
   - `--output <output_path>` — constructed output path
   - `--seed <seed>` — optional
4. Pipe stdout/stderr to `GenerationLogLine` collector
5. On process exit, update `GenerationJob` status to "completed" or "failed"
6. Update Rust tests: verify `GenerationCommandSpec::from_request()` produces correct arg vector
7. Run: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`

**Acceptance:** `run_generation` spawns real process. `GenerationCommandSpec` maps request fields to correct CLI flags. Rust tests pass.

---

### Task 3 — Async folder picker

**Files:**
- Modify `apps/desktop/src-tauri/src/commands.rs` — `pick_folder`

**Steps:**
1. Read current `pick_folder` (uses `blocking_pick_folder`)
2. Replace with async version using `tauri_plugin_dialog::DialogExt`:
   ```rust
   #[tauri::command(rename_all = "camelCase")]
   pub async fn pick_folder(_title: Option<String>, app: tauri::AppHandle) -> Option<String> {
       use tauri_plugin_dialog::DialogExt;
       app.dialog()
           .file()
           .pick_folder(|_| {})
           .map(|p| p.as_path().map(|path| path.to_string_lossy().to_string()))
           .unwrap_or(None)
   }
   ```
3. Run: `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml`

**Acceptance:** No `blocking_pick_folder` in codebase. Rust compiles.

---

### Task 4 — Deduplicate mock clients

**Files:**
- Modify `apps/desktop/src/lib/tauri.ts` — remove inline `mockClient`, re-export from mock-data
- Modify `apps/desktop/src/lib/mock-data.ts` — add missing `checkFileExists`/`checkDirectoryExists` exports if needed

**Steps:**
1. Read both files
2. In `tauri.ts`: delete the inline `mockClient` definition (lines ~155-216) and replace with:
   ```ts
   export { mockClient } from "./mock-data";
   ```
3. Verify `mock-data.ts` exports all methods matching `StudioClient` interface
4. Run: `pnpm --filter @voice-of-fish/desktop test`
5. Run: `pnpm --filter @voice-of-fish/desktop build:web`

**Acceptance:** Only one `mockClient` definition exists. All tests pass. Build passes.

---

### Task 5 — Window class for Hyprland

**Files:**
- Modify `apps/desktop/src-tauri/tauri.conf.json`

**Steps:**
1. Add `"identifier": "voice-of-fish"` to the window config object (if not already implicit)
2. Tauri v2 uses the bundle identifier as the WM_CLASS by default. Verify `"identifier": "com.voiceoffish.desktop"` at root level
3. If Tauri v2 supports explicit `class` in window config, add it. Otherwise document the default class in `docs/hyprland-setup.md`:
   ```sh
   hyprctl clients | grep -i "voice-of-fish"
   ```
4. Update `docs/hyprland-setup.md` with the correct class value

**Acceptance:** Hyprland users can match the window. Docs updated with correct `hyprctl clients` output expectation.

---

### Task 6 — Error boundary + loading skeletons

**Files:**
- Create `apps/desktop/src/components/ui/ErrorBoundary.tsx`
- Create `apps/desktop/src/components/ui/Skeleton.tsx`
- Modify `apps/desktop/src/app/App.tsx` — wrap routes with ErrorBoundary
- Modify `apps/desktop/src/features/dashboard/DashboardPage.tsx` — add Skeleton loading
- Modify `apps/desktop/src/components/layout/EngineHeader.tsx` — add Skeleton for OS badge

**Steps:**
1. Create `ErrorBoundary.tsx`: class component with `componentDidCatch`, renders fallback UI with "Something went wrong" + reload button
2. Create `Skeleton.tsx`: simple `div` with `animate-pulse bg-line rounded` classes, accepts `className` prop
3. In `App.tsx`: wrap `<AppRoutes />` with `<ErrorBoundary>`
4. In `DashboardPage.tsx`: wrap system info section with `{systemInfo.isLoading && <Skeleton className=\"h-20 w-full\" />}`
5. Run: `pnpm --filter @voice-of-fish/desktop test`

**Acceptance:** App doesn't white-screen on error. Dashboard shows skeleton while loading. Tests pass.

---

### Task 7 — Final verification

Run all checks:
```sh
pnpm --filter @voice-of-fish/desktop test
pnpm --filter @voice-of-fish/shared test
pnpm --filter @voice-of-fish/desktop lint
pnpm --filter @voice-of-fish/desktop build:web
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## 4. Verification commands

From `/home/endo/Desktop/miltivik/proyectos/voice-of-fish`:

```sh
pnpm --filter @voice-of-fish/desktop test
pnpm --filter @voice-of-fish/shared test  
pnpm --filter @voice-of-fish/desktop lint
pnpm --filter @voice-of-fish/desktop build:web
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```
