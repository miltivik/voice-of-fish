# Voice of Fish Bilingual Setup Guide Design

## Goal

Add a bilingual Windows/Linux setup guide to onboarding so a new user can build `s2.cpp`, download compatible model files, connect the binary, select a model, and choose an output folder without leaving the guided flow.

## Scope

### Included

- Quick guide collapsed inside onboarding engine step.
- Language selector: `Español` and `English`.
- Full local guide opened inside onboarding.
- Windows PowerShell and Linux shell instructions.
- Fixed external links to community `s2.cpp` repository and compatible GGUF model repository.
- Copy sourced through existing `i18n.ts` catalog.
- Focused component tests for guide visibility, language switching, full-guide navigation, and fixed external actions.

### Excluded

- Automatic dependency installation.
- Automatic `git clone`, compilation, model download, or shell execution.
- macOS instructions.
- Remote documentation page controlled by Voice of Fish.
- Arbitrary URLs supplied by UI.
- Persisting guide language outside current onboarding session.

## Verified Sources

- Community engine repository: `https://github.com/rodrigomatta/s2.cpp`
- Compatible GGUF repository and quick start: `https://huggingface.co/rodrigomt/s2-pro-gguf/blob/main/README.md`
- Current Hugging Face CLI guide: `https://huggingface.co/docs/huggingface_hub/guides/cli`
- Current Hugging Face download guide: `https://huggingface.co/docs/huggingface_hub/guides/download`

The GGUF model card requires C++17, CMake, a source build of `s2.cpp`, one compatible GGUF file, and `tokenizer.json`. Its quick start still shows deprecated `huggingface-cli download`. Voice of Fish documentation must use current `hf download`.

## UX Design

### Engine Step Integration

Keep existing `Connect s2.cpp` heading, experimental badge, binary picker, validation status, and source link.

Add a secondary help section below experimental badge and above binary picker:

- Collapsed trigger in Spanish: `¿Necesitas instalar s2.cpp? Ver guía rápida`
- Collapsed trigger in English: `Need to install s2.cpp? View quick guide`
- Native `<details>` / `<summary>` pattern for keyboard and screen-reader support.
- Language selector inside expanded panel: `Español | English`
- Five numbered summary steps.
- Platform-separated command blocks labeled `Windows PowerShell` and `Linux shell`.
- Button: `Abrir guía completa` / `Open full guide`

### Quick Guide Steps

1. Install prerequisites: Git, CMake, and a C++17 compiler. Vulkan support is optional but recommended for GPU execution.
2. Clone `s2.cpp` with submodules.
3. Build Release binary.
4. Install current Hugging Face CLI and download `s2-pro-q6_k.gguf` plus `tokenizer.json`.
5. Return to Voice of Fish and choose binary, GGUF model, and output folder.

Quick guide command blocks:

```powershell
git clone --recurse-submodules https://github.com/rodrigomatta/s2.cpp.git
cd s2.cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release -DS2_VULKAN=ON
cmake --build build --config Release --parallel
```

```sh
git clone --recurse-submodules https://github.com/rodrigomatta/s2.cpp.git
cd s2.cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release -DS2_VULKAN=ON
cmake --build build --parallel "$(nproc)"
```

Hugging Face CLI installation and model download:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"
hf download rodrigomt/s2-pro-gguf s2-pro-q6_k.gguf tokenizer.json --local-dir .
```

```sh
curl -LsSf https://hf.co/cli/install.sh | bash
hf download rodrigomt/s2-pro-gguf s2-pro-q6_k.gguf tokenizer.json --local-dir .
```

### Full Local Guide

`Abrir guía completa` / `Open full guide` switches engine-step content to a local guide view rendered by React. No browser, filesystem document, or shell launch.

Full guide contains:

- Short explanation of community/experimental status.
- Windows requirements and build instructions.
- Linux requirements and build instructions.
- Hugging Face CLI installation and model download instructions.
- Typical binary locations:
  - Windows: search under `build\Release\s2.exe` or `build\s2.exe`.
  - Linux: `build/s2`.
- Model files required in same chosen models directory:
  - One supported GGUF: Q8, Q6, Q5, or Q4.
  - `tokenizer.json`.
- Return-to-app checklist:
  - Choose binary.
  - Choose supported GGUF file.
  - Choose output folder.
  - Finish setup.
- Troubleshooting:
  - `Binary missing`: verify selected path points to built file.
  - Linux executable rejected: run `chmod +x build/s2`.
  - Build without Vulkan: rebuild without `-DS2_VULKAN=ON`.
  - Model rejected: choose GGUF, not Safetensors or F16.
- Fixed actions:
  - `Open s2.cpp repository`
  - `Open GGUF models`
  - `Back to setup`

## Component Design

Create `apps/desktop/src/components/settings/OnboardingInstallGuide.tsx`.

Responsibilities:

- Own local guide language state.
- Own quick/full view state.
- Render localized guide copy.
- Call existing `openExternalLink("engineSource")`.
- Call existing `openExternalLink("ggufSource")`.

Keep `OnboardingEngineStep.tsx` responsible for binary path and validation only. Compose `OnboardingInstallGuide` inside it.

Use existing `openExternalLink()` allowlist. No new arbitrary URL API.

## Accessibility

- Use native `<details>` and `<summary>` for quick guide disclosure.
- Use semantic `<ol>`, `<section>`, `<h3>`, and `<pre><code>`.
- Give language selector an accessible label.
- Use real `<button>` elements for full-guide navigation and fixed external actions.
- Preserve visible focus styles.
- Do not rely on color alone for language selection or notices.

## Testing

Add focused tests:

- Quick guide starts collapsed.
- Trigger opens quick guide.
- Spanish copy is default.
- Selector switches to English.
- Full-guide button shows local full guide.
- Back button returns to setup help.
- Repository actions call fixed `engineSource` and `ggufSource` keys.
- Existing binary validation and onboarding completion remain unchanged.

Run:

```sh
pnpm exec vitest run src/components/settings/OnboardingInstallGuide.test.tsx
pnpm exec vitest run src/components/layout/AppShell.test.tsx
pnpm --filter @voice-of-fish/desktop lint
pnpm exec prettier --check src/components/settings/OnboardingInstallGuide.tsx src/components/settings/OnboardingInstallGuide.test.tsx src/components/settings/OnboardingEngineStep.tsx src/lib/i18n.ts
```

Existing unrelated suite/build blockers must be reported separately if still present.

## Acceptance Criteria

- User can open bilingual quick setup help from engine step.
- User can switch between Spanish and English without leaving onboarding.
- User can open a complete local guide and return to engine setup.
- Guide covers complete Windows/Linux flow from prerequisites through output folder.
- Commands use current `hf download`.
- UI performs no install, build, download, or arbitrary shell execution.
- Existing onboarding path remains functional.
