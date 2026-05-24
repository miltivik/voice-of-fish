# Voice of Fish Onboarding Design

Date: 2026-05-24

Internal product name: S2 Pro GGUF Studio

## Goal

Replace the minimal setup form with a Windows-first guided onboarding wizard that helps a user connect an existing local `s2.cpp` installation, choose a compatible local GGUF model, and choose an output folder without automatically downloading or installing anything.

## Scope

This feature covers first-run setup UI and the configuration values needed to enter the existing application shell.

In scope:

- Three-step onboarding wizard shown before the sidebar application shell.
- Manual selection of local engine binary, models folder, compatible model file, and output folder.
- Buttons that open folders or open source/license guidance pages.
- Informative handling for official Fish Audio BF16/Safetensors files.
- English copy through the existing i18n boundary.
- Validation, save state, and test coverage for onboarding behavior.

Out of scope:

- Automatic installation or build of `s2.cpp`.
- Automatic download, conversion, quantization, or checksum verification of models.
- Real GGUF download manager integration.
- Accepting arbitrary URLs or executable commands from the user.
- Supporting F16 GGUF as an onboarding choice in this MVP.

## Verified Source Distinction

Two artifact families must not be presented as interchangeable:

- Official Fish Audio S2 Pro model source: `https://huggingface.co/fishaudio/s2-pro`
  - Published as Safetensors with tensor type `BF16`.
  - Relevant for official source and license review.
  - Not directly selectable as a `s2.cpp` GGUF model in this onboarding.
- Community `s2.cpp` compatible GGUF source: `https://huggingface.co/rodrigomt/s2-pro-gguf`
  - Contains GGUF variants for local `s2.cpp` inference.
  - Current source also exposes an F16 GGUF file, but this MVP intentionally offers only Q8, Q6, Q5, and Q4 choices.

Engine guidance source:

- Community `s2.cpp` repository: `https://github.com/rodrigomatta/s2.cpp`
  - Its README identifies it as alpha/experimental community software.
  - Onboarding must label this status rather than imply official Fish Audio engine support.

## User Flow

When configuration is incomplete, show onboarding alone. Do not show sidebar navigation, header, or footer until setup is successfully saved.

Progress rail:

1. `Engine`
2. `Model file`
3. `Output`

The user can move backward at any time. `Continue` remains disabled until the current step validates. `Finish setup` persists the completed config and enters the main application.

## Screen Layout

All steps share one stable desktop wizard layout:

- Full dark application background.
- Left progress rail with `Voice of Fish` brand, `LOCAL ONLY` badge, three numbered steps, and short privacy status.
- Main content surface with step heading, supporting copy, bounded setup panels, inline validation status, and bottom navigation row.
- Maximum readable content width; no sidebar from the primary app shell before completion.
- Subtle transition between steps only; avoid large marketing motion or decorative imagery.

Visual direction already explored in Pencil:

- `Onboarding / Step 1 - Engine`
- `Onboarding / Step 2 - Model`
- `Onboarding / Step 3 - Output`

The Step 2 revision includes the official format warning and was checked with no reported layout problems.

## Step 1: Engine

Heading: `Connect s2.cpp`

Purpose: select an existing local `s2.cpp` binary and explain that the app is only a local visual controller.

Copy requirements:

- State that `Voice of Fish` does not install the engine.
- State that generation remains local after the user provides engine and model files.
- Label the engine source as `COMMUNITY / EXPERIMENTAL`.

Controls:

- Read-only or manually entered validated binary path.
- Primary action: `Choose binary`.
- External link action: `View s2.cpp source`.
- Status line: `Binary found` or `Binary missing`.

Behavior:

- `Choose binary` opens a file picker appropriate to Windows executables.
- Selection is accepted only as a path input; it is not executed during the wizard.
- `View s2.cpp source` opens `https://github.com/rodrigomatta/s2.cpp`.
- Disable `Continue` until binary path exists and validation succeeds through the available backend boundary.

## Step 2: Model File

Heading: `Add an S2 Pro GGUF model`

Purpose: direct the user to select a local GGUF variant compatible with the configured engine.

Primary copy:

`Choose a compatible GGUF conversion for local inference. The official Fish Audio model is provided for source and license reference only.`

Selectable MVP variants:

| Variant | UI guidance |
| --- | --- |
| Q8 | Higher quality, higher memory use |
| Q6 | Recommended balance |
| Q5 | Better fit for limited GPU memory |
| Q4 | Lowest consumption, lower quality |

Do not add F16 to this selectable grid in the MVP, even though a community F16 GGUF artifact exists.

Controls:

- Quant choice with `Q6 RECOMMENDED` highlighted by default.
- Hardware guidance summary when system diagnostics are available.
- Models folder path.
- Model-file selection or detected matching `.gguf` file in that folder.
- Primary action: `Open models folder`.
- External link action: `View GGUF source`.
- External link action: `View source + license`.

Link mapping:

- `View GGUF source` opens `https://huggingface.co/rodrigomt/s2-pro-gguf`.
- `View source + license` opens `https://huggingface.co/fishaudio/s2-pro`.

Compatibility note block:

- Label: `OFFICIAL FORMAT NOTE`
- Body: `BF16 Safetensors files are not supported by s2.cpp.`

Validation behavior:

- Accept supported local model files mapped to Q8, Q6, Q5, or Q4 GGUF entries.
- Use `Q6` as general default guidance; a diagnostics-derived recommendation may override its highlight only when backed by a defined rule in the implementation. Do not invent VRAM thresholds in onboarding copy.
- If selection ends in `.safetensors`, reject it inline with: `Official BF16 Safetensors files cannot be used by s2.cpp. Choose a compatible GGUF model.`
- If selection is F16 GGUF, reject it for MVP with: `F16 GGUF is not enabled in this version. Choose Q8, Q6, Q5, or Q4.`
- If expected selected quant GGUF is absent, show: `No compatible GGUF model detected in this folder.`
- Do not download, convert, delete, or modify model files in onboarding.

## Step 3: Output

Heading: `Choose your output folder`

Purpose: select where generated WAV files will be written and confirm setup state.

Controls:

- Mode selector with `Simple` and `Advanced`; default to `Simple`.
- Output folder path.
- Primary action: `Open output folder`.
- Final validation summary for engine, selected model, and output folder.
- Primary completion action: `Finish setup`.

Behavior:

- `Simple` remains recommended for initial use and preserves single-generation-process behavior.
- `Advanced` enables advanced settings after onboarding; it does not expose raw engine arguments inside the wizard.
- Use WAV as default output format.
- Display the selected engine, model variant/file, and output path before completion.
- Disable `Finish setup` until all three values are valid.
- Save existing `AppConfig` fields with `defaultModelId` derived from the selected quant and existing defaults for audio format and advanced settings.

## Data and State

Existing `AppConfig` remains the persisted configuration contract:

- `mode`
- `binaryPath`
- `modelsPath`
- `outputsPath`
- `defaultModelId`
- `defaultAudioFormat`
- `cpuThreads`
- `gpuEnabled`
- `advancedArgs`

Onboarding adds transient form state, not a new persisted engine:

- Active step: `engine`, `model`, or `output`.
- Selected supported quant/model ID.
- Selected local GGUF file path if required by the current model boundary.
- Per-step validation result and saving state.

If the implementation needs to persist an explicit selected model file path, that is a contract change. It must be added deliberately to shared TypeScript schemas, Rust config serialization, and tests together rather than hidden inside UI state.

## Component Boundary

Expected frontend ownership:

- `apps/desktop/src/components/settings/SetupPanel.tsx`: compose the wizard, submit completed config, preserve existing public save/error behavior.
- New focused onboarding components may live under `apps/desktop/src/components/settings/`, split by step and progress rail if `SetupPanel` would otherwise become difficult to test.
- `apps/desktop/src/lib/i18n.ts`: add English strings for all visible onboarding copy and validation messages.
- `packages/shared/src/schemas.ts`: extend validation only when required for supported model selection or persisted path contract.
- `apps/desktop/src/lib/tauri.ts`: expose file/folder picker or external-link calls only through controlled app APIs; feature UI must not call raw process execution.
- `apps/desktop/src/components/layout/AppShell.tsx`: retain onboarding gate that hides sidebar until setup completion.

Expected Tauri ownership where APIs do not already exist:

- Dialog/open-folder/external URL actions use Tauri plugins already permitted by app capabilities.
- Binary/model validation may delegate to a typed Tauri command; it must not execute arbitrary commands supplied by UI.

## Security and Privacy

- No model or audio upload.
- No automatic download or installation.
- No arbitrary command arguments from onboarding.
- External actions open fixed source URLs only.
- Path input is validated at the Tauri boundary before file access or process use.
- Source/license links distinguish official Fish Audio artifacts from community GGUF/engine projects.

## Accessibility

- Wizard step rail identifies current step with visible state and `aria-current="step"` equivalent.
- Every file or folder action has a text label; no unlabeled icon-only control.
- Inline errors use accessible alert semantics and remain adjacent to failing input.
- Keyboard users can complete selection, navigate backward/forward, and submit.
- Disabled actions visually and programmatically expose unavailable state.
- Warning note for incompatible formats does not rely on color alone.

## i18n

English is default. All new displayed copy must be sourced through the existing text catalog boundary rather than embedded across feature components.

Keys should cover:

- Wizard step names and headings.
- Button labels.
- Source/status badges.
- Quant guidance.
- Mode labels and hardware guidance status.
- Official format warning.
- Validation and save errors.
- Summary labels.

No translation beyond English is required in this feature.

## Tests

Component/unit coverage must include:

- Sidebar remains absent while onboarding is incomplete.
- Engine step blocks continuation without valid binary selection.
- Model step shows Q6 as recommended and only Q8/Q6/Q5/Q4 as selectable options.
- `.safetensors` selection shows official BF16 incompatibility error.
- F16 GGUF selection shows MVP-not-enabled error.
- Output step prevents finish until required selections validate.
- Mode selection saves `simple` by default and permits explicit `advanced` selection.
- Successful completion sends expected `AppConfig` and reveals the application shell.
- English catalog contains and serves all visible onboarding strings used in components.

Playwright coverage must include:

- First-run wizard route from Engine through Output using mocked valid local selections.
- External guidance actions rendered with correct purpose and without automatic download flow.
- App navigation becomes available only after setup completion.

## Acceptance Criteria

- First-run user sees a three-step wizard, not the full navigation shell.
- User can choose existing binary, compatible GGUF model, and output folder using clearly labeled controls.
- User can open engine source, GGUF source, and official model/license source links.
- UI never suggests that official BF16/Safetensors is directly usable in `s2.cpp`.
- Q8/Q6/Q5/Q4 are the only selectable MVP model variants; Q6 is recommended.
- F16 GGUF is intentionally excluded and yields an actionable message if selected.
- Saving valid setup enters the existing application shell.
- No installation, download, conversion, or raw shell execution is introduced by onboarding.
- Unit and E2E tests exercise supported and incompatible-format paths.

## Later Work

- Model Manager-controlled downloads with checksums and explicit user confirmation.
- Optional F16 GGUF support after hardware guidance and performance expectations are tested.
- Real model file discovery/integrity checks coordinated with the backend model manifest.
- Additional locales after English onboarding is stable.
