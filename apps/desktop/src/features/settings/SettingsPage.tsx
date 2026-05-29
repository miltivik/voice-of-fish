import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema } from "@voice-of-fish/shared/schemas";
import { DEFAULT_APP_CONFIG, S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";
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
    formState: { errors, isDirty, isValid },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as Resolver<SettingsFormValues>,
    defaultValues: config ?? { ...DEFAULT_APP_CONFIG },
    mode: "onBlur",
  });

  const onSubmit = async (values: SettingsFormValues) => {
    await studioClient.saveAppConfig(values);
    saveConfig(values);
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-1 text-sm text-muted">Local app configuration.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Paths */}
        <Card>
          <CardHeader>
            <CardTitle>Paths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="binaryPath" className="text-sm font-medium text-studio-foreground">Binary</label>
              <Input id="binaryPath" {...register("binaryPath")} placeholder="/path/to/s2" aria-invalid={!!errors.binaryPath} />
              {errors.binaryPath && <p className="text-xs text-danger">{errors.binaryPath.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="modelsPath" className="text-sm font-medium text-studio-foreground">Models</label>
              <Input id="modelsPath" {...register("modelsPath")} placeholder="/path/to/models" aria-invalid={!!errors.modelsPath} />
              {errors.modelsPath && <p className="text-xs text-danger">{errors.modelsPath.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="outputsPath" className="text-sm font-medium text-studio-foreground">Outputs</label>
              <Input id="outputsPath" {...register("outputsPath")} placeholder="/path/to/outputs" aria-invalid={!!errors.outputsPath} />
              {errors.outputsPath && <p className="text-xs text-danger">{errors.outputsPath.message}</p>}
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
              <label htmlFor="defaultModelId" className="text-sm font-medium text-studio-foreground">Model</label>
              <select id="defaultModelId" {...register("defaultModelId")}
                className="flex h-9 w-full rounded-md border border-line bg-studio px-3 py-1 text-sm text-studio-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                {S2_MODEL_MANIFEST.map((m) => (
                  <option key={m.id} value={m.id}>{m.id} ({m.quant} — {m.displaySize})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="cpuThreads" className="text-sm font-medium text-studio-foreground">CPU Threads</label>
              <Input id="cpuThreads" type="number" min={1} max={256} {...register("cpuThreads")} />
            </div>
            <div className="flex items-center gap-2">
              <input id="gpuEnabled" type="checkbox" {...register("gpuEnabled")} className="h-4 w-4 accent-accent" />
              <label htmlFor="gpuEnabled" className="text-sm font-medium text-studio-foreground">Enable GPU</label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || !isValid}>Save</Button>
        </div>
      </form>
    </section>
  );
}