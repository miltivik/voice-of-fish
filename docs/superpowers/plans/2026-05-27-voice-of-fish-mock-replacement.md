# Voice of Fish — History + Settings + Voice Presets Implementation Plan

## Análisis previo

Los 3 sistemas tienen backend Rust completo. El frontend solo necesita conectarse:

| Sistema | Backend Rust | Frontend actual | Cambio necesario |
|---|---|---|---|
| **History** | `list_history` lee JSON, `append_history` escribe | `HistoryPage` ya llama `listGenerationHistory()` pero mockClient devuelve `MOCK_HISTORY` | mock-data.ts devuelva `[]` |
| **Settings** | `get_app_config` / `save_app_config` | Read-only display | Convertir a formulario editable con `useAppStore.saveConfig()` |
| **Voice presets** | `list_presets` / `save_preset` / `delete_preset` (CRUD completo con JSON) | Stubeado | Crear UI: lista + formulario add/edit/delete |

## Task 1 — History real

**Archivo:** `apps/desktop/src/lib/mock-data.ts`

**Cambio:** `listGenerationHistory: async () => structuredClone(MOCK_HISTORY)` → `listGenerationHistory: async () => []`

**KISS:** El backend real ya persiste y lee del disco. El mockClient solo existe para desarrollo sin Tauri. Devolver `[]` es el comportamiento correcto: sin Tauri no hay historial previo.

**Verificación:** `pnpm --filter @voice-of-fish/desktop test`

---

## Task 2 — Settings editable

**Archivos:**
- `apps/desktop/src/features/settings/SettingsPage.tsx`

**Cambio:** Reemplazar display read-only por formulario con React Hook Form + Zod:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema } from "@voice-of-fish/shared/schemas";
import type { AppConfig } from "@voice-of-fish/shared";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

export function SettingsPage() {
  const config = useAppStore((state) => state.config);
  const saveConfig = useAppStore((state) => state.saveConfig);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<AppConfig>({
    resolver: zodResolver(settingsSchema),
    values: config,
  });

  const onSubmit = (values: AppConfig) => {
    saveConfig(values);
  };

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        <label>Binary path <Input {...register("binaryPath")} /></label>
        {errors.binaryPath && <p className="text-xs text-danger">{errors.binaryPath.message}</p>}
        <label>Models path <Input {...register("modelsPath")} /></label>
        <label>Outputs path <Input {...register("outputsPath")} /></label>
        <label>Default model <Input {...register("defaultModelId")} /></label>
        <label>CPU threads <Input type="number" {...register("cpuThreads", { valueAsNumber: true })} /></label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register("gpuEnabled")} /> GPU enabled
        </label>
        <Button type="submit" disabled={!isDirty}>Save</Button>
      </form>
    </section>
  );
}
```

**Verificación:** `pnpm --filter @voice-of-fish/desktop test`

---

## Task 3 — Voice presets CRUD

**Archivos:**
- Crear/Reemplazar `apps/desktop/src/features/voice-cloning/VoicesPage.tsx`

**Cambio:** UI simple con lista + formulario inline. Un solo componente, sin rutas ni subcomponentes:

- TanStack Query para `listVoicePresets`
- Mutations para `saveVoicePreset` / `deleteVoicePreset`
- Formulario con: name, language, referenceText, referenceFileName
- Validación con `voicePresetSchema` de shared
- ID generado como `voice-{timestamp}`

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { voicePresetSchema } from "@voice-of-fish/shared/schemas";
import type { VoicePreset } from "@voice-of-fish/shared";
import { studioClient } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function VoicesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VoicePreset | null>(null);
  
  const presets = useQuery({ queryKey: ["voice-presets"], queryFn: studioClient.listVoicePresets });
  
  const saveMutation = useMutation({
    mutationFn: studioClient.saveVoicePreset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voice-presets"] }),
  });
  
  const deleteMutation = useMutation({
    mutationFn: studioClient.deleteVoicePreset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voice-presets"] }),
  });

  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(voicePresetSchema),
    values: editing ?? { name: "", language: "en", referenceText: "", referenceFileName: "" },
  });

  const onSubmit = (data: any) => {
    saveMutation.mutate({ ...data, id: editing?.id ?? `voice-${Date.now()}` });
    reset();
    setEditing(null);
  };

  // ... render list + form
}
```

**Verificación:** `pnpm --filter @voice-of-fish/desktop test`

---

## Task 4 — Verificación final

```sh
pnpm --filter @voice-of-fish/desktop test
pnpm --filter @voice-of-fish/shared test
pnpm --filter @voice-of-fish/desktop lint
pnpm --filter @voice-of-fish/desktop build:web
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```
