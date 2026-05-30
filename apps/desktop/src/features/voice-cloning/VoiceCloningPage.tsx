import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { studioClient, pickAudioPath } from "@/lib/tauri";
import type { VoicePreset } from "@voice-of-fish/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const voicePresetFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  language: z.string().trim().min(1, "Language is required"),
  referenceText: z.string().trim().min(1, "Reference text is required"),
  referenceFileName: z
    .string()
    .trim()
    .min(1, "Reference file name is required")
    .regex(/\.(wav|mp3|flac)$/i, "Must be .wav, .mp3, or .flac"),
  notes: z.string().trim().max(400).optional(),
});

type VoicePresetFormData = z.infer<typeof voicePresetFormSchema>;

export function VoiceCloningPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VoicePreset | null>(null);
  const [audioPath, setAudioPath] = useState("");

  const presets = useQuery({
    queryKey: ["voice-presets"],
    queryFn: studioClient.listVoicePresets,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<VoicePresetFormData>({
    resolver: zodResolver(voicePresetFormSchema),
    defaultValues: {
      name: "",
      language: "en",
      referenceText: "",
      referenceFileName: "",
      notes: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (preset: VoicePreset) => studioClient.saveVoicePreset(preset),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["voice-presets"] });
      setEditing(saved);
      setAudioPath("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studioClient.deleteVoicePreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-presets"] });
      setEditing(null);
      setAudioPath("");
      reset({ name: "", language: "en", referenceText: "", referenceFileName: "", notes: "" });
    },
  });

  const onSubmit = (data: VoicePresetFormData) => {
    const preset: VoicePreset = {
      ...data,
      id: editing?.id ?? `voice-${crypto.randomUUID()}`,
      durationSeconds: editing?.durationSeconds,
      referenceAudioPath: audioPath || editing?.referenceAudioPath,
    };
    saveMutation.mutate(preset);
  };

  const startAdd = () => {
    setEditing(null);
    setAudioPath("");
    reset({ name: "", language: "en", referenceText: "", referenceFileName: "", notes: "" });
  };

  const startEdit = (preset: VoicePreset) => {
    setEditing(preset);
    setAudioPath(preset.referenceAudioPath ?? "");
  };

  const cancelForm = () => {
    setEditing(null);
    setAudioPath("");
    reset({ name: "", language: "en", referenceText: "", referenceFileName: "", notes: "" });
  };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Voices</h1>
        <p className="mt-1 text-sm text-muted">
          Reference audio upload and voice preset library.
        </p>
      </div>

      {/* Presets List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Voice presets</CardTitle>
          <Button variant="secondary" size="sm" onClick={startAdd}>
            Add preset
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {presets.isLoading ? (
            <p className="text-sm text-muted">Loading presets…</p>
          ) : presets.isError ? (
            <p className="text-sm text-danger">Failed to load presets.</p>
          ) : (presets.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted">No voice presets saved yet.</p>
          ) : (
            presets.data!.map((preset) => (
              <article
                key={preset.id}
                className={`rounded-md border border-line bg-studio p-3 ${
                  editing?.id === preset.id ? "border-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-studio-foreground truncate">
                      {preset.name}
                    </p>
                    <p className="mt-1 text-xs text-muted truncate">
                      {preset.referenceFileName}
                      {" · "}{preset.language.toUpperCase()}
                      {preset.durationSeconds != null && ` · ${preset.durationSeconds}s`}
                    </p>
                    {preset.referenceText && (
                      <p className="mt-1 text-xs text-muted line-clamp-2">
                        {preset.referenceText}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(preset)}
                      title="Edit preset"
                    >
                      <span aria-hidden="true">✏️</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(preset.id)}
                      title="Delete preset"
                    >
                      <span aria-hidden="true">🗑️</span>
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit preset" : "Add preset"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Name */}
            <div>
              <label htmlFor="preset-name" className="text-sm font-medium text-studio-foreground block">
                Name
              </label>
              <Input
                id="preset-name"
                {...register("name")}
                placeholder="e.g. Nora short phrase"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p role="alert" className="mt-1 text-xs text-danger">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Language */}
            <div>
              <label htmlFor="preset-language" className="text-sm font-medium text-studio-foreground block">
                Language
              </label>
              <Input
                id="preset-language"
                {...register("language")}
                placeholder="en"
                aria-invalid={!!errors.language}
              />
              {errors.language && (
                <p role="alert" className="mt-1 text-xs text-danger">
                  {errors.language.message}
                </p>
              )}
            </div>

            {/* Reference text */}
            <div>
              <label htmlFor="preset-reference-text" className="text-sm font-medium text-studio-foreground block">
                Reference text
              </label>
              <textarea
                id="preset-reference-text"
                {...register("referenceText")}
                rows={3}
                placeholder="Text that appears in the reference audio…"
                className="flex min-h-[80px] w-full rounded-md border border-line bg-studio px-3 py-2 text-sm text-studio-foreground shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-studio disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!errors.referenceText}
              />
              {errors.referenceText && (
                <p role="alert" className="mt-1 text-xs text-danger">
                  {errors.referenceText.message}
                </p>
              )}
            </div>

            {/* Reference audio file */}
            <div>
              <label htmlFor="preset-reference-file" className="text-sm font-medium text-studio-foreground block">
                Reference audio file
              </label>
              <div className="flex gap-2">
                <Input
                  id="preset-reference-file"
                  {...register("referenceFileName")}
                  placeholder="/path/to/recording.wav"
                  aria-invalid={!!errors.referenceFileName}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const path = await pickAudioPath();
                    if (path) {
                      const filename = path.split(/[/\\]/).pop() ?? path;
                      setAudioPath(path);
                      setValue("referenceFileName", filename, { shouldValidate: true });
                    }
                  }}
                  className="shrink-0 rounded-lg bg-line/50 px-3 py-2 text-xs font-medium text-studio-foreground transition-colors hover:bg-line"
                >
                  Browse
                </button>
              </div>
              {errors.referenceFileName ? (
                <p role="alert" className="mt-1 text-xs text-danger">
                  {errors.referenceFileName.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">
                  Must be .wav, .mp3, or .flac
                </p>
              )}
            </div>

            {/* Notes (optional) */}
            <div>
              <label htmlFor="preset-notes" className="text-sm font-medium text-studio-foreground block">
                Notes <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                id="preset-notes"
                {...register("notes")}
                placeholder="Optional notes about this voice preset…"
                maxLength={400}
              />
            </div>

            {/* Form actions */}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Update preset" : "Save preset"}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={cancelForm}>
                  Cancel
                </Button>
              )}
            </div>

            {saveMutation.isError && (
              <p role="alert" className="text-sm text-danger">
                Failed to save preset.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
