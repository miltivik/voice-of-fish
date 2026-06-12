import { useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { settingsSchema } from "@voice-of-fish/shared/schemas";
import {
  DEFAULT_APP_CONFIG,
  S2_MODEL_MANIFEST,
} from "@voice-of-fish/shared/constants";
import { useAppStore } from "@/stores/useAppStore";
import { studioClient } from "@/lib/tauri";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const config = useAppStore((state) => state.config);
  const saveConfig = useAppStore((state) => state.saveConfig);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: config ?? { ...DEFAULT_APP_CONFIG },
    mode: "onBlur",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (values: SettingsFormValues) => {
    await studioClient.saveAppConfig(values);
    saveConfig(values);
  };

  const handleExport = useCallback(async () => {
    try {
      const currentConfig = await studioClient.getAppConfig();
      if (!currentConfig) {
        toast.error("No config to export");
        return;
      }
      const json = JSON.stringify(currentConfig, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "voice-of-fish-config.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Config exported");
    } catch {
      toast.error("Failed to export config");
    }
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const result = settingsSchema.safeParse(parsed);
        if (!result.success) {
          toast.error(
            `Invalid config: ${result.error.issues.map((i) => i.message).join(", ")}`,
          );
          return;
        }
        reset(result.data);
        await studioClient.saveAppConfig(result.data);
        saveConfig(result.data);
        toast.success("Config imported");
      } catch (err) {
        if (err instanceof SyntaxError) {
          toast.error("Invalid JSON file");
        } else {
          toast.error(
            `Failed to import: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      // Reset file input so the same file can be re-imported
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [reset, saveConfig],
  );

  const handleReset = useCallback(async () => {
    reset({ ...DEFAULT_APP_CONFIG });
    await studioClient.saveAppConfig({ ...DEFAULT_APP_CONFIG });
    saveConfig({ ...DEFAULT_APP_CONFIG });
    toast.success("Reset to defaults");
  }, [reset, saveConfig]);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
          <p className="mt-1 text-sm text-concrete-300">
            Local app configuration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Export config
          </Button>
          <Button variant="secondary" size="sm" onClick={handleImport}>
            Import config
          </Button>
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset to defaults
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Paths */}
        <Card>
          <CardHeader>
            <CardTitle>Paths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="binaryPath"
                className="text-sm font-medium text-concrete-50"
              >
                Binary
              </label>
              <Input
                id="binaryPath"
                {...register("binaryPath")}
                placeholder="/path/to/s2"
                aria-invalid={!!errors.binaryPath}
              />
              {errors.binaryPath && (
                <p className="text-xs text-ember">
                  {errors.binaryPath.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="modelsPath"
                className="text-sm font-medium text-concrete-50"
              >
                Models
              </label>
              <Input
                id="modelsPath"
                {...register("modelsPath")}
                placeholder="/path/to/models"
                aria-invalid={!!errors.modelsPath}
              />
              {errors.modelsPath && (
                <p className="text-xs text-ember">
                  {errors.modelsPath.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="outputsPath"
                className="text-sm font-medium text-concrete-50"
              >
                Outputs
              </label>
              <Input
                id="outputsPath"
                {...register("outputsPath")}
                placeholder="/path/to/outputs"
                aria-invalid={!!errors.outputsPath}
              />
              {errors.outputsPath && (
                <p className="text-xs text-ember">
                  {errors.outputsPath.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Engine Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Engine Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="defaultModelId"
                className="text-sm font-medium text-concrete-50"
              >
                Model
              </label>
              <select
                id="defaultModelId"
                {...register("defaultModelId")}
                className="flex h-9 w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-1 text-sm text-concrete-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
              >
                {S2_MODEL_MANIFEST.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} ({m.quant} — {m.displaySize})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="cpuThreads"
                className="text-sm font-medium text-concrete-50"
              >
                CPU Threads
              </label>
              <Input
                id="cpuThreads"
                type="number"
                min={1}
                max={256}
                {...register("cpuThreads")}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="gpuEnabled"
                type="checkbox"
                {...register("gpuEnabled")}
                className="h-4 w-4 accent-electric"
              />
              <label
                htmlFor="gpuEnabled"
                className="text-sm font-medium text-concrete-50"
              >
                Enable GPU
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || !isValid}>
            Save
          </Button>
        </div>
      </form>
    </section>
  );
}
