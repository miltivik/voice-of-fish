import { z } from "zod";
import { TagAutocomplete } from "@/components/generation/TagAutocomplete";
import { zodResolver } from "@hookform/resolvers/zod";
import { generationRequestSchema } from "@voice-of-fish/shared/schemas";
import type {
  GenerationJob,
  ModelManifestEntry,
  VoicePreset,
} from "@voice-of-fish/shared";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { StyleTagBar } from "@/components/generation/StyleTagBar";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { studioClient } from "@/lib/tauri";
import { useAppStore } from "@/stores/useAppStore";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useGenerationPolling } from "./useGenerationPolling";
import { VoicePresetSelector } from "./VoicePresetSelector";
import { GenerationStatusBar } from "./GenerationStatusBar";

type FormValues = z.infer<typeof generationRequestSchema>;

const STATUS_PROGRESS: Record<string, number> = {
  idle: 0,
  preparing: 25,
  generating: 65,
  completed: 100,
  failed: 100,
};

interface GenerationFormProps {
  installedModels: ModelManifestEntry[];
  presets: VoicePreset[];
  onJobComplete: (job: GenerationJob) => void;
}

export function GenerationForm({
  installedModels,
  presets,
  onJobComplete,
}: GenerationFormProps) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [cancelInFlight, setCancelInFlight] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { startPolling, cancelJob } = useGenerationPolling({
    onCompletedJob: onJobComplete,
  });

  const storeDraft = useGenerationStore((state) => state.draft);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(generationRequestSchema),
    defaultValues: { ...storeDraft },
  });
  // react-hook-form returns a fresh `{ onChange, onBlur, name, ref }`
  // object on every call to `register`. Calling it twice for the same
  // field (once via the spread, once inside the ref callback) creates
  // two competing registrations, the second wins, but the first can
  // log a "register/unregister" cycle warning. Capture once and reuse.
  const textRegister = register("text");
  // Re-sync the form when a HistoryPage retry writes a new draft while
  // this component is already mounted (e.g. SPA navigation reuses the
  // component instance). Without this the form keeps stale values and the
  // retry looks like a no-op to the user.
  useEffect(() => {
    reset(storeDraft);
  }, [storeDraft, reset]);
  const voicePresetId = (watch("voicePresetId") as string | undefined) ?? "";

  const generation = useMutation({
    mutationFn: studioClient.runGeneration,
    onMutate: () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      useGenerationStore.getState().setStatus("preparing");
      useAppStore.getState().setFooterStatus("preparing");
    },
    onSuccess: (job) => {
      onJobComplete(job);
      setActiveJobId(job.id);
      useAppStore.getState().setActiveJobId(job.id);
      useGenerationStore.getState().setStatus("generating");
      startPolling();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[GenerationForm] mutation failed:", message);
      setActiveJobId(null);
      useAppStore.getState().setActiveJobId(null);
      useAppStore.getState().setFooterStatus("error");
      useGenerationStore.getState().setStatus("failed");
      toast.error(`Generation failed: ${message}`);
      resetTimerRef.current = setTimeout(() => {
        useAppStore.getState().setFooterStatus("ready");
        resetTimerRef.current = null;
      }, 5000);
    },
  });

  const onSubmit = (values: FormValues) => {
    generation.mutate(values);
  };

  const handleCancel = async () => {
    if (!activeJobId) return;
    setCancelInFlight(true);
    try {
      await cancelJob(activeJobId);
    } catch (err) {
      console.error("[GenerationForm] cancel failed:", err);
    } finally {
      setCancelInFlight(false);
      setActiveJobId(null);
      useAppStore.getState().setActiveJobId(null);
    }
  };

  return (
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
              {...textRegister}
              ref={(element) => {
                textRegister.ref(element);
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

            <VoicePresetSelector
              presets={presets}
              selectedPresetId={voicePresetId}
              onSelectPreset={(id) =>
                setValue("voicePresetId", id || "", {
                  shouldValidate: true,
                })
              }
            />
          </div>

          <GenerationStatusBar
            status={status}
            progress={STATUS_PROGRESS[status] ?? 0}
          />

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
  );
}
