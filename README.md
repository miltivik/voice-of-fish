# Voice of Fish

Local voice generation studio desktop app powered by s2.cpp. Compose script text, insert style tags, select model quants and voice presets, then generate audio locally — no cloud dependency, no data leaves your machine.

## Status

**Mock-first slice** — complete UI surface with local mock data contracts, Zustand stores, TanStack Query state, and Tauri command stubs. Real `s2.cpp` engine integration, Hugging Face model downloads, checksum verification, and persistent history/presets are outside the current scope. All UI and command boundaries are wired and ready for engine handoff.

**Windows-first** — the desktop app targets Windows for the initial slice. Linux and macOS binary directories exist with tracked `.gitkeep` files. Tauri config, Rust crates, and build hooks follow cross-platform conventions.

## Requirements

- **pnpm** >= 10.x
- **Node.js** >= 20.x (Vite 8 / Tauri 2 baseline)
- **Rust** toolchain with Windows Tauri 2 prerequisites:
  - Microsoft Visual Studio C++ Build Tools
  - WebView2 runtime (bundled with Windows 11; install manually on Windows 10)
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
