import { z } from "zod";
import { TagAutocomplete } from "@/components/generation/TagAutocomplete";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generationRequestSchema } from "@voice-of-fish/shared/schemas";
import type { GenerationJob, GenerationRequest } from "@voice-of-fish/shared";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GenerationResult } from "@/components/generation/GenerationResult";
import { RecentGenerations } from "@/components/generation/RecentGenerations";
import { StyleTagBar } from "@/components/generation/StyleTagBar";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { studioClient } from "@/lib/tauri";
import { useAppStore } from "@/stores/useAppStore";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useGenerationPolling } from "./useGenerationPolling";

type FormValues = z.infer<typeof generationRequestSchema>;

const STATUS_PROGRESS: Record<string, number> = {
  idle: 0,
  preparing: 25,
  generating: 65,
  completed: 100,
  failed: 100,
};

export function GenerationPage() {
  const [completedJob, setCompletedJob] = useState<GenerationJob | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [cancelInFlight, setCancelInFlight] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { startPolling, cancelJob } = useGenerationPolling({ onCompletedJob: setCompletedJob });
  const models = useQuery({
    queryKey: ["models"],
    queryFn: studioClient.listLocalModels,
  });
  const installedModels = (models.data ?? []).filter(
    (m) => m.state === "installed",
  );

  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => studioClient.listGenerationHistory(),
  });

  const presets = useQuery({
    queryKey: ["voice-presets"],
    queryFn: studioClient.listVoicePresets,
    staleTime: 30_000,
  });

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(generationRequestSchema) as Resolver<FormValues>,
    defaultValues: {
      text: "",
      language: "en",
      modelId: "s2-q6",
    },
  });

  const status = useGenerationStore((state) => state.status);

  const generation = useMutation({
    mutationFn: studioClient.runGeneration,
    onMutate: () => {
      useGenerationStore.getState().setStatus("preparing");
      useAppStore.getState().setFooterStatus("preparing");
    },
    onSuccess: (job) => {
      setCompletedJob(job);
      setActiveJobId(job.id);
      useAppStore.getState().setActiveJobId(job.id);
      useGenerationStore.getState().setStatus("generating");
      startPolling();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[GenerationPage] mutation failed:", message);
      setActiveJobId(null);
      useAppStore.getState().setActiveJobId(null);
      useAppStore.getState().setFooterStatus("error");
      useGenerationStore.getState().setStatus("failed");
      toast.error(`Generation failed: ${message}`);
      setTimeout(() => {
        useAppStore.getState().setFooterStatus("ready");
      }, 5000);
    },
  });

  const onSubmit = (values: FormValues) => {
    generation.mutate(values as GenerationRequest);
  };

  const handleCancel = async () => {
    if (!activeJobId) return;
    setCancelInFlight(true);
    try {
      cancelJob(activeJobId);
    } finally {
      setCancelInFlight(false);
      setActiveJobId(null);
      useAppStore.getState().setActiveJobId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Generate</h1>
        <p className="mt-1 text-sm text-concrete-300">
          Compose script text, add style tags, and generate audio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generation request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            id="generation-form"
            data-shortcut="generate"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-1">
              <label
                htmlFor="script-text"
                className="text-sm font-medium text-concrete-50"
              >
                Script text
              </label>
              <Textarea
                id="script-text"
                {...register("text")}
                ref={(element) => {
                  register("text").ref(element);
                  textareaRef.current = element;
                }}
              />
              {errors.text && (
                <p role="alert" className="text-sm text-ember">
                  {errors.text.message}
                </p>
              )}
            </div>
            <StyleTagBar
              textareaRef={textareaRef}
              getValue={() => getValues("text")}
              onChange={(text) =>
                setValue("text", text, { shouldValidate: true })
              }
            />
            <TagAutocomplete
              textareaRef={textareaRef}
              getValue={() => getValues("text")}
              onChange={(text) =>
                setValue("text", text, { shouldValidate: true })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="model"
                  className="text-sm font-medium text-concrete-50"
                >
                  Model
                </label>
                <select
                  id="model"
                  {...register("modelId")}
                  className="flex h-9 w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-1 text-sm text-concrete-50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-concrete"
                >
                  {installedModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.quant} / {model.filename}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="language"
                  className="text-sm font-medium text-concrete-50"
                >
                  Language
                </label>
                <LanguageSelect id="language" register={register("language")} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="seed"
                  className="text-sm font-medium text-concrete-50"
                >
                  Seed (optional)
                </label>
                <Input
                  id="seed"
                  type="number"
                  placeholder="e.g. 42"
                  {...register("seed")}
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="voice"
                  className="text-sm font-medium text-concrete-50"
                >
                  Voice preset (optional)
                </label>
                <select
                  id="voice"
                  {...register("voicePresetId")}
                  className="flex h-9 w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-1 text-sm text-concrete-50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-concrete"
                >
                  <option value="">None</option>
                  {(() => {
                    const all = presets.data ?? [];
                    const builtIn = all.filter((p) =>
                      p.id.startsWith("built-in-")
                    );
                    const custom = all.filter(
                      (p) => !p.id.startsWith("built-in-")
                    );
                    const groups: { label: string; items: typeof all }[] = [];
                    if (builtIn.length > 0) {
                      const byLang = new Map<string, typeof all>();
                      for (const p of builtIn) {
                        const lang = p.language ?? "other";
                        if (!byLang.has(lang)) byLang.set(lang, []);
                        byLang.get(lang)!.push(p);
                      }
                      for (const [lang, items] of byLang) {
                        groups.push({
                          label: `Built-in — ${lang.toUpperCase()}`,
                          items,
                        });
                      }
                    }
                    if (custom.length > 0) {
                      groups.push({ label: "Custom", items: custom });
                    }
                    return groups.flatMap((group) => [
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name}
                            {preset.gender
                              ? ` (${preset.gender})`
                              : ""}
                          </option>
                        ))}
                      </optgroup>,
                    ]);
                  })()}
                </select>
              </div>
            </div>

            {status !== "idle" && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-concrete-300">
                  {status}
                </p>
                <Progress
                  value={STATUS_PROGRESS[status] ?? 0}
                  aria-label="Generation progress"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={generation.isPending}>
                Generate
              </Button>
              {(status === "preparing" || status === "generating") && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={cancelInFlight || !activeJobId}
                  onClick={handleCancel}
                >
                  {cancelInFlight ? "Cancelling…" : "Cancel"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {completedJob && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerationResult job={completedJob} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent generations</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentGenerations
            history={history.data ?? []}
            completedJob={completedJob}
          />
        </CardContent>
      </Card>
    </section>
  );
}
