# Voice of Fish

Local voice generation studio desktop app powered by s2.cpp. Compose script text, insert style tags, select model quants and voice presets, then generate audio locally — no cloud dependency, no data leaves your machine.

## Status

**Partial-real slice** — Configuration persistence, system diagnostics, and generation process management are now real (Tauri commands with actual sysinfo, path validation, binary detection, child process spawn/cancel/logs). Model downloads and voice cloning remain in mock mode. Generation uses documented placeholder flags; real audio output requires confirming the actual s2.cpp CLI flags.

**Cross-platform desktop target** — the desktop app supports Windows and Linux UX paths. Linux/Hyprland users can select extensionless `s2.cpp` binaries and should read [`docs/hyprland-setup.md`](docs/hyprland-setup.md) for Wayland-specific launch notes.

## Requirements

- **pnpm** >= 10.x
- **Node.js** >= 20.x (Vite 8 / Tauri 2 baseline)
- **Rust** toolchain with Tauri 2 prerequisites for your OS:
  - Windows: Microsoft Visual Studio C++ Build Tools and WebView2 runtime.
  - Linux: WebKitGTK/GTK stack and XDG desktop portal packages required by Tauri/WebKit on your distro.
  - See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Commands

| Command         | Description                         |
| --------------- | ----------------------------------- |
| `pnpm install`  | Install all workspace dependencies  |
| `pnpm dev`      | Start Tauri dev mode (Vite + Rust)  |
| `pnpm build`    | Build Tauri desktop application     |
| `pnpm lint`     | Lint desktop app (ESLint)           |
| `pnpm format`   | Format workspace (Prettier)         |
| `pnpm test`     | Run all Vitest unit/component tests |
| `pnpm test:e2e` | Run Playwright browser E2E tests    |

## Workspace

```
voice-of-fish/
├── apps/
│   └── desktop/                  # React + Tauri desktop app
│       ├── src/
│       │   ├── app/              # App shell, providers, routes
│       │   ├── components/
│       │   │   ├── audio/        # AudioWaveform (wavesurfer.js)
│       │   │   ├── generation/   # StyleTagBar, GenerationResult, RecentGenerations
│       │   │   ├── layout/       # Sidebar, EngineHeader, StatusFooter, AppShell
│       │   │   ├── logs/         # ProcessLogPanel
│       │   │   ├── model/        # ModelCard
│       │   │   ├── settings/     # SetupPanel
│       │   │   └── ui/           # Button, Card, Badge, Progress, Input, Textarea
│       │   ├── features/         # Dashboard, Generate, Voices, Models, History, Settings, Diagnostics
│       │   ├── lib/              # Tauri client, mock-data, i18n, tag-editor, utils
│       │   ├── stores/           # useAppStore, useGenerationStore, useModelStore
│       │   └── types/            # Desktop-specific type re-exports
│       ├── e2e/                  # Playwright E2E specs
│       └── src-tauri/            # Rust backend (commands, process, config, models, diagnostics)
└── packages/
    └── shared/                   # TypeScript contracts (types, constants, Zod schemas)
```

## Security

- **No arbitrary shell commands** — Rust `GenerationCommandSpec` builds argument vectors from typed fields only. The UI never supplies raw command text.
- **Local-only** — text input, audio output, and model files stay on the local machine.
- **Delete confirmation** — model deletion requires explicit confirm step.
- **Controlled download seam** — `downloadModel` command accepts only known model IDs; no arbitrary URL input.

## Integration Notes

- **s2.cpp execution** — `apps/desktop/src-tauri/src/process.rs` spawns the configured binary with real CLI flags: `--model <gguf>`, `--tokenizer <tokenizer.json>`, `--text <text>`, `--output <wav>`, `--threads <n>`, `--normalize`, `--trim-silence`, `-v -1` (CPU mode), `--prompt-audio <ref.wav>`, `--prompt-text <transcript>`. Flags that do not exist in the real s2 CLI (`--lang`, `--seed`, `--out`, `--no-gpu`, `--ref-audio`, `--ref-text`) have been removed. The `language` and `seed` fields remain in `GenerationRequest` for forward compatibility but are not forwarded to the binary.
- **Process lifecycle** — `run_generation` spawns the binary, captures stdout/stderr incrementally, monitors exit status via `try_wait` loop, and supports cancellation (`cmd /c taskkill`-equivalent). Only one generation runs at a time in simple mode.
- **Path redaction** — `GenerationCommandSpec::redacted_display()` replaces all path-like args with `<path>` for safe display in Diagnostics.
- Model manifest entries include quant, filename, display size, tokenizer flag, and recommendation — match these against the real GGUF catalog.
- The typed command boundary (`StudioClient` interface) mirrors registered Tauri commands exactly; no direct IPC bypass.

## Model License

Fish Audio and s2.cpp models are subject to their respective licenses. Review model and voice data license terms before distribution or commercial use of generated audio.