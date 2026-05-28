# Voice of Fish

Local voice generation studio desktop app powered by s2.cpp. Compose script text, insert style tags, select model quants and voice presets, then generate audio locally — no cloud dependency, no data leaves your machine.

## Status

**Partial-real slice** — Configuration persistence and system diagnostics are now real (Tauri commands with actual sysinfo, path validation, binary detection). Model downloads, generation, and voice cloning remain in mock mode. The UI is wired to swap in real engine commands once s2.cpp flags are validated.

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

- Map real `s2.cpp` flags only in the Rust `process.rs` adapter after supported flags have been validated against the s2.cpp binary.
- Model manifest entries include quant, filename, display size, tokenizer flag, and recommendation — match these against the real GGUF catalog.
- The typed command boundary (`StudioClient` interface) mirrors registered Tauri commands exactly; no direct IPC bypass.

## Model License

Fish Audio and s2.cpp models are subject to their respective licenses. Review model and voice data license terms before distribution or commercial use of generated audio.