import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LANGUAGE_OPTIONS } from "@voice-of-fish/shared/constants";
import { generationRequestSchema } from "@voice-of-fish/shared/schemas";
import type { GenerationJob, GenerationRequest } from "@voice-of-fish/shared";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { GenerationResult } from "@/components/generation/GenerationResult";
import { RecentGenerations } from "@/components/generation/RecentGenerations";
import { StyleTagBar } from "@/components/generation/StyleTagBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { studioClient } from "@/lib/tauri";
import { useAppStore } from "@/stores/useAppStore";
import { useGenerationStore } from "@/stores/useGenerationStore";

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      useGenerationStore.getState().setStatus("completed");
      useAppStore.getState().setFooterStatus("ready");
      toast.success("Generation completed");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[GenerationPage] mutation failed:", message);
      useAppStore.getState().setFooterStatus("error");
      useGenerationStore.getState().setStatus("failed");
      toast.error(`Generation failed: ${message}`);
      setTimeout(() => {
        useAppStore.getState().setFooterStatus("ready");
      }, 5000);
    },
  });

  // Reset footerStatus on unmount to clear 'error' state
  useEffect(() => {
    return () => {
      useAppStore.getState().setFooterStatus("ready");
    };
  }, []);

  const onSubmit = (values: FormValues) => {
    generation.mutate(values as GenerationRequest);
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Generate</h1>
        <p className="mt-1 text-sm text-muted">
          Compose script text, add style tags, and generate audio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generation request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            <div className="space-y-1">
              <label
                htmlFor="script-text"
                className="text-sm font-medium text-studio-foreground"
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
                <p role="alert" className="text-sm text-danger">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="model"
                  className="text-sm font-medium text-studio-foreground"
                >
                  Model
                </label>
                <select
                  id="model"
                  {...register("modelId")}
                  className="flex h-9 w-full rounded-md border border-line bg-studio px-3 py-1 text-sm text-studio-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
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
                  className="text-sm font-medium text-studio-foreground"
                >
                  Language
                </label>
                <select
                  id="language"
                  {...register("language")}
                  className="flex h-9 w-full rounded-md border border-line bg-studio px-3 py-1 text-sm text-studio-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="seed"
                  className="text-sm font-medium text-studio-foreground"
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
                  className="text-sm font-medium text-studio-foreground"
                >
                  Voice preset (optional)
                </label>
                <select
                  id="voice"
                  {...register("voicePresetId")}
                  className="flex h-9 w-full rounded-md border border-line bg-studio px-3 py-1 text-sm text-studio-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio"
                >
                  <option value="">None</option>
                  {(presets.data ?? []).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {status !== "idle" && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {status}
                </p>
                <Progress
                  value={STATUS_PROGRESS[status] ?? 0}
                  aria-label="Generation progress"
                />
              </div>
            )}

            <Button type="submit" disabled={generation.isPending}>
              Generate
            </Button>
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
