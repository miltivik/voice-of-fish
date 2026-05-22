# Voice Of Fish Mock Desktop Design

Date: 2026-05-22

Internal product name: S2 Pro GGUF Studio

## Goal

Build first stable slice of a Windows-first local desktop studio for Fish Audio S2 Pro GGUF models through `s2.cpp`.

This slice creates executable workspace, navigable desktop UI, mock async state, model/generation surfaces, and Rust command/process boundaries ready for real `s2.cpp` integration. It does not run real inference, download real models, persist history, or ship `s2.cpp` binaries.

## Product Constraints

- Package manager: pnpm.
- Desktop shell: Tauri v2.
- Frontend: React, TypeScript, Vite.
- UI stack: Tailwind CSS, shadcn/ui primitives, lucide-react, sonner, framer-motion.
- App state: Zustand for session and draft UI state.
- Async state: TanStack Query for mock reads/mutations and later Tauri command integration.
- Forms: React Hook Form with Zod.
- Audio player/waveform: wavesurfer.js behind a focused component boundary.
- Tests: Vitest and Playwright.
- Code quality: ESLint and Prettier.
- App data stays local. No cloud upload path.
- Do not reimplement model or inference engine.
- Do not invent real `s2.cpp` flags outside documented adapter point.

## Platform Scope

Windows is first target.

Project structure keeps `src-tauri/binaries/windows`, `src-tauri/binaries/linux`, and `src-tauri/binaries/macos` so later platform work has explicit homes. This first slice does not promise Linux or macOS binaries, installers, or platform QA.

The app UI defaults to English. Text access is wrapped through an initial catalog boundary so later i18n work does not require hunting through feature components. Full localization tooling is deferred until another language is implemented.

## Chosen Approach

Use real pnpm workspace and Tauri shell now, while backend behavior remains mock-first.

This gives UI and desktop boundaries early without forcing fragile inference integration before actual `s2.cpp` Windows invocation, binary validation, and flags are known. Current upstream information marks `s2.cpp` as community-built and alpha, and current GGUF usage requires local model and tokenizer files. Backend command contracts must remain narrow enough to adapt when engine details settle.

Rejected approaches:

1. Frontend-only Vite prototype. Faster UI start, but Tauri permissions, filesystem commands, and process shape would be deferred and reshaped later.
2. Real process and download integration in first slice. Useful validation, but it makes initial scaffold depend on native engine build, model artifacts, checksum availability, and current `s2.cpp` flags.

## Workspace Architecture

Use current empty `voice-of-fish` folder as workspace root.

```text
/
  apps/
    desktop/
      src/
        app/
        components/
        features/
        lib/
        stores/
        types/
      src-tauri/
        src/
        binaries/
          windows/
          linux/
          macos/
  packages/
    shared/
      src/
  docs/
    superpowers/
      specs/
  package.json
  pnpm-workspace.yaml
  README.md
```

`apps/desktop` owns desktop UI and Tauri application code. `packages/shared` owns Zod schemas, constants, and shared TypeScript-facing contracts needed across features.

Frontend modules follow requested layout:

- `app`: providers, routes, application composition.
- `components/ui`: shadcn-derived primitives.
- `components/layout`: sidebar, header, footer, page shell.
- `components/audio`, `components/model`, `components/generation`, `components/settings`, `components/logs`: reusable domain UI.
- `features`: screen and workflow ownership.
- `lib`: Tauri wrapper, paths, validators, formatters, text catalog helper.
- `stores`: Zustand stores for app, generation, model UI session state.
- `types`: desktop-local UI types if shared package contract is not appropriate.

Rust modules follow requested backend boundaries:

- `commands.rs`: Tauri command handlers.
- `process.rs`: future child process manager boundary.
- `models.rs`: model inventory/delete contract.
- `downloads.rs`: controlled download boundary.
- `diagnostics.rs`: system and engine diagnostics boundary.
- `config.rs`: application config contract.

## Root Commands

Root `package.json` exposes:

- `pnpm dev`: run Tauri app in development.
- `pnpm build`: build desktop app.
- `pnpm lint`: run ESLint.
- `pnpm format`: run Prettier.
- `pnpm test`: run Vitest.
- `pnpm test:e2e`: run Playwright.

Root scripts delegate to `apps/desktop` where practical.

## UI Design

UI feels like a serious audio and local-AI workbench:

- Dark by default.
- Restrained surfaces, clean spacing, small useful motion.
- Fixed left sidebar.
- Top engine status header.
- Main panel per route.
- Small footer status line.
- Cards only for bounded panels and repeated item units, not decorative marketing layout.

Primary routes:

- Dashboard
- Generate
- Voices
- Models
- History
- Settings
- Diagnostics

## Screen Behavior

### Setup

Show initial setup when mock config is incomplete.

Inputs and decisions:

- Simple or advanced mode.
- Models folder.
- Outputs folder.
- `s2.cpp` binary path.
- Hardware recommendation summary from mock diagnostics.

Setup detects operating system through mock diagnostics now and through Tauri later.

### Dashboard

Summarize:

- Mock engine readiness.
- Active/default model.
- Installed model count.
- Last generation summary.
- Shortcuts into Generate, Models, Settings, Diagnostics.

### Generate

This is main work surface.

Include:

- Text area.
- Emotion/style tag chips inserted at textarea cursor.
- Model selector.
- Language selector.
- Optional seed.
- Optional voice/reference preset selection.
- Generate button.
- Progress and generation state.
- Audio result panel with waveform/player component.
- Mock WAV export action.
- Recent generation list.

Supported quick tags:

- `[laughing]`
- `[whisper]`
- `[sad]`
- `[angry]`
- `[excited]`
- `[professional broadcast tone]`
- `[calm]`
- `[serious]`
- `[narration]`
- `[conversation]`

### Voices

Mock local preset workflow:

- Load reference file.
- Preview reference audio when available.
- Exact reference transcript.
- Voice name, language, optional notes.
- Supported input type validation for WAV, MP3, FLAC.
- Warning state when sample duration is outside recommended range.
- Preset list with local-shaped metadata.

### Models

Mock model manager supports Q8, Q6, Q5, Q4.

Each model item shows:

- Quantization.
- Filename.
- Approximate size.
- Quality/VRAM recommendation.
- State: not installed, downloading, installed, error.
- Mock download action.
- Delete action with confirmation.
- Integrity status slot when checksum exists later.

Initial recommendations:

- Q8: more quality, more VRAM.
- Q6: recommended balance.
- Q5: more stable on limited GPUs.
- Q4: lower consumption, lower quality.

### History

Show recent generation records with:

- Text excerpt.
- Model.
- Reference voice.
- Date.
- Audio output path.
- Approximate duration.
- Status.

Persistence is deferred. Mock records use shape future persistence will store.

### Settings

Show:

- Binary path.
- Models path.
- Outputs path.
- Default model.
- Default audio format.
- CPU thread count.
- GPU toggle.
- Advanced engine config object fields only when advanced mode active.

Advanced args stay structured. UI does not accept arbitrary shell commands.

### Diagnostics

Show:

- Process logs.
- Last command display with sensitive path redaction slot.
- Latest generation error.
- OS.
- CPU.
- Approximate RAM.
- GPU when detectable.
- App version.
- `s2.cpp` version when query support exists.

## Data Contracts

### App Config

Config shape includes:

- Mode: simple or advanced.
- Binary path.
- Models path.
- Outputs path.
- Default model ID.
- Default audio format.
- CPU thread count.
- GPU enabled flag.
- Advanced engine argument object.

### Model Manifest

Model shape includes:

- Stable ID.
- Quantization label.
- GGUF filename.
- Optional tokenizer requirement marker.
- Approximate byte size/display size.
- Recommendation text.
- Download source descriptor for future controlled use.
- Optional checksum descriptor.
- Local install/download/error status.

### Generation Job

Generation shape includes:

- Text.
- Language.
- Optional seed.
- Model ID.
- Optional reference preset ID.
- Optional reference audio path and transcript.
- Output path.
- Creation/completion timestamps.
- Status: idle, preparing, generating, completed, failed.
- Log/error metadata.

### Voice Preset

Voice preset shape includes:

- Name.
- Reference audio metadata/path.
- Exact reference text.
- Language.
- Optional notes.

### History Record

History shape includes generation text, model, reference voice, date, output path, duration approximation, and terminal status.

## State Flow

Zustand owns user-facing session state:

- App config session status.
- Global footer status.
- Active model selection.
- Generation draft and selected reference voice.

TanStack Query owns mock asynchronous boundary:

- Config read/save mutation.
- Model list/download/delete mutation.
- Diagnostics read.
- Mock generation start/cancel/log reads.

Forms use React Hook Form and Zod schemas. Shared schemas validate setup, settings, generation request, and voice preset input.

Frontend talks to Tauri through `lib/tauri.ts`. Features do not call `invoke` directly. Mock adapters can be swapped for Tauri command adapters without changing every screen.

## Rust Command Boundary

Expose required commands from first slice:

- `get_system_info`
- `get_app_config`
- `save_app_config`
- `list_local_models`
- `download_model`
- `delete_model`
- `run_generation`
- `cancel_generation`
- `read_generation_logs`
- `open_output_folder`

Handlers return mock or stubbed responses in first slice, with explicit errors where OS behavior is not implemented yet.

`ProcessManager` owns future process execution shape:

- Single active child slot required by simple mode.
- Cancellation entry point.
- stdout/stderr capture boundary.
- bounded log buffer shape.
- command-display redaction helper seam.

`GenerationCommandSpec` is future adapter output, not user input. It contains validated binary path, controlled argument vector, working directory, output target, and metadata. Real mapping from app request to `s2.cpp` argument vector must live in one documented adapter when actual supported flags are chosen.

## Security Boundary

- No arbitrary shell command strings from UI.
- Child process execution limited to validated configured binary path and controlled argument vector.
- Paths are sanitized/validated at boundary before process or destructive operations.
- Delete model/audio flows require confirmation in UI.
- App uploads no text or audio.
- Downloads later use controlled model manifest sources, not arbitrary URLs from UI.
- Offline generation remains target after user downloads binaries/model artifacts.

## Errors

UI includes first-slice states for:

- Setup incomplete.
- Engine missing or unvalidated.
- No installed model.
- Invalid reference file type.
- Reference audio duration too short or too long warning.
- Mock generation failure.
- Model download/delete failure.
- Diagnostics loading, empty, and error state.

Errors surface as screen state and sonner notification where action feedback helps.

## Testing Strategy

Unit tests with Vitest:

- Shared Zod schemas.
- Tag insertion utility preserving cursor insertion behavior.
- Model recommendation/status formatting.
- Key Zustand store transitions.

React tests:

- Generate form essentials.
- Model manager mock download/delete action states.

Playwright:

- App shell navigation.
- Mock setup completion path.
- Generate happy UI path through completed mock job/player panel.

Verification commands must cover lint, unit tests, E2E where browser prerequisites exist, and build. Tauri build requires local Rust/Tauri Windows prerequisites; report any missing prerequisite explicitly.

## README Scope

README documents:

- Product purpose.
- Workspace layout.
- Windows-first status.
- Install/dev/build/test commands.
- Mock-first state.
- Security boundary.
- Real `s2.cpp` flag mapping location and why it stays isolated.
- Future steps: Tauri real commands, process manager execution, download integration, local history/presets.
- License note requiring review of Fish Audio model terms before distribution/use.

## Upstream Facts Used

At design time:

- Fish Audio describes S2 Pro as an open-source multilingual TTS model with inline natural-language prosody/emotion tags and voice cloning.
- Current GGUF packaging page lists `s2-pro-q8_0.gguf` around 5.3 GB, `s2-pro-q6_k.gguf` around 4.3 GB, `s2-pro-q5_k_m.gguf` around 3.8 GB, `s2-pro-q4_k_m.gguf` around 3.4 GB, plus `tokenizer.json`.
- Current GGUF page labels `s2.cpp` alpha/experimental and shows CLI examples including text, model, tokenizer, reference audio/text, and WAV output.

These facts guide mock labels and adapter shape. They do not lock future flags or distribution policy.

Source anchors:

- Fish Audio project README: `https://github.com/fishaudio/fish-speech`
- Current GGUF packaging and `s2.cpp` quick start: `https://huggingface.co/rodrigomt/s2-pro-gguf`
- Current community engine repository: `https://github.com/rodrigomatta/s2.cpp`

## Non-Goals For First Slice

- Real `s2.cpp` child process generation.
- Real model download and checksum verification.
- Bundling third-party model or engine artifacts.
- Cloud fallback.
- Persistent history database/store.
- Persistent local voice presets.
- Job queue or multi-process scheduling.
- Linux/macOS QA.
- Full localization framework and translations.

## Next Spec Targets

1. Real Tauri config/filesystem diagnostics and safe binary validation.
2. Real `s2.cpp` command adapter plus cancellable process execution on Windows.
3. Controlled Hugging Face model download and checksum path where metadata exists.
4. Persistent generation history and local voice presets.
