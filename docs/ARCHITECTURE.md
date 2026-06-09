# Voice of Fish — Architecture & Patterns

> Written for future AI coding agents and human maintainers.
> Applies KISS, Clean Code, and project-specific conventions documented below.

## Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Tauri 2 (Rust backend + webview) |
| Frontend | React 19, TypeScript strict, Vite |
| State | TanStack Query (server), Zustand (client) |
| Forms | react-hook-form + zod |
| Styling | Tailwind CSS, glassmorphic-brutalist design system |
| IPC | `invoke<T>(cmd, args)` — typed wrappers in `@/lib/tauri.ts` |
| Shared | `packages/shared` — types, constants, schemas |

## Directory map

```
apps/desktop/src/
├── app/           # AppProviders, root layout
├── components/
│   ├── generation/ # TagAutocomplete, StyleTagBar, GenerationResult
│   ├── layout/     # AppShell, Sidebar, Footer, EngineHeader
│   ├── model/      # ModelCard
│   ├── settings/   # SetupPanel, onboarding steps
│   └── ui/         # shadcn-style primitives (Button, Card, Input…)
├── features/       # Page components: dashboard, generation, editor, history…
├── hooks/          # Custom hooks
├── lib/            # tauri client, platform, i18n, tag-editor
├── stores/         # Zustand stores
└── test-utils/     # tauri-mocks
```

## Pattern 1 — Tauri IPC calls

**File:** `@/lib/tauri.ts`

Every backend command is a flat method on the `studioClient` object:

```typescript
export const studioClient = {
  listLocalModels: () => invoke<ModelManifestEntry[]>("list_local_models"),
  deleteModel: (modelId: string) => invoke<ModelManifestEntry[]>("delete_model", { modelId }),
  // …
};
```

**Rules:**
- No interface/abstract class — the object shape IS the contract.
- No validation wrapper. `invoke<T>()` types protect the caller. Path validation (for `open_output_folder`, etc.) lives in the Rust backend, not duplicated in JS.
- Every method maps 1:1 to a Tauri command. Name convention: `camelCase` in JS, `snake_case` in Rust (`#[tauri::command(rename_all = "camelCase")]`).
- When adding a new command:
  1. Add the Rust function + `#[tauri::command]` in `commands.rs`
  2. Register in `main.rs` `generate_handler![]`
  3. Add method to `studioClient` in `tauri.ts`

### Testing

Use `setupTauriMocks(commands)` from `@/test-utils/tauri-mocks`. Pass an object where keys are Tauri command names (`snake_case`):

```typescript
beforeEach(() => {
  setupTauriMocks({
    list_local_models: [...],
    run_generation: { id: "j1", status: "completed", … },
  });
});
```

Unknown commands return `null`. Wrap components in a minimal `QueryClientProvider` test wrapper. **Do NOT use `AppProviders`** in page tests — it triggers the built-in voice seeding effect.

## Pattern 2 — Data fetching (TanStack Query)

**Convention:**
- `staleTime: Infinity` for rarely-changing data (system info, app config).
- `staleTime: 30_000` for lists that change (voice presets).
- Mutations call `queryClient.invalidateQueries({ queryKey: […] })` on success.

**Examples:**

```typescript
// Read
const models = useQuery({ queryKey: ["models"], queryFn: studioClient.listLocalModels });

// Mutate
const download = useMutation({
  mutationFn: studioClient.downloadModel,
  onSuccess: (next) => queryClient.setQueryData(["models"], next),
});
```

## Pattern 3 — Zustand stores

**Files:** `@/stores/useAppStore.ts`, `useGenerationStore.ts`, `useModelStore.ts`

- Keep stores small — one concern per store.
- Async actions call `studioClient` methods directly.
- Synchronous state setters use `set()` inline.
- Import from `create` (zustand), not `createStore`.

## Pattern 4 — Form with zod + react-hook-form

**Schema definition** lives in `packages/shared/src/schemas.ts`:

```typescript
export const generationRequestSchema = z.object({
  text: z.string().min(1).max(TEXT_MAX_LENGTH),
  language: z.string(),
  modelId: z.string(),
  seed: optionalSeed,
  voicePresetId: z.string().optional(),
  referenceAudioPath: z.string().optional(),
  referenceText: z.string().optional(),
});
```
**Usage:**
```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(generationRequestSchema),
  defaultValues: { text: "", language: "en", modelId: "s2-q6", seed: undefined },
});
```
```

- Schema is shared between frontend (validation) and backend (documentation).
- Never duplicate field-level validation in the component.

## Pattern 5 — First-run seeding

**File:** `apps/desktop/src/app/providers.tsx`

Seeding runs once on app start inside `useEffect` with a cancellation flag:

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const config = await studioClient.getAppConfig();
    if (!config || cancelled) return;
    const results = await studioClient.seedBuiltInVoices(config.outputsPath);
    if (!results || cancelled) return;
    // …invalidate queries…
  })();
  return () => { cancelled = true; };
}, [queryClient]);
```

**Rules for future seeding:**
- Always guard with `cancelled` flag after every `await`.
- Catch errors — seeding failure must never block the app.
- Invalidate relevant queries after success so UI refreshes.

## Pattern 6 — Textarea autocomplete

**Files:** `TagAutocomplete.tsx`, `tag-editor.ts`

1. Pure functions `getActiveQuery(text, cursor)` and `filterTags(query)` live in `@/lib/tag-editor.ts` — testable independently.
2. `TagAutocomplete` component handles DOM positioning, keyboard nav (↑↓ Enter Esc), outside-click dismiss.
3. Listeners (input, keyup, click, keydown) are attached via `useEffect` on the textarea ref.

## Pattern 7 — Rust module structure

```
src-tauri/src/
├── main.rs         # tauri::Builder + generate_handler![]
├── lib.rs          # module declarations
├── commands.rs     # All #[tauri::command] functions
├── models.rs       # Data structs (shared contract with TS types)
├── config.rs       # AppConfig read/write
├── downloads.rs    # GGUF model downloader
├── history.rs      # Generation history CRUD
├── presets.rs      # VoicePreset CRUD
├── built_in_voices.rs # Built-in voice catalog + seeding
├── process.rs      # s2.cpp process manager
└── diagnostics.rs  # System info gathering
```

- One module = one concern. No module with a single public function — inline it.
- `models.rs` structs mirror `packages/shared/src/types.ts` interfaces 1:1.
- Commands use `#[serde(rename_all = "camelCase")]` to match JS convention.
- Tests live in `#[cfg(test)] mod tests {}` at the bottom of each module.

## Pattern 8 — Rust command template

```rust
#[tauri::command(rename_all = "camelCase")]
pub fn my_command(
    required_param: String,
    optional_param: Option<String>,
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<MyResult, String> {
    // Validate inputs early.
    if required_param.is_empty() {
        return Err("required_param is empty".into());
    }
    // Delegate to module function.
    crate::my_module::do_work(&required_param, optional_param.as_deref())
}
```

- Errors are `String` (not custom error types).
- `crate::module::function()` delegation — commands.rs has no business logic.

## KISS rules

1. **Before adding a new type/interface, ask:** is it used in ≥3 places? If not, use an inline object literal.
2. **Before extracting a helper, ask:** is the logic ≥5 lines AND used in ≥2 files? If yes, extract to shared. If not, keep it inline.
3. **No optional fields that are always present.** If the Rust backend always sets `voiceName` and `durationSeconds` on `HistoryRecord`, the TS type must declare them as required.
4. **No 1:1 proxy objects.** `tauriClient` → `studioClient` was deleted. One indirection is the max.
5. **No one-line function wrappers.** `hasAnyExtension(path, exts)` was inlined. A function whose entire body is `return expr` must stay inline unless it represents a named domain concept used in ≥3 call sites.
6. **Dead code must be deleted, not commented out.** Deleted in this pass: `AdvancedArgValue`, `MOCK_HISTORY`, `DeskTopPlatform` re-export, `joinDisplayPath`, duplicate `SUPPORTED_LANGUAGES`, `tauriClient`/`mockClient` dead mock entries.
7. **Component ≤200 lines.** If a component grows past that, extract sub-components or hooks. Generation polling lives in `apps/desktop/src/features/generation/useGenerationPolling.ts`; page components should keep timers inside hooks with unmount cleanup. `GenerationPage` is the largest at ~300 lines; its voice preset selector group is a candidate for extraction.
8. **No `ReturnType<typeof fn>` for contracts.** Export named types from the module that owns the value. The only exception is `setTimeout`/`setInterval` handles.
9. **Path validation lives in Rust.** `validatePath()` in the frontend is informational-only. Don't duplicate security checks.
10. **Every new built-in voice adds one entry** to both `packages/shared/src/built-in-voices.ts` and `apps/desktop/src-tauri/src/built_in_voices.rs`. Reference audio must come from a stable URL (Hugging Face dataset) with a verified file path.

## When patterns break

If you find yourself fighting a pattern, document why in an ADR (`docs/adr/`). The pattern may need updating.
