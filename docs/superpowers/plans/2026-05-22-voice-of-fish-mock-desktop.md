# Voice Of Fish Mock Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Windows-first pnpm/Tauri workspace with serious mock desktop UI, typed local data contracts, and Rust command/process boundaries ready for real `s2.cpp` work.

**Architecture:** Use current repo root as pnpm workspace with `apps/desktop` for React/Tauri and `packages/shared` for TypeScript schemas/constants. React features talk to mock async command wrappers through TanStack Query and keep draft/session state in Zustand; Rust exposes the final command names with controlled stub responses and process-manager types without running `s2.cpp`.

**Tech Stack:** pnpm workspaces, Tauri v2, Rust, React, TypeScript, Vite, Tailwind CSS, shadcn/ui-style primitives, Zustand, TanStack Query, React Hook Form, Zod, lucide-react, sonner, wavesurfer.js, framer-motion, Vitest, Testing Library, Playwright, ESLint, Prettier.

---

## Scope Guard

Implement only approved mock-desktop slice.

- Keep inference, persistent history/presets, controlled Hugging Face downloads, checksum verification, and real `s2.cpp` flag mapping out of this plan.
- Build UI against local mock data and final command names.
- Keep Windows binary directory ready and Linux/macOS directories empty except tracked keep files.
- Use only controlled argument vectors in Rust process types. UI never supplies shell command text.

## Execution Notes

1. Before UI styling work in Task 5, load `build-web-apps:frontend-app-builder`, `imagegen`, and applicable React/accessibility skills. Produce one accepted visual reference for the app shell and main Generate surface from the approved spec, then extract tokens into code. Do not convert app into marketing page.
2. For Rust/Tauri API shape, follow official Tauri v2 command pattern: commands in `commands.rs`, public handlers registered through `generate_handler!`, frontend calls isolated behind `src/lib/tauri.ts`.
3. For shadcn/ui, generate local primitives in `src/components/ui` and keep `cn` utility in `src/lib/utils.ts`; avoid CLI churn when a small manual primitive is clearer.
4. Each task ends with a focused commit. Do not combine later feature edits into an earlier task.

## File Map

### Workspace And Tooling

- `.gitignore`: dependency, build, Playwright, Rust, and visual-companion ignores.
- `package.json`: root pnpm scripts required by user.
- `pnpm-workspace.yaml`: app/package workspace discovery.
- `tsconfig.base.json`: shared TS compiler baseline and workspace alias policy.
- `README.md`: product status and command documentation.

### Shared Package

- `packages/shared/package.json`, `packages/shared/tsconfig.json`: package build/test identity.
- `packages/shared/src/types.ts`: config, model, job, voice, history, diagnostic interfaces.
- `packages/shared/src/constants.ts`: model manifest seeds, languages, style tags, mock voice/history values.
- `packages/shared/src/schemas.ts`: Zod input schemas for setup, generation, voice preset, settings.
- `packages/shared/src/*.test.ts`: schema and manifest tests.

### Desktop Tooling

- `apps/desktop/package.json`: web/Tauri scripts and dependencies.
- `apps/desktop/index.html`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`.
- `apps/desktop/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`.
- `apps/desktop/tailwind.config.ts`, `postcss.config.cjs`, `components.json`.
- `apps/desktop/eslint.config.js`, `prettier.config.cjs`, `vitest.setup.ts`.
- `apps/desktop/src/main.tsx`, `src/index.css`.

### Desktop Frontend

- `src/app/App.tsx`, `providers.tsx`, `routes.tsx`: app composition, query/toast/router providers, route table.
- `src/components/ui/*.tsx`: shadcn-style Button, Card, Badge, Progress, Input, Textarea, Select, Switch, Tooltip, Dialog shell helpers.
- `src/components/layout/*.tsx`: sidebar, header, footer, app shell.
- `src/components/audio/AudioWaveform.tsx`: wavesurfer boundary with no-result fallback.
- `src/components/generation/*.tsx`: tag bar, result panel, recent history list.
- `src/components/model/ModelCard.tsx`: model state/actions card.
- `src/components/logs/ProcessLogPanel.tsx`: diagnostics log surface.
- `src/components/settings/SetupPanel.tsx`: first-run form.
- `src/features/*/*.tsx`: Dashboard, Generate, Voices, Models, History, Settings, Diagnostics pages.
- `src/lib/tauri.ts`: command client and mock adapter.
- `src/lib/mock-data.ts`: mock responses.
- `src/lib/i18n.ts`: English catalog accessor boundary.
- `src/lib/tag-editor.ts`, `validators.ts`, `formatters.ts`, `paths.ts`, `utils.ts`: focused helpers.
- `src/stores/*.ts`: app, generation, model Zustand stores.
- `src/types/*.ts`: desktop-only view types/re-exports.

### Tauri Backend

- `apps/desktop/src-tauri/Cargo.toml`, `build.rs`, `tauri.conf.json`, `capabilities/default.json`.
- `apps/desktop/src-tauri/icons/.gitkeep`: tracked icon directory until icon asset task.
- `apps/desktop/src-tauri/binaries/{windows,linux,macos}/.gitkeep`.
- `apps/desktop/src-tauri/src/main.rs`: Tauri builder and command registration.
- `src-tauri/src/config.rs`, `models.rs`, `downloads.rs`, `diagnostics.rs`, `process.rs`, `commands.rs`: Rust contracts and stubs.

### Tests

- `apps/desktop/src/**/*.test.ts(x)`: helper, store, page/component tests.
- `apps/desktop/e2e/app-shell.spec.ts`: navigation and setup.
- `apps/desktop/e2e/generate.spec.ts`: Generate mock happy path.

## Task 1: Bootstrap Pnpm Workspace And Desktop Test Harness

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/tsconfig.app.json`
- Create: `apps/desktop/tsconfig.node.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/vitest.config.ts`
- Create: `apps/desktop/vitest.setup.ts`
- Create: `apps/desktop/eslint.config.js`
- Create: `apps/desktop/prettier.config.cjs`
- Create: `apps/desktop/postcss.config.cjs`
- Create: `apps/desktop/tailwind.config.ts`
- Create: `apps/desktop/components.json`
- Create: `apps/desktop/src/index.css`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/app/App.test.tsx`
- Create: `apps/desktop/src/app/App.tsx`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`

- [ ] **Step 1: Add workspace manifests and install required packages**

Create root manifests with these exact baselines:

```json
// package.json
{
  "name": "voice-of-fish",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "scripts": {
    "dev": "pnpm --filter @voice-of-fish/desktop tauri dev",
    "build": "pnpm --filter @voice-of-fish/desktop tauri build",
    "lint": "pnpm --filter @voice-of-fish/desktop lint",
    "format": "pnpm --filter @voice-of-fish/desktop format",
    "test": "pnpm -r test",
    "test:e2e": "pnpm --filter @voice-of-fish/desktop test:e2e"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

```json
// apps/desktop/package.json
{
  "name": "@voice-of-fish/desktop",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev:web": "vite",
    "build:web": "tsc -b && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write . ../../README.md ../../packages/shared",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

```json
// packages/shared/package.json
{
  "name": "@voice-of-fish/shared",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/types.ts",
    "./constants": "./src/constants.ts",
    "./schemas": "./src/schemas.ts"
  },
  "scripts": {
    "test": "vitest run --passWithNoTests"
  }
}
```

Run from repo root:

```powershell
pnpm --filter @voice-of-fish/desktop add react react-dom react-router-dom @vitejs/plugin-react @tauri-apps/api @tauri-apps/plugin-shell @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-store @tauri-apps/plugin-http @tanstack/react-query zustand react-hook-form zod @hookform/resolvers lucide-react sonner framer-motion wavesurfer.js date-fns class-variance-authority clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-tooltip @radix-ui/react-progress @radix-ui/react-scroll-area
pnpm --filter @voice-of-fish/desktop add -D typescript vite @tauri-apps/cli tailwindcss@3 postcss autoprefixer eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh prettier vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event playwright @playwright/test vite-tsconfig-paths @types/node @types/react @types/react-dom
pnpm --filter @voice-of-fish/shared add zod
pnpm --filter @voice-of-fish/shared add -D typescript vitest
```

Expected: pnpm writes lockfile and workspace dependency entries without npm/yarn lockfiles.

- [ ] **Step 2: Write failing App smoke test**

```tsx
// apps/desktop/src/app/App.test.tsx
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("shows product identity", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /voice of fish/i })).toBeVisible();
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/app/App.test.tsx
```

Expected: FAIL because test harness/App files are not complete.

- [ ] **Step 3: Add Vite, Tailwind, lint, format, and test harness**

Use these core files:

```ts
// apps/desktop/vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
```

```ts
// apps/desktop/vitest.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
  },
});
```

```ts
// apps/desktop/vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

```tsx
// apps/desktop/src/app/App.tsx
export function App() {
  return (
    <main className="grid min-h-screen place-items-center bg-studio text-studio-foreground">
      <h1 className="text-3xl font-semibold">Voice of Fish</h1>
    </main>
  );
}
```

```tsx
// apps/desktop/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/App";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```css
/* apps/desktop/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0;
}

body {
  @apply m-0 bg-studio text-studio-foreground antialiased;
}
```

Configure TS path and Tailwind tokens with these exact starts:

```json
// apps/desktop/tsconfig.app.json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowImportingTsExtensions": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

```ts
// apps/desktop/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        studio: { DEFAULT: "#0b0e13", foreground: "#eef2f7" },
        panel: "#141922",
        line: "#283142",
        muted: "#94a3b8",
        accent: "#21c8a5",
        danger: "#ef476f",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Run smoke checks**

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/app/App.test.tsx
pnpm --filter @voice-of-fish/desktop lint
pnpm --filter @voice-of-fish/desktop build:web
```

Expected: App test PASS, ESLint PASS, Vite web build PASS.

- [ ] **Step 5: Commit**

```powershell
git add .gitignore package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json apps/desktop packages/shared
git commit -m "chore: bootstrap voice of fish workspace"
```

## Task 2: Define Shared Local Domain Contracts

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/schemas.test.ts`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Write failing schema tests**

```ts
// packages/shared/src/schemas.test.ts
import { describe, expect, it } from "vitest";
import { STYLE_TAGS, S2_MODEL_MANIFEST } from "./constants";
import { generationRequestSchema, setupSchema, voicePresetSchema } from "./schemas";

describe("shared schemas", () => {
  it("accepts configured setup paths and mode", () => {
    expect(
      setupSchema.parse({
        mode: "simple",
        binaryPath: "C:\\s2\\s2.exe",
        modelsPath: "C:\\voice-of-fish\\models",
        outputsPath: "C:\\voice-of-fish\\outputs",
      }),
    ).toMatchObject({ mode: "simple" });
  });

  it("rejects voice reference formats outside wav mp3 flac", () => {
    expect(() =>
      voicePresetSchema.parse({
        name: "Narrator",
        language: "en",
        referenceText: "Exact sample transcript.",
        referenceFileName: "sample.ogg",
      }),
    ).toThrow(/wav, mp3, or flac/i);
  });

  it("keeps generation request text and model required", () => {
    expect(() => generationRequestSchema.parse({ language: "en" })).toThrow();
  });

  it("defines first model quants and insertion tags", () => {
    expect(S2_MODEL_MANIFEST.map((model) => model.quant)).toEqual(["Q8", "Q6", "Q5", "Q4"]);
    expect(STYLE_TAGS).toContain("[professional broadcast tone]");
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/shared test
```

Expected: FAIL because constants and schemas do not exist.

- [ ] **Step 2: Add shared types**

```ts
// packages/shared/src/types.ts
export type AppMode = "simple" | "advanced";
export type AudioFormat = "wav";
export type ModelQuant = "Q8" | "Q6" | "Q5" | "Q4";
export type ModelState = "not-installed" | "downloading" | "installed" | "error";
export type GenerationStatus = "idle" | "preparing" | "generating" | "completed" | "failed";

export interface AppConfig {
  mode: AppMode;
  binaryPath: string;
  modelsPath: string;
  outputsPath: string;
  defaultModelId: string;
  defaultAudioFormat: AudioFormat;
  cpuThreads: number;
  gpuEnabled: boolean;
  advancedArgs: Record<string, string | number | boolean>;
}

export interface ModelManifestEntry {
  id: string;
  quant: ModelQuant;
  filename: string;
  displaySize: string;
  approxBytes: number;
  recommendation: string;
  tokenizerRequired: boolean;
  checksum?: string;
  state: ModelState;
}

export interface VoicePreset {
  id: string;
  name: string;
  language: string;
  referenceText: string;
  referenceFileName: string;
  referenceAudioPath?: string;
  notes?: string;
  durationSeconds?: number;
}

export interface GenerationRequest {
  text: string;
  language: string;
  modelId: string;
  seed?: number;
  voicePresetId?: string;
  referenceAudioPath?: string;
  referenceText?: string;
}

export interface GenerationJob extends GenerationRequest {
  id: string;
  status: GenerationStatus;
  outputPath?: string;
  audioUrl?: string;
  createdAt: string;
  completedAt?: string;
  durationSeconds?: number;
  error?: string;
}

export interface HistoryRecord {
  id: string;
  text: string;
  modelId: string;
  voiceName?: string;
  outputPath: string;
  createdAt: string;
  durationSeconds?: number;
  status: Exclude<GenerationStatus, "idle">;
}

export interface SystemInfo {
  os: string;
  cpu: string;
  ramLabel: string;
  gpu?: string;
  appVersion: string;
  engineVersion?: string;
}

export interface ProcessLogLine {
  id: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
  createdAt: string;
}
```

- [ ] **Step 3: Add manifest constants and Zod schemas**

```ts
// packages/shared/src/constants.ts
import type { HistoryRecord, ModelManifestEntry, VoicePreset } from "./types";

export const STYLE_TAGS = [
  "[laughing]",
  "[whisper]",
  "[sad]",
  "[angry]",
  "[excited]",
  "[professional broadcast tone]",
  "[calm]",
  "[serious]",
  "[narration]",
  "[conversation]",
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "ja", label: "Japanese" },
] as const;

export const S2_MODEL_MANIFEST: ModelManifestEntry[] = [
  { id: "s2-q8", quant: "Q8", filename: "s2-pro-q8_0.gguf", displaySize: "5.3 GB", approxBytes: 5_300_000_000, recommendation: "Highest quality, higher VRAM use.", tokenizerRequired: true, state: "not-installed" },
  { id: "s2-q6", quant: "Q6", filename: "s2-pro-q6_k.gguf", displaySize: "4.3 GB", approxBytes: 4_300_000_000, recommendation: "Recommended balance.", tokenizerRequired: true, state: "installed" },
  { id: "s2-q5", quant: "Q5", filename: "s2-pro-q5_k_m.gguf", displaySize: "3.8 GB", approxBytes: 3_800_000_000, recommendation: "Stable choice for limited GPUs.", tokenizerRequired: true, state: "not-installed" },
  { id: "s2-q4", quant: "Q4", filename: "s2-pro-q4_k_m.gguf", displaySize: "3.4 GB", approxBytes: 3_400_000_000, recommendation: "Lower consumption, lower quality.", tokenizerRequired: true, state: "not-installed" },
];

export const MOCK_VOICES: VoicePreset[] = [
  { id: "voice-nora", name: "Nora reference", language: "en", referenceText: "Local voices keep their reference transcript.", referenceFileName: "nora-reference.wav", durationSeconds: 14 },
];

export const MOCK_HISTORY: HistoryRecord[] = [
  { id: "history-1", text: "[calm] Local generation stays on this workstation.", modelId: "s2-q6", voiceName: "Nora reference", outputPath: "C:\\voice-of-fish\\outputs\\calm-demo.wav", createdAt: "2026-05-22T12:00:00.000Z", durationSeconds: 6.4, status: "completed" },
];
```

```ts
// packages/shared/src/schemas.ts
import { z } from "zod";

const nonBlank = z.string().trim().min(1);
const referenceFile = z
  .string()
  .regex(/\.(wav|mp3|flac)$/i, "Reference file must be wav, mp3, or flac.");

export const setupSchema = z.object({
  mode: z.enum(["simple", "advanced"]),
  binaryPath: nonBlank,
  modelsPath: nonBlank,
  outputsPath: nonBlank,
});

export const generationRequestSchema = z.object({
  text: nonBlank.max(8_000),
  language: nonBlank,
  modelId: nonBlank,
  seed: z.coerce.number().int().optional(),
  voicePresetId: z.string().optional(),
  referenceAudioPath: z.string().optional(),
  referenceText: z.string().optional(),
});

export const voicePresetSchema = z.object({
  name: nonBlank,
  language: nonBlank,
  referenceText: nonBlank,
  referenceFileName: referenceFile,
  notes: z.string().max(400).optional(),
  durationSeconds: z.number().positive().optional(),
});

export const settingsSchema = setupSchema.extend({
  defaultModelId: nonBlank,
  defaultAudioFormat: z.literal("wav"),
  cpuThreads: z.coerce.number().int().min(1).max(256),
  gpuEnabled: z.boolean(),
});
```

- [ ] **Step 4: Run tests**

```powershell
pnpm --filter @voice-of-fish/shared test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/shared
git commit -m "feat: define local voice studio contracts"
```

## Task 3: Add Frontend Helpers, Mock Command Client, And Zustand Stores

**Files:**
- Create: `apps/desktop/src/lib/tag-editor.ts`
- Create: `apps/desktop/src/lib/tag-editor.test.ts`
- Create: `apps/desktop/src/lib/validators.ts`
- Create: `apps/desktop/src/lib/formatters.ts`
- Create: `apps/desktop/src/lib/paths.ts`
- Create: `apps/desktop/src/lib/i18n.ts`
- Create: `apps/desktop/src/lib/mock-data.ts`
- Create: `apps/desktop/src/lib/tauri.ts`
- Create: `apps/desktop/src/stores/useAppStore.ts`
- Create: `apps/desktop/src/stores/useGenerationStore.ts`
- Create: `apps/desktop/src/stores/useModelStore.ts`
- Create: `apps/desktop/src/stores/useGenerationStore.test.ts`
- Create: `apps/desktop/src/types/model.ts`
- Create: `apps/desktop/src/types/generation.ts`
- Create: `apps/desktop/src/types/settings.ts`

- [ ] **Step 1: Write failing helper and store tests**

```ts
// apps/desktop/src/lib/tag-editor.test.ts
import { describe, expect, it } from "vitest";
import { insertTagAtSelection } from "./tag-editor";

describe("insertTagAtSelection", () => {
  it("inserts a tag at cursor and returns next cursor", () => {
    expect(insertTagAtSelection("Hello world", "[calm]", 6, 6)).toEqual({
      text: "Hello [calm]world",
      selectionStart: 12,
      selectionEnd: 12,
    });
  });

  it("replaces selected text with a tag", () => {
    expect(insertTagAtSelection("Hello loud world", "[whisper]", 6, 10).text).toBe(
      "Hello [whisper] world",
    );
  });
});
```

```ts
// apps/desktop/src/stores/useGenerationStore.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { useGenerationStore } from "./useGenerationStore";

describe("useGenerationStore", () => {
  beforeEach(() => useGenerationStore.getState().resetDraft());

  it("tracks style tag edits in the draft", () => {
    useGenerationStore.getState().setText("Read ");
    useGenerationStore.getState().insertTag("[serious]", 5, 5);

    expect(useGenerationStore.getState().draft.text).toBe("Read [serious]");
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/lib/tag-editor.test.ts src/stores/useGenerationStore.test.ts
```

Expected: FAIL because helpers and store do not exist.

- [ ] **Step 2: Implement helper and stores**

```ts
// apps/desktop/src/lib/tag-editor.ts
export function insertTagAtSelection(text: string, tag: string, start: number, end: number) {
  const nextText = `${text.slice(0, start)}${tag}${text.slice(end)}`;
  const nextCursor = start + tag.length;

  return { text: nextText, selectionStart: nextCursor, selectionEnd: nextCursor };
}
```

```ts
// apps/desktop/src/stores/useGenerationStore.ts
import type { GenerationRequest, GenerationStatus } from "@voice-of-fish/shared";
import { create } from "zustand";
import { insertTagAtSelection } from "@/lib/tag-editor";

const initialDraft: GenerationRequest = {
  text: "",
  language: "en",
  modelId: "s2-q6",
};

interface GenerationState {
  draft: GenerationRequest;
  status: GenerationStatus;
  setText: (text: string) => void;
  patchDraft: (patch: Partial<GenerationRequest>) => void;
  insertTag: (tag: string, start: number, end: number) => void;
  setStatus: (status: GenerationStatus) => void;
  resetDraft: () => void;
}

export const useGenerationStore = create<GenerationState>((set) => ({
  draft: initialDraft,
  status: "idle",
  setText: (text) => set((state) => ({ draft: { ...state.draft, text } })),
  patchDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  insertTag: (tag, start, end) =>
    set((state) => ({ draft: { ...state.draft, text: insertTagAtSelection(state.draft.text, tag, start, end).text } })),
  setStatus: (status) => set({ status }),
  resetDraft: () => set({ draft: { ...initialDraft }, status: "idle" }),
}));
```

```ts
// apps/desktop/src/stores/useAppStore.ts
import type { AppConfig, GenerationStatus } from "@voice-of-fish/shared";
import { create } from "zustand";

interface AppState {
  config?: AppConfig;
  setupComplete: boolean;
  footerStatus: GenerationStatus | "ready" | "error";
  saveConfig: (config: AppConfig) => void;
  setFooterStatus: (status: AppState["footerStatus"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  setupComplete: false,
  footerStatus: "ready",
  saveConfig: (config) => set({ config, setupComplete: true }),
  setFooterStatus: (footerStatus) => set({ footerStatus }),
}));
```

```ts
// apps/desktop/src/stores/useModelStore.ts
import { create } from "zustand";

interface ModelState {
  activeModelId: string;
  setActiveModelId: (activeModelId: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  activeModelId: "s2-q6",
  setActiveModelId: (activeModelId) => set({ activeModelId }),
}));
```

- [ ] **Step 3: Implement mock command client and support helpers**

`lib/tauri.ts` is single command gateway:

```ts
// apps/desktop/src/lib/tauri.ts
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, GenerationJob, GenerationRequest, ModelManifestEntry, ProcessLogLine, SystemInfo } from "@voice-of-fish/shared";
import { mockClient } from "./mock-data";

export interface StudioClient {
  getSystemInfo(): Promise<SystemInfo>;
  getAppConfig(): Promise<AppConfig | null>;
  saveAppConfig(config: AppConfig): Promise<AppConfig>;
  listLocalModels(): Promise<ModelManifestEntry[]>;
  downloadModel(modelId: string): Promise<ModelManifestEntry[]>;
  deleteModel(modelId: string): Promise<ModelManifestEntry[]>;
  runGeneration(request: GenerationRequest): Promise<GenerationJob>;
  cancelGeneration(jobId: string): Promise<boolean>;
  readGenerationLogs(jobId?: string): Promise<ProcessLogLine[]>;
  openOutputFolder(path: string): Promise<boolean>;
}

export const tauriClient: StudioClient = {
  getSystemInfo: () => invoke("get_system_info"),
  getAppConfig: () => invoke("get_app_config"),
  saveAppConfig: (config) => invoke("save_app_config", { config }),
  listLocalModels: () => invoke("list_local_models"),
  downloadModel: (modelId) => invoke("download_model", { modelId }),
  deleteModel: (modelId) => invoke("delete_model", { modelId }),
  runGeneration: (request) => invoke("run_generation", { request }),
  cancelGeneration: (jobId) => invoke("cancel_generation", { jobId }),
  readGenerationLogs: (jobId) => invoke("read_generation_logs", { jobId }),
  openOutputFolder: (path) => invoke("open_output_folder", { path }),
};

export const studioClient = import.meta.env.VITE_USE_TAURI_MOCKS === "false" ? tauriClient : mockClient;
```

`mockClient` must clone manifest state before mutations and return completed local-looking job with no network call:

```ts
// apps/desktop/src/lib/mock-data.ts
import { MOCK_HISTORY, S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";
import type { AppConfig, GenerationRequest, ModelManifestEntry, ProcessLogLine, SystemInfo } from "@voice-of-fish/shared";
import type { StudioClient } from "./tauri";

let models = structuredClone(S2_MODEL_MANIFEST);

export const defaultConfig: AppConfig = {
  mode: "simple",
  binaryPath: "",
  modelsPath: "C:\\voice-of-fish\\models",
  outputsPath: "C:\\voice-of-fish\\outputs",
  defaultModelId: "s2-q6",
  defaultAudioFormat: "wav",
  cpuThreads: 8,
  gpuEnabled: true,
  advancedArgs: {},
};

const systemInfo: SystemInfo = {
  os: "Windows",
  cpu: "Mock local CPU",
  ramLabel: "16 GB",
  gpu: "Detect through Tauri later",
  appVersion: "0.1.0",
};

const cloneModels = (): ModelManifestEntry[] => structuredClone(models);
const logs: ProcessLogLine[] = [{ id: "log-1", stream: "system", message: "Mock engine idle.", createdAt: "2026-05-22T12:00:00.000Z" }];

function completedJob(request: GenerationRequest) {
  return {
    ...request,
    id: "mock-job-1",
    status: "completed" as const,
    createdAt: "2026-05-22T12:00:00.000Z",
    completedAt: "2026-05-22T12:00:01.000Z",
    outputPath: "C:\\voice-of-fish\\outputs\\mock-generation.wav",
    durationSeconds: MOCK_HISTORY[0].durationSeconds,
  };
}

export const mockClient: StudioClient = {
  getSystemInfo: async () => systemInfo,
  getAppConfig: async () => null,
  saveAppConfig: async (config) => config,
  listLocalModels: async () => cloneModels(),
  downloadModel: async (modelId) => {
    models = models.map((model) => model.id === modelId ? { ...model, state: "installed" } : model);
    return cloneModels();
  },
  deleteModel: async (modelId) => {
    models = models.map((model) => model.id === modelId ? { ...model, state: "not-installed" } : model);
    return cloneModels();
  },
  runGeneration: async (request) => completedJob(request),
  cancelGeneration: async () => true,
  readGenerationLogs: async () => logs,
  openOutputFolder: async () => true,
};
```

Put English UI labels in `i18n.ts` under `messages.en` and export `t(key)` with typed keys:

```ts
// apps/desktop/src/lib/i18n.ts
const messages = {
  en: {
    appName: "Voice of Fish",
    generate: "Generate",
    diagnostics: "Diagnostics",
    setup: "Voice of Fish Setup",
  },
} as const;

type MessageKey = keyof typeof messages.en;

export function t(key: MessageKey) {
  return messages.en[key];
}
```

- [ ] **Step 4: Run helper/store tests**

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/lib/tag-editor.test.ts src/stores/useGenerationStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src/lib apps/desktop/src/stores apps/desktop/src/types
git commit -m "feat: add mock studio client and frontend state"
```

## Task 4: Scaffold Tauri Backend Commands And Process Boundary

**Files:**
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/build.rs`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/capabilities/default.json`
- Create: `apps/desktop/src-tauri/icons/.gitkeep`
- Create: `apps/desktop/src-tauri/binaries/windows/.gitkeep`
- Create: `apps/desktop/src-tauri/binaries/linux/.gitkeep`
- Create: `apps/desktop/src-tauri/binaries/macos/.gitkeep`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/src/config.rs`
- Create: `apps/desktop/src-tauri/src/models.rs`
- Create: `apps/desktop/src-tauri/src/downloads.rs`
- Create: `apps/desktop/src-tauri/src/diagnostics.rs`
- Create: `apps/desktop/src-tauri/src/process.rs`
- Create: `apps/desktop/src-tauri/src/commands.rs`

- [ ] **Step 1: Write failing Rust process tests**

Add tests at bottom of `process.rs` before implementation:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn redacts_sensitive_paths_from_command_display() {
        let spec = GenerationCommandSpec {
            binary_path: r"C:\Users\Alex\bin\s2.exe".into(),
            args: vec!["-o".into(), r"C:\Users\Alex\outputs\voice.wav".into()],
            cwd: r"C:\Users\Alex\bin".into(),
            output_path: r"C:\Users\Alex\outputs\voice.wav".into(),
        };

        assert_eq!(spec.redacted_display(), "<binary> -o <path>");
    }

    #[test]
    fn simple_manager_starts_without_active_job() {
        assert!(ProcessManager::default().active_job_id.is_none());
    }
}
```

Run:

```powershell
cd apps/desktop/src-tauri
cargo test
```

Expected: FAIL because Tauri crate and process types are absent.

- [ ] **Step 2: Add Tauri config and Rust data modules**

Use this backend baseline:

```toml
# apps/desktop/src-tauri/Cargo.toml
[package]
name = "voice-of-fish"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-http = "2"
tauri-plugin-shell = "2"
tauri-plugin-store = "2"
```

```rust
// apps/desktop/src-tauri/src/process.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationRequest {
    pub text: String,
    pub language: String,
    pub model_id: String,
    pub seed: Option<i64>,
    pub voice_preset_id: Option<String>,
    pub reference_audio_path: Option<String>,
    pub reference_text: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationJob {
    pub id: String,
    pub text: String,
    pub language: String,
    pub model_id: String,
    pub status: String,
    pub created_at: String,
    pub output_path: Option<String>,
}

#[derive(Debug, Clone)]
pub struct GenerationCommandSpec {
    pub binary_path: String,
    pub args: Vec<String>,
    pub cwd: String,
    pub output_path: String,
}

impl GenerationCommandSpec {
    pub fn redacted_display(&self) -> String {
        let args = self
            .args
            .iter()
            .map(|arg| if arg.contains('\\') || arg.contains('/') { "<path>" } else { arg })
            .collect::<Vec<_>>()
            .join(" ");
        format!("<binary> {args}")
    }
}

#[derive(Debug, Default)]
pub struct ProcessManager {
    pub active_job_id: Option<String>,
    pub log_lines: Vec<GenerationLogLine>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationLogLine {
    pub id: String,
    pub stream: String,
    pub message: String,
    pub created_at: String,
}

impl GenerationJob {
    pub fn mock(request: GenerationRequest) -> Self {
        Self {
            id: "mock-job-1".into(),
            text: request.text,
            language: request.language,
            model_id: request.model_id,
            status: "completed".into(),
            created_at: "2026-05-22T12:00:00.000Z".into(),
            output_path: Some(r"C:\voice-of-fish\outputs\mock-generation.wav".into()),
        }
    }
}

impl GenerationLogLine {
    pub fn mock_lines() -> Vec<Self> {
        vec![Self {
            id: "log-1".into(),
            stream: "system".into(),
            message: "Mock engine idle.".into(),
            created_at: "2026-05-22T12:00:00.000Z".into(),
        }]
    }
}
```

`config.rs`, `models.rs`, `downloads.rs`, and `diagnostics.rs` must use serde camelCase fields matching shared TS names:

```rust
// apps/desktop/src-tauri/src/config.rs
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub mode: String,
    pub binary_path: String,
    pub models_path: String,
    pub outputs_path: String,
    pub default_model_id: String,
    pub default_audio_format: String,
    pub cpu_threads: u16,
    pub gpu_enabled: bool,
    pub advanced_args: BTreeMap<String, serde_json::Value>,
}

impl AppConfig {
    pub fn mock() -> Self {
        Self {
            mode: "simple".into(),
            binary_path: String::new(),
            models_path: r"C:\voice-of-fish\models".into(),
            outputs_path: r"C:\voice-of-fish\outputs".into(),
            default_model_id: "s2-q6".into(),
            default_audio_format: "wav".into(),
            cpu_threads: 8,
            gpu_enabled: true,
            advanced_args: BTreeMap::new(),
        }
    }
}
```

```rust
// apps/desktop/src-tauri/src/models.rs
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalModel {
    pub id: String,
    pub quant: String,
    pub filename: String,
    pub display_size: String,
    pub approx_bytes: u64,
    pub recommendation: String,
    pub tokenizer_required: bool,
    pub state: String,
}

impl LocalModel {
    pub fn mock_manifest() -> Vec<Self> {
        vec![
            Self { id: "s2-q8".into(), quant: "Q8".into(), filename: "s2-pro-q8_0.gguf".into(), display_size: "5.3 GB".into(), approx_bytes: 5_300_000_000, recommendation: "Highest quality, higher VRAM use.".into(), tokenizer_required: true, state: "not-installed".into() },
            Self { id: "s2-q6".into(), quant: "Q6".into(), filename: "s2-pro-q6_k.gguf".into(), display_size: "4.3 GB".into(), approx_bytes: 4_300_000_000, recommendation: "Recommended balance.".into(), tokenizer_required: true, state: "installed".into() },
            Self { id: "s2-q5".into(), quant: "Q5".into(), filename: "s2-pro-q5_k_m.gguf".into(), display_size: "3.8 GB".into(), approx_bytes: 3_800_000_000, recommendation: "Stable choice for limited GPUs.".into(), tokenizer_required: true, state: "not-installed".into() },
            Self { id: "s2-q4".into(), quant: "Q4".into(), filename: "s2-pro-q4_k_m.gguf".into(), display_size: "3.4 GB".into(), approx_bytes: 3_400_000_000, recommendation: "Lower consumption, lower quality.".into(), tokenizer_required: true, state: "not-installed".into() },
        ]
    }
}
```

```rust
// apps/desktop/src-tauri/src/diagnostics.rs
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os: String,
    pub cpu: String,
    pub ram_label: String,
    pub gpu: Option<String>,
    pub app_version: String,
    pub engine_version: Option<String>,
}

impl SystemInfo {
    pub fn mock() -> Self {
        Self {
            os: std::env::consts::OS.into(),
            cpu: "Mock local CPU".into(),
            ram_label: "16 GB".into(),
            gpu: Some("Detect through diagnostics integration".into()),
            app_version: env!("CARGO_PKG_VERSION").into(),
            engine_version: None,
        }
    }
}
```

```rust
// apps/desktop/src-tauri/src/downloads.rs
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadReceipt {
    pub model_id: String,
    pub accepted: bool,
}
```

- [ ] **Step 3: Register final command names**

```rust
// apps/desktop/src-tauri/src/commands.rs
use crate::{config::AppConfig, diagnostics::SystemInfo, models::LocalModel, process::{GenerationJob, GenerationLogLine, GenerationRequest}};

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    SystemInfo::mock()
}

#[tauri::command]
pub fn get_app_config() -> Option<AppConfig> {
    Some(AppConfig::mock())
}

#[tauri::command]
pub fn save_app_config(config: AppConfig) -> AppConfig {
    config
}

#[tauri::command]
pub fn list_local_models() -> Vec<LocalModel> {
    LocalModel::mock_manifest()
}

#[tauri::command]
pub fn download_model(_model_id: String) -> Vec<LocalModel> {
    LocalModel::mock_manifest()
}

#[tauri::command]
pub fn delete_model(_model_id: String) -> Vec<LocalModel> {
    LocalModel::mock_manifest()
}

#[tauri::command]
pub fn run_generation(request: GenerationRequest) -> GenerationJob {
    GenerationJob::mock(request)
}

#[tauri::command]
pub fn cancel_generation(_job_id: String) -> bool {
    true
}

#[tauri::command]
pub fn read_generation_logs(_job_id: Option<String>) -> Vec<GenerationLogLine> {
    GenerationLogLine::mock_lines()
}

#[tauri::command]
pub fn open_output_folder(_path: String) -> bool {
    true
}
```

```rust
// apps/desktop/src-tauri/src/main.rs
mod commands;
mod config;
mod diagnostics;
mod downloads;
mod models;
mod process;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::get_app_config,
            commands::save_app_config,
            commands::list_local_models,
            commands::download_model,
            commands::delete_model,
            commands::run_generation,
            commands::cancel_generation,
            commands::read_generation_logs,
            commands::open_output_folder,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run voice of fish");
}
```

Configure `tauri.conf.json` build hooks to use `pnpm dev:web`, `pnpm build:web`, dev URL `http://localhost:1420`, and frontend dist `../dist`.

- [ ] **Step 4: Run Rust tests**

```powershell
cd apps/desktop/src-tauri
cargo test
```

Expected: PASS after Tauri prerequisites and crates install.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src-tauri
git commit -m "feat: scaffold tauri command boundary"
```

## Task 5: Build App Shell, Query Providers, And UI Primitives

**Files:**
- Create: `apps/desktop/src/app/providers.tsx`
- Create: `apps/desktop/src/app/routes.tsx`
- Modify: `apps/desktop/src/app/App.tsx`
- Modify: `apps/desktop/src/app/App.test.tsx`
- Create: `apps/desktop/src/lib/utils.ts`
- Create: `apps/desktop/src/components/ui/button.tsx`
- Create: `apps/desktop/src/components/ui/card.tsx`
- Create: `apps/desktop/src/components/ui/badge.tsx`
- Create: `apps/desktop/src/components/ui/progress.tsx`
- Create: `apps/desktop/src/components/ui/input.tsx`
- Create: `apps/desktop/src/components/ui/textarea.tsx`
- Create: `apps/desktop/src/components/layout/AppShell.tsx`
- Create: `apps/desktop/src/components/layout/Sidebar.tsx`
- Create: `apps/desktop/src/components/layout/EngineHeader.tsx`
- Create: `apps/desktop/src/components/layout/StatusFooter.tsx`
- Create: `apps/desktop/src/features/dashboard/DashboardPage.tsx`
- Create route stub pages under `apps/desktop/src/features/{generation,voice-cloning,model-manager,history,settings,diagnostics}`

- [ ] **Step 1: Lock visual reference and tokens**

Use approved spec to generate full app-shell/main Generate screen concept. Record chosen palette, radii, spacing, typography, navigation density, and status surfaces in implementation notes or commit message. Extract only serious workbench UI; avoid product marketing content.

- [ ] **Step 2: Write failing shell navigation test**

```tsx
// apps/desktop/src/app/App.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

describe("App shell", () => {
  it("navigates from dashboard to models", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await user.click(screen.getByRole("link", { name: /models/i }));
    expect(screen.getByRole("heading", { name: "Models" })).toBeVisible();
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/app/App.test.tsx
```

Expected: FAIL because app has no routed shell.

- [ ] **Step 3: Implement providers, shell, and initial routes**

```tsx
// apps/desktop/src/app/App.tsx
import { AppProviders } from "./providers";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
```

```tsx
// apps/desktop/src/app/providers.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";
import { HashRouter } from "react-router-dom";
import { Toaster } from "sonner";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>{children}</HashRouter>
      <Toaster theme="dark" position="bottom-right" />
    </QueryClientProvider>
  );
}
```

```tsx
// apps/desktop/src/app/routes.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DiagnosticsPage } from "@/features/diagnostics/DiagnosticsPage";
import { GeneratePage } from "@/features/generation/GeneratePage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { ModelsPage } from "@/features/model-manager/ModelsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { VoicesPage } from "@/features/voice-cloning/VoicesPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="generate" element={<GeneratePage />} />
        <Route path="voices" element={<VoicesPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="diagnostics" element={<DiagnosticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

`AppShell` must render sidebar links, engine header, outlet, footer status. Use Lucide icons with tooltips where labels collapse at narrow responsive widths. Keep route stub pages as one heading and one short mock-state panel.

```tsx
// apps/desktop/src/components/layout/AppShell.tsx
import { Outlet } from "react-router-dom";
import { EngineHeader } from "./EngineHeader";
import { Sidebar } from "./Sidebar";
import { StatusFooter } from "./StatusFooter";

export function AppShell() {
  return (
    <div className="grid min-h-screen grid-cols-[15rem_1fr] bg-studio text-studio-foreground">
      <Sidebar />
      <div className="grid min-w-0 grid-rows-[auto_1fr_auto]">
        <EngineHeader />
        <main className="min-w-0 overflow-auto p-6"><Outlet /></main>
        <StatusFooter />
      </div>
    </div>
  );
}
```

```tsx
// apps/desktop/src/features/model-manager/ModelsPage.tsx
export function ModelsPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Models</h1>
      <p className="text-sm text-muted">GGUF model manager mock state loads in this screen.</p>
    </section>
  );
}
```

- [ ] **Step 4: Add local UI primitives**

Implement shadcn-style `Button`, `Card`, `Badge`, `Progress`, `Input`, and `Textarea` around `cn()`:

```ts
// apps/desktop/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Primitives must expose native props and visible focus rings. Keep corner radii at 8 px or less for app chrome.

- [ ] **Step 5: Run shell tests**

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/app/App.test.tsx
pnpm --filter @voice-of-fish/desktop lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/desktop/src apps/desktop/tailwind.config.ts
git commit -m "feat: build studio app shell"
```

## Task 6: Implement Setup Gate And Dashboard

**Files:**
- Create: `apps/desktop/src/components/settings/SetupPanel.tsx`
- Create: `apps/desktop/src/features/settings/SetupPanel.test.tsx`
- Modify: `apps/desktop/src/features/dashboard/DashboardPage.tsx`
- Modify: `apps/desktop/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Write failing setup form test**

```tsx
// apps/desktop/src/features/settings/SetupPanel.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupPanel } from "@/components/settings/SetupPanel";

describe("SetupPanel", () => {
  it("saves initial local paths", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SetupPanel onSave={onSave} />);

    await user.type(screen.getByLabelText(/s2.cpp binary/i), "C:\\s2\\s2.exe");
    await user.type(screen.getByLabelText(/models folder/i), "C:\\voice-of-fish\\models");
    await user.type(screen.getByLabelText(/outputs folder/i), "C:\\voice-of-fish\\outputs");
    await user.click(screen.getByRole("button", { name: /save setup/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mode: "simple" }));
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/features/settings/SetupPanel.test.tsx
```

Expected: FAIL because setup panel absent.

- [ ] **Step 2: Implement form and setup gate**

Use `useForm` and `zodResolver(setupSchema)`. Convert setup values into full `AppConfig` by adding:

```ts
{
  defaultModelId: "s2-q6",
  defaultAudioFormat: "wav",
  cpuThreads: 8,
  gpuEnabled: true,
  advancedArgs: {},
}
```

`AppShell` must show setup as bounded panel while keeping shell visible. Saving config must call `useAppStore.saveConfig`.

```tsx
// apps/desktop/src/components/settings/SetupPanel.tsx
import { zodResolver } from "@hookform/resolvers/zod";
import type { AppConfig } from "@voice-of-fish/shared";
import { setupSchema } from "@voice-of-fish/shared/schemas";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SetupValues = z.infer<typeof setupSchema>;

export function SetupPanel({ onSave }: { onSave: (config: AppConfig) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: { mode: "simple", binaryPath: "", modelsPath: "", outputsPath: "" },
  });

  const save = (values: SetupValues) => onSave({
    ...values,
    defaultModelId: "s2-q6",
    defaultAudioFormat: "wav",
    cpuThreads: 8,
    gpuEnabled: true,
    advancedArgs: {},
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(save)}>
      <h2 className="text-xl font-semibold">Voice of Fish Setup</h2>
      <Input aria-label="s2.cpp binary" {...register("binaryPath")} />
      {errors.binaryPath && <p role="alert">{errors.binaryPath.message}</p>}
      <Input aria-label="Models folder" {...register("modelsPath")} />
      <Input aria-label="Outputs folder" {...register("outputsPath")} />
      <Button type="submit">Save setup</Button>
    </form>
  );
}
```

- [ ] **Step 3: Fill dashboard mock readouts**

Dashboard queries `studioClient.getSystemInfo()` and `studioClient.listLocalModels()`. Render engine readiness, OS/RAM recommendation, installed model count, last generation from `MOCK_HISTORY`, and buttons to Generate, Models, Settings, Diagnostics.

```tsx
// apps/desktop/src/features/dashboard/DashboardPage.tsx
import { useQuery } from "@tanstack/react-query";
import { MOCK_HISTORY } from "@voice-of-fish/shared/constants";
import { Link } from "react-router-dom";
import { studioClient } from "@/lib/tauri";

export function DashboardPage() {
  const diagnostics = useQuery({ queryKey: ["system-info"], queryFn: studioClient.getSystemInfo });
  const models = useQuery({ queryKey: ["models"], queryFn: studioClient.listLocalModels });
  const installed = models.data?.filter((model) => model.state === "installed").length ?? 0;

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>Engine boundary ready. {installed} model quant installed.</p>
      <p>{diagnostics.data?.os ?? "Loading OS"} / {diagnostics.data?.ramLabel ?? "Loading RAM"}</p>
      <p>Last output: {MOCK_HISTORY[0].outputPath}</p>
      <div className="flex gap-3">
        <Link to="/generate">Generate</Link><Link to="/models">Models</Link>
        <Link to="/settings">Settings</Link><Link to="/diagnostics">Diagnostics</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests**

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/features/settings/SetupPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src
git commit -m "feat: add setup gate and dashboard"
```

## Task 7: Implement Mock Model Manager

**Files:**
- Create: `apps/desktop/src/components/model/ModelCard.tsx`
- Create: `apps/desktop/src/features/model-manager/ModelsPage.test.tsx`
- Modify: `apps/desktop/src/features/model-manager/ModelsPage.tsx`

- [ ] **Step 1: Write failing Model Manager test**

```tsx
// apps/desktop/src/features/model-manager/ModelsPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { ModelsPage } from "./ModelsPage";

describe("ModelsPage", () => {
  it("downloads an uninstalled quant through mock state", async () => {
    const user = userEvent.setup();
    render(<ModelsPage />, { wrapper: AppProviders });

    expect(await screen.findByText("Q5")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /download q5/i }));
    expect(await screen.findByText(/q5 installed/i)).toBeVisible();
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/features/model-manager/ModelsPage.test.tsx
```

Expected: FAIL because model cards/actions absent.

- [ ] **Step 2: Implement query-driven model cards**

Models page must:

- Query `studioClient.listLocalModels`.
- Mutate with `downloadModel` and `deleteModel`.
- Show Q8/Q6/Q5/Q4 filename, size, recommendation, tokenizer marker, status.
- Use sonner success/error action notification.
- Require delete confirmation via Dialog or native confirm wrapper component.
- Expose active model action wired to `useModelStore`.

`ModelCard` gets one model plus callbacks; it does not reach into query client.

```tsx
// apps/desktop/src/features/model-manager/ModelsPage.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ModelCard } from "@/components/model/ModelCard";
import { studioClient } from "@/lib/tauri";

export function ModelsPage() {
  const queryClient = useQueryClient();
  const models = useQuery({ queryKey: ["models"], queryFn: studioClient.listLocalModels });
  const sync = (next: unknown) => queryClient.setQueryData(["models"], next);
  const download = useMutation({
    mutationFn: studioClient.downloadModel,
    onSuccess: (next, modelId) => {
      sync(next);
      toast.success(`${modelId.toUpperCase()} installed`);
    },
  });

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Models</h1>
      <div className="grid gap-4 xl:grid-cols-2">
        {models.data?.map((model) => (
          <ModelCard key={model.id} model={model} onDownload={() => download.mutate(model.id)} />
        ))}
      </div>
    </section>
  );
}
```

```tsx
// apps/desktop/src/components/model/ModelCard.tsx
import type { ModelManifestEntry } from "@voice-of-fish/shared";
import { Button } from "@/components/ui/button";

export function ModelCard({ model, onDownload }: { model: ModelManifestEntry; onDownload: () => void }) {
  return (
    <article className="rounded-lg border border-line bg-panel p-4">
      <h2 className="text-lg font-semibold">{model.quant}</h2>
      <p>{model.filename} / {model.displaySize}</p>
      <p className="text-sm text-muted">{model.recommendation}</p>
      <p>{model.quant} {model.state === "installed" ? "installed" : "not installed"}</p>
      {model.state !== "installed" && <Button onClick={onDownload}>Download {model.quant}</Button>}
    </article>
  );
}
```

- [ ] **Step 3: Run Model Manager test**

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/features/model-manager/ModelsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add apps/desktop/src/components/model apps/desktop/src/features/model-manager apps/desktop/src/lib/mock-data.ts
git commit -m "feat: add mock model manager"
```

## Task 8: Implement Generate Surface, Tags, Result Player Boundary

**Files:**
- Create: `apps/desktop/src/components/audio/AudioWaveform.tsx`
- Create: `apps/desktop/src/components/generation/StyleTagBar.tsx`
- Create: `apps/desktop/src/components/generation/GenerationResult.tsx`
- Create: `apps/desktop/src/components/generation/RecentGenerations.tsx`
- Create: `apps/desktop/src/features/generation/GeneratePage.test.tsx`
- Modify: `apps/desktop/src/features/generation/GeneratePage.tsx`

- [ ] **Step 1: Write failing Generate test**

```tsx
// apps/desktop/src/features/generation/GeneratePage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProviders } from "@/app/providers";
import { GeneratePage } from "./GeneratePage";

describe("GeneratePage", () => {
  it("inserts style tag and completes mock generation", async () => {
    const user = userEvent.setup();
    render(<GeneratePage />, { wrapper: AppProviders });

    const text = screen.getByLabelText(/script text/i);
    await user.type(text, "Local voice");
    await user.click(screen.getByRole("button", { name: "[calm]" }));
    expect(text).toHaveValue(expect.stringContaining("[calm]"));

    await user.click(screen.getByRole("button", { name: /^generate$/i }));
    expect(await screen.findByText(/generation completed/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /export wav/i })).toBeEnabled();
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/features/generation/GeneratePage.test.tsx
```

Expected: FAIL because Generate page still contains its route stub.

- [ ] **Step 2: Build form and cursor tag bar**

Generate page uses `generationRequestSchema`, React Hook Form, `STYLE_TAGS`, model/language selectors, optional numeric seed, optional voice selector. `StyleTagBar` receives `textareaRef`, reads `selectionStart/selectionEnd`, calls `insertTagAtSelection`, updates form and store text, restores focus/cursor with `setSelectionRange`.

```tsx
// apps/desktop/src/components/generation/StyleTagBar.tsx
import { STYLE_TAGS } from "@voice-of-fish/shared/constants";
import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { insertTagAtSelection } from "@/lib/tag-editor";

export function StyleTagBar({ textareaRef, value, onChange }: { textareaRef: RefObject<HTMLTextAreaElement | null>; value: string; onChange: (value: string) => void }) {
  const insert = (tag: string) => {
    const textArea = textareaRef.current;
    const next = insertTagAtSelection(value, tag, textArea?.selectionStart ?? value.length, textArea?.selectionEnd ?? value.length);
    onChange(next.text);
    requestAnimationFrame(() => {
      textArea?.focus();
      textArea?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  return <div className="flex flex-wrap gap-2">{STYLE_TAGS.map((tag) => <Button key={tag} type="button" variant="secondary" onClick={() => insert(tag)}>{tag}</Button>)}</div>;
}
```

- [ ] **Step 3: Add mock generation mutation and progress states**

On submit:

- Set status to preparing.
- Invoke `studioClient.runGeneration`.
- Render progress surface with preparing/generating/completed labels.
- Save footer state through `useAppStore`.
- Render result panel with output path and Export WAV mock action.
- Render recent generations from mock history plus completed job.

```tsx
// apps/desktop/src/features/generation/GeneratePage.tsx
const generation = useMutation({
  mutationFn: studioClient.runGeneration,
  onMutate: () => {
    useGenerationStore.getState().setStatus("preparing");
    useAppStore.getState().setFooterStatus("preparing");
  },
  onSuccess: (job) => {
    setCompletedJob(job);
    useGenerationStore.getState().setStatus("completed");
    useAppStore.getState().setFooterStatus("ready");
    toast.success("Generation completed");
  },
  onError: () => useAppStore.getState().setFooterStatus("error"),
});

<form onSubmit={handleSubmit((values) => generation.mutate(values))}>
  <label htmlFor="script-text">Script text</label>
  <Textarea id="script-text" {...register("text")} ref={textareaRef} />
  <StyleTagBar textareaRef={textareaRef} value={watch("text")} onChange={(text) => setValue("text", text)} />
  <Button type="submit">Generate</Button>
</form>
```

- [ ] **Step 4: Isolate wavesurfer**

`AudioWaveform` must create WaveSurfer instance only when `audioUrl` exists, destroy it in cleanup, and show path/status fallback when mock output has no loadable file URL. Export/play controls must not imply actual file exists.

```tsx
// apps/desktop/src/components/audio/AudioWaveform.tsx
import WaveSurfer from "wavesurfer.js";
import { useEffect, useRef } from "react";

export function AudioWaveform({ audioUrl, outputPath }: { audioUrl?: string; outputPath?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audioUrl || !host.current) return;
    const wave = WaveSurfer.create({ container: host.current, url: audioUrl, height: 72 });
    return () => wave.destroy();
  }, [audioUrl]);

  return audioUrl ? <div ref={host} /> : <p className="text-sm text-muted">WAV path ready after engine integration: {outputPath}</p>;
}
```

- [ ] **Step 5: Run Generate tests**

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/lib/tag-editor.test.ts src/features/generation/GeneratePage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/desktop/src/components/audio apps/desktop/src/components/generation apps/desktop/src/features/generation apps/desktop/src/lib apps/desktop/src/stores
git commit -m "feat: build mock generation studio"
```

## Task 9: Implement Voices, History, Settings, Diagnostics Screens

**Files:**
- Create: `apps/desktop/src/components/logs/ProcessLogPanel.tsx`
- Create: `apps/desktop/src/features/voice-cloning/VoicesPage.test.tsx`
- Modify: `apps/desktop/src/features/voice-cloning/VoicesPage.tsx`
- Modify: `apps/desktop/src/features/history/HistoryPage.tsx`
- Modify: `apps/desktop/src/features/settings/SettingsPage.tsx`
- Modify: `apps/desktop/src/features/diagnostics/DiagnosticsPage.tsx`

- [ ] **Step 1: Write failing voice file validation UI test**

```tsx
// apps/desktop/src/features/voice-cloning/VoicesPage.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoicesPage } from "./VoicesPage";

describe("VoicesPage", () => {
  it("rejects unsupported reference audio", async () => {
    const user = userEvent.setup();
    render(<VoicesPage />);

    const file = new File(["audio"], "sample.ogg", { type: "audio/ogg" });
    await user.upload(screen.getByLabelText(/reference audio/i), file);
    expect(await screen.findByText(/wav, mp3, or flac/i)).toBeVisible();
  });
});
```

Run:

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/features/voice-cloning/VoicesPage.test.tsx
```

Expected: FAIL while Voices page still contains its route stub.

- [ ] **Step 2: Implement Voices**

Voices page uses `voicePresetSchema`. File input copies selected file name into form state, shows preview player only for accepted local object URL, and renders warning text for duration below 5 seconds or above 30 seconds when duration value is known. Render mock preset list from `MOCK_VOICES`.

```tsx
// apps/desktop/src/features/voice-cloning/VoicesPage.tsx
import { MOCK_VOICES } from "@voice-of-fish/shared/constants";
import { voicePresetSchema } from "@voice-of-fish/shared/schemas";
import { useState } from "react";

export function VoicesPage() {
  const [message, setMessage] = useState("");

  const readFile = (file?: File) => {
    if (!file) return;
    const parsed = voicePresetSchema.shape.referenceFileName.safeParse(file.name);
    setMessage(parsed.success ? "Reference audio accepted." : parsed.error.issues[0].message);
  };

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Voices</h1>
      <label htmlFor="reference-audio">Reference audio</label>
      <input id="reference-audio" type="file" accept=".wav,.mp3,.flac" onChange={(event) => readFile(event.target.files?.[0])} />
      {message && <p>{message}</p>}
      {MOCK_VOICES.map((voice) => <article key={voice.id}>{voice.name} / {voice.referenceFileName}</article>)}
    </section>
  );
}
```

- [ ] **Step 3: Implement History, Settings, Diagnostics**

History:

- Render local-shaped rows from `MOCK_HISTORY`.
- Show text excerpt, model ID, voice, output path, duration, status.

Settings:

- Use current app config or default mock config.
- Render binary/models/output paths, model/audio format, CPU threads, GPU switch.
- Show advanced config inputs only when mode is advanced.

Diagnostics:

- Query system info and generation logs through `studioClient`.
- Render `ProcessLogPanel`, last command redaction example, explicit "No generation error recorded" state, OS/CPU/RAM/GPU/app/engine fields.

```tsx
// apps/desktop/src/features/settings/SettingsPage.tsx
import { defaultConfig } from "@/lib/mock-data";
import { useAppStore } from "@/stores/useAppStore";

export function SettingsPage() {
  const config = useAppStore((state) => state.config) ?? defaultConfig;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p>Binary: {config.binaryPath || "Not configured"}</p>
      <p>Models: {config.modelsPath}</p>
      <p>Outputs: {config.outputsPath}</p>
      <p>CPU threads: {config.cpuThreads}</p>
      {config.mode === "advanced" && <label>Advanced engine arguments<input aria-label="Advanced engine arguments" /></label>}
    </section>
  );
}
```

```tsx
// apps/desktop/src/features/diagnostics/DiagnosticsPage.tsx
import { useQuery } from "@tanstack/react-query";
import { ProcessLogPanel } from "@/components/logs/ProcessLogPanel";
import { studioClient } from "@/lib/tauri";

export function DiagnosticsPage() {
  const info = useQuery({ queryKey: ["system-info"], queryFn: studioClient.getSystemInfo });
  const logs = useQuery({ queryKey: ["generation-logs"], queryFn: () => studioClient.readGenerationLogs() });

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Diagnostics</h1>
      <p>{info.data?.os} / {info.data?.cpu} / {info.data?.ramLabel}</p>
      <p>Last command: &lt;binary&gt; -o &lt;path&gt;</p>
      <p>No generation error recorded.</p>
      <ProcessLogPanel lines={logs.data ?? []} />
    </section>
  );
}
```

- [ ] **Step 4: Run screen tests**

```powershell
pnpm --filter @voice-of-fish/desktop test -- src/features/voice-cloning/VoicesPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/desktop/src/components/logs apps/desktop/src/features
git commit -m "feat: complete mock studio screens"
```

## Task 10: Add Browser E2E, README, And Full Verification

**Files:**
- Create: `apps/desktop/playwright.config.ts`
- Create: `apps/desktop/e2e/app-shell.spec.ts`
- Create: `apps/desktop/e2e/generate.spec.ts`
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Write Playwright coverage**

```ts
// apps/desktop/e2e/app-shell.spec.ts
import { expect, test } from "@playwright/test";

test("setup and route navigation stay usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /voice of fish setup/i })).toBeVisible();
  await page.getByLabel(/s2.cpp binary/i).fill("C:\\s2\\s2.exe");
  await page.getByLabel(/models folder/i).fill("C:\\voice-of-fish\\models");
  await page.getByLabel(/outputs folder/i).fill("C:\\voice-of-fish\\outputs");
  await page.getByRole("button", { name: /save setup/i }).click();
  await page.getByRole("link", { name: /diagnostics/i }).click();
  await expect(page.getByRole("heading", { name: "Diagnostics" })).toBeVisible();
});
```

```ts
// apps/desktop/e2e/generate.spec.ts
import { expect, test } from "@playwright/test";

test("mock generation completes", async ({ page }) => {
  await page.goto("/#/generate");
  await page.getByLabel(/script text/i).fill("A local workstation voice.");
  await page.getByRole("button", { name: "[serious]" }).click();
  await page.getByRole("button", { name: /^generate$/i }).click();
  await expect(page.getByText(/generation completed/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /export wav/i })).toBeEnabled();
});
```

```ts
// apps/desktop/playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "pnpm build:web && pnpm preview --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Run E2E red-green cycle**

Run:

```powershell
pnpm --filter @voice-of-fish/desktop exec playwright install chromium
pnpm test:e2e
```

Expected before final UI fixes: first failure points to missing accessible label/state. Fix the matching label or state in app code, rerun until PASS.

- [ ] **Step 3: Write README**

README must include:

- Name and one-paragraph local-studio purpose.
- Mock-first first slice status.
- Windows-first note with Linux/macOS prepared directories.
- Requirements: pnpm, Node version from Vite/Tauri choice, Rust/Tauri Windows prerequisites.
- Commands: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm test:e2e`.
- Workspace tree.
- Security notes: no arbitrary command strings, local text/audio, delete confirmation, controlled download seam.
- Integration notes: map real `s2.cpp` flags only in Rust process adapter after supported flags validated.
- Fish Audio/s2.cpp model-license review note before distribution/use.

- [ ] **Step 4: Run final verification**

Run:

```powershell
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
cd apps/desktop/src-tauri
cargo test
```

Expected:

- Lint PASS.
- Vitest PASS.
- Playwright PASS.
- `pnpm build` builds Tauri app when local Windows Tauri prerequisites and icons/config are valid; fix config/precondition issues or report missing system prerequisite with exact error.
- Rust tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add README.md .gitignore apps/desktop/e2e apps/desktop/playwright.config.ts apps/desktop/src
git commit -m "test: verify mock desktop workflows"
```

## Coverage Check

- Workspace/scripts: Task 1.
- Shared schemas and mock model data: Task 2.
- Mock state, typed command gateway, i18n boundary: Task 3.
- Tauri required commands, Rust process boundary, binaries directories: Task 4.
- Serious shell/sidebar/header/footer/routes/UI primitives: Task 5.
- Setup and dashboard: Task 6.
- Model Manager mock: Task 7.
- Generate, cursor tags, progress, WAV export state, wavesurfer boundary, recent history: Task 8.
- Voices validation/presets, History, Settings advanced gate, Diagnostics/logs: Task 9.
- README, Vitest, Playwright, lint/build verification: Task 10.
