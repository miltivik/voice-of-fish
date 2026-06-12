import type { VoicePreset } from "@voice-of-fish/shared";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { studioClient } from "@/lib/tauri";

interface VoicePresetListProps {
  presets: VoicePreset[];
  onEdit: (preset: VoicePreset) => void;
  onDelete: (preset: VoicePreset) => void;
  onDuplicate?: (preset: VoicePreset) => void;
  isDeleting?: boolean;
  editingId?: string | null;
  isLoading?: boolean;
  isError?: boolean;
}

export function VoicePresetList({
  presets,
  onEdit,
  onDelete,
  onDuplicate,
  isDeleting = false,
  editingId,
  isLoading,
  isError,
}: VoicePresetListProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-concrete-300">{t("voicePresetLoading")}</p>
    );
  }

  if (isError) {
    return <p className="text-sm text-ember">{t("voicePresetLoadError")}</p>;
  }

  if (presets.length === 0) {
    return <p className="text-sm text-concrete-300">{t("voicePresetEmpty")}</p>;
  }

  return (
    <>
      {presets.map((preset) => (
        <article
          key={preset.id}
          className={`rounded-brutal border border-glass-border bg-concrete-800 p-3 ${
            editingId === preset.id ? "border-electric" : ""
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
                    studioClient.openOutputFile(preset.referenceAudioPath!)
                  }
                >
                  Play
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onEdit(preset)}>
                Edit
              </Button>
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(preset)}
                >
                  Dup
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(preset)}
                disabled={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
