import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { VoicePreset } from "@voice-of-fish/shared";
import { LanguageSelect } from "@/components/ui/LanguageSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { studioClient, pickAudioPath } from "@/lib/tauri";
import { t } from "@/lib/i18n";

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

interface VoicePresetFormProps {
  initialData?: VoicePreset | null;
  onSave: (preset: VoicePreset) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function VoicePresetForm({
  initialData,
  onSave,
  onCancel,
  isSaving = false,
}: VoicePresetFormProps) {
  const isEditing = initialData != null;
  const [audioPath, setAudioPath] = useState(
    initialData?.referenceAudioPath ?? "",
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VoicePresetFormData>({
    resolver: zodResolver(voicePresetFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      language: initialData?.language ?? "en",
      referenceText: initialData?.referenceText ?? "",
      notes: initialData?.notes ?? "",
    },
    mode: "onChange",
  });

  const handlePickFile = async () => {
    const path = await pickAudioPath();
    if (path) setAudioPath(path);
  };

  const onSubmit = (data: VoicePresetFormData) => {
    const fileName = audioPath
      ? (audioPath.split(/[/\\]/).pop() ?? "")
      : (initialData?.referenceFileName ?? "");
    const preset: VoicePreset = {
      ...data,
      id: initialData?.id ?? `voice-${crypto.randomUUID()}`,
      durationSeconds: initialData?.durationSeconds,
      referenceFileName: fileName,
      referenceAudioPath: audioPath || initialData?.referenceAudioPath,
    };
    onSave(preset);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? `Edit: ${initialData!.name}` : "Add voice preset"}
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
                  {errors.name.message ?? t("voicePresetNameRequired")}
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
                  {errors.language.message ?? t("voicePresetLanguageRequired")}
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
                {errors.referenceText.message ??
                  t("voicePresetRefTextRequired")}
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
                {displayFileName(audioPath, initialData?.referenceFileName)}
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
            {!audioPath && !initialData?.referenceAudioPath && (
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
              <span className="font-normal text-concrete-300">(optional)</span>
            </label>
            <Input
              id="preset-notes"
              {...register("notes")}
              placeholder="Character, gender, accent, style…"
              maxLength={400}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Saving…"
                : isEditing
                  ? "Update preset"
                  : "Save preset"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
