import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { studioClient, pickAudioPath } from "@/lib/tauri";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import type { VoicePreset } from "@voice-of-fish/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const voicePresetFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  language: z.string().trim().min(1, "Language is required"),
  referenceText: z.string().trim().min(1, "Reference text is required"),
  notes: z.string().trim().max(400).optional(),
});

type VoicePresetFormData = z.infer<typeof voicePresetFormSchema>;

function displayFileName(path?: string, fallback?: string): string {
  if (path) return path.split(/[/\\]/).pop() ?? path;
  return fallback ?? "No file selected";
}

export function VoiceCloningPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<VoicePreset | null>(null);
  const [audioPath, setAudioPath] = useState("");
  const [search, setSearch] = useState("");
  const [formVisible, setFormVisible] = useState(false);

  const presets = useQuery({
    queryKey: ["voice-presets"],
    queryFn: studioClient.listVoicePresets,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<VoicePresetFormData>({
    resolver: zodResolver(voicePresetFormSchema),
    defaultValues: { name: "", language: "en", referenceText: "", notes: "" },
    mode: "onChange",
  });

  const saveMutation = useMutation({
    mutationFn: (preset: VoicePreset) => studioClient.saveVoicePreset(preset),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["voice-presets"] });
      toast.success(editing ? "Voice preset updated" : "Voice preset saved");
      setEditing(saved);
      setFormVisible(false);
    },
    onError: () => toast.error("Failed to save voice preset"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studioClient.deleteVoicePreset(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ["voice-presets"] });
      toast.success("Voice preset deleted");
      if (editing?.id === id) {
        setEditing(null);
        resetFormState();
      }
    },
    onError: () => toast.error("Failed to delete voice preset"),
  });

  const resetFormState = () => {
    setAudioPath("");
    reset({ name: "", language: "en", referenceText: "", notes: "" });
  };

  const startAdd = () => {
    setEditing(null);
    setFormVisible(true);
    resetFormState();
  };

  const startEdit = (preset: VoicePreset) => {
    setEditing(preset);
    setFormVisible(true);
    setAudioPath(preset.referenceAudioPath ?? "");
    setValue("name", preset.name);
    setValue("language", preset.language);
    setValue("referenceText", preset.referenceText);
    setValue("notes", preset.notes ?? "");
  };

  const cancelForm = () => {
    setFormVisible(false);
    setEditing(null);
    resetFormState();
  };

  const handleDelete = (preset: VoicePreset) => {
    if (window.confirm(`Delete voice preset "${preset.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(preset.id);
    }
  };

  const handlePickFile = async () => {
    const path = await pickAudioPath();
    if (path) setAudioPath(path);
  };

  const onSubmit = (data: VoicePresetFormData) => {
    const fileName = audioPath
      ? (audioPath.split(/[/\\]/).pop() ?? "")
      : (editing?.referenceFileName ?? "");
    const preset: VoicePreset = {
      ...data,
      id: editing?.id ?? `voice-${crypto.randomUUID()}`,
      durationSeconds: editing?.durationSeconds,
      referenceFileName: fileName,
      referenceAudioPath: audioPath || editing?.referenceAudioPath,
    };
    saveMutation.mutate(preset);
  };

  const filtered = (presets.data ?? []).filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.language.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Voices</h1>
        <p className="mt-1 text-sm text-concrete-300">
          Voice presets for cloning — save a reference audio and reuse it across
          generations.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search presets…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex-1" />
        <Button onClick={startAdd} disabled={formVisible}>
          Add voice
        </Button>
      </div>

      {/* Add / Edit Form — collapsible */}
      {formVisible && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editing ? `Edit: ${editing.name}` : "Add voice preset"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="preset-name"
                    className="text-sm font-medium text-concrete-50 block"
                  >
                    Name
                  </label>
                  <Input
                    id="preset-name"
                    {...register("name")}
                    placeholder="e.g. Nora interview"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p role="alert" className="mt-1 text-xs text-ember">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="preset-language"
                    className="text-sm font-medium text-concrete-50 block"
                  >
                    Language
                  </label>
                  <LanguageSelect
                    id="preset-language"
                    register={register("language")}
                    className="flex h-9 w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-1 text-sm text-concrete-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
                  />
                  {errors.language && (
                    <p role="alert" className="mt-1 text-xs text-ember">
                      {errors.language.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="preset-reference-text"
                  className="text-sm font-medium text-concrete-50 block"
                >
                  Reference text
                </label>
                <textarea
                  id="preset-reference-text"
                  {...register("referenceText")}
                  rows={2}
                  placeholder="Exact text spoken in the reference audio…"
                  className="flex min-h-[60px] w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-2 text-sm text-concrete-50 shadow-sm transition-colors placeholder:text-concrete-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
                  aria-invalid={!!errors.referenceText}
                />
                {errors.referenceText && (
                  <p role="alert" className="mt-1 text-xs text-ember">
                    {errors.referenceText.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-concrete-50 block">
                  Reference audio
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handlePickFile}
                  >
                    Browse…
                  </Button>
                  <span className="text-sm text-concrete-300 truncate">
                    {displayFileName(audioPath, editing?.referenceFileName)}
                  </span>
                  {audioPath && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => studioClient.openOutputFile(audioPath)}
                    >
                      Play
                    </Button>
                  )}
                </div>
                {!audioPath && !editing?.referenceAudioPath && (
                  <p className="mt-1 text-xs text-concrete-300">
                    Select a .wav, .mp3, or .flac file
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="preset-notes"
                  className="text-sm font-medium text-concrete-50 block"
                >
                  Notes{" "}
                  <span className="font-normal text-concrete-300">
                    (optional)
                  </span>
                </label>
                <Input
                  id="preset-notes"
                  {...register("notes")}
                  placeholder="Character, gender, accent, style…"
                  maxLength={400}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? "Saving…"
                    : editing
                      ? "Update preset"
                      : "Save preset"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Presets list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Your presets
            {(presets.data?.length ?? 0) > 0 && ` (${presets.data!.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {presets.isLoading ? (
            <p className="text-sm text-concrete-300">Loading presets…</p>
          ) : presets.isError ? (
            <p className="text-sm text-ember">Failed to load presets.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-concrete-300">
              {search
                ? "No presets match your search."
                : "No voice presets saved yet."}
            </p>
          ) : (
            filtered.map((preset) => (
              <article
                key={preset.id}
                className={`rounded-brutal border border-glass-border bg-concrete-800 p-3 ${
                  editing?.id === preset.id ? "border-electric" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-concrete-50 truncate">
                      {preset.name}
                    </p>
                    <p className="mt-1 text-xs text-concrete-300 truncate">
                      {preset.referenceFileName}
                      {" · "}
                      {preset.language.toUpperCase()}
                      {preset.durationSeconds != null &&
                        ` · ${preset.durationSeconds}s`}
                    </p>
                    {preset.referenceText && (
                      <p className="mt-1 text-xs text-concrete-300 line-clamp-2">
                        {preset.referenceText}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {preset.referenceAudioPath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          studioClient.openOutputFile(
                            preset.referenceAudioPath!,
                          )
                        }
                      >
                        Play
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(preset)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(preset)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
