import { useState, useCallback, useEffect } from "react";
import type { ModelQuant } from "@voice-of-fish/shared";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  pickFolderPath,
  pickGgufPath,
  openExternalLink,
} from "@/lib/tauri";
import { getPlatformDefaultPaths } from "@/lib/platform";
import type { ModelValidation } from "./onboarding-validation";
import { validateModelFile } from "./onboarding-validation";

interface OnboardingModelStepProps {
  modelsPath: string;
  onModelsPathChange: (path: string) => void;
  selectedQuant: ModelQuant | null;
  onSelectedQuantChange: (quant: ModelQuant) => void;
  selectedModelFile: string;
  onSelectedModelFileChange: (file: string) => void;
  onValidationChange: (valid: boolean) => void;
}

const QUANT_LABELS: Record<ModelQuant, string> = {
  Q8: t("modelQuantQ8"),
  Q6: t("modelQuantQ6"),
  Q5: t("modelQuantQ5"),
  Q4: t("modelQuantQ4"),
};


function getParentDirectory(filePath: string): string {
  const separatorIndex = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));

  if (separatorIndex < 0) {
    return "";
  }

  if (separatorIndex === 0) {
    return filePath[0];
  }

  const directory = filePath.slice(0, separatorIndex);

  if (/^[A-Za-z]:$/.test(directory)) {
    return `${directory}${filePath[separatorIndex]}`;
  }

  return directory;
}
export function OnboardingModelStep({
  modelsPath,
  onModelsPathChange,
  selectedQuant,
  onSelectedQuantChange,
  selectedModelFile,
  onSelectedModelFileChange,
  onValidationChange,
}: OnboardingModelStepProps) {
  const [validation, setValidation] = useState<ModelValidation>({
    valid: false,
    quant: null,
    error: null,
  });

  // Pre-fill modelsPath from platform defaults if empty
  useEffect(() => {
    if (!modelsPath) {
      onModelsPathChange(getPlatformDefaultPaths().modelsPath);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runValidation = useCallback(
    (file: string) => {
      const v = validateModelFile(file);
      setValidation(v);
      if (v.valid && v.quant) {
        onSelectedQuantChange(v.quant);
      }
      onValidationChange(v.valid);
    },
    [onSelectedQuantChange, onValidationChange],
  );

  const handleChooseGguf = async () => {
    const file = await pickGgufPath();
    if (file) {
      const filename = file.split(/[/\\]/).pop() ?? file;
      const modelsDirectory = getParentDirectory(file);

      onSelectedModelFileChange(file);
      if (modelsDirectory) {
        onModelsPathChange(modelsDirectory);
      }
      runValidation(filename);
    }
  };

  const handleChooseFolder = async () => {
    const folder = await pickFolderPath("Select models folder");
    if (folder) {
      onModelsPathChange(folder);
    }
  };

  const handleQuantClick = (quant: ModelQuant) => {
    onSelectedQuantChange(quant);
    // If user clicks a quant directly, clear file selection — they're choosing by quant
    if (selectedModelFile) {
      onSelectedModelFileChange("");
      setValidation({ valid: true, quant, error: null });
      onValidationChange(true);
    }
  };

  const errorMessage =
    validation.error === "safetensors"
      ? t("modelErrorSafetensors")
      : validation.error === "f16"
        ? t("modelErrorF16")
        : validation.error === "no_compatible" || validation.error === "no_gguf"
          ? t("modelErrorNoCompatible")
          : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{t("modelHeading")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("modelBody")}
        </p>
      </div>

      {/* Quant choice grid */}
      <fieldset>
        <legend className="sr-only">{t("modelQuantLegend")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {S2_MODEL_MANIFEST.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleQuantClick(entry.quant)}
              className={cn(
                "relative rounded-lg border px-4 py-3 text-left transition-colors",
                selectedQuant === entry.quant
                  ? "border-accent bg-accent/10"
                  : "border-line bg-studio hover:border-line/80",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{entry.quant}</span>
                {entry.quant === "Q6" && (
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    {t("modelBadgeRecommended")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                {entry.displaySize} — {QUANT_LABELS[entry.quant]}
              </p>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Models folder */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={modelsPath}
            onChange={(e) => onModelsPathChange(e.target.value)}
            placeholder={t("modelFolderPlaceholder", { path: getPlatformDefaultPaths().modelsPath })}
            aria-label="Models folder path"
            className="flex-1 rounded-lg border border-line bg-studio px-3 py-2 text-sm text-studio-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleChooseFolder}
            className="shrink-0 rounded-lg bg-line/50 px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line"
          >
            {t("modelButtonOpenFolder")}
          </button>
        </div>
      </div>

      {/* Model file selection */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedModelFile}
            readOnly
            placeholder={t("modelFilePlaceholder")}
            aria-label="Selected GGUF model file"
            className="flex-1 rounded-lg border border-line bg-studio px-3 py-2 text-sm text-studio-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleChooseGguf}
            className="shrink-0 rounded-lg bg-line/50 px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line"
          >
            {t("modelButtonChooseFile")}
          </button>
        </div>

        {/* Validation status */}
        {errorMessage && (
          <p className="text-xs text-danger" role="alert">
            {errorMessage}
          </p>
        )}
        {validation.valid && (
          <p className="text-xs text-accent" role="status">
            {t("modelStatusFound")}
          </p>
        )}
      </div>

      {/* Official format note */}
      <div className="rounded-lg border border-amber-600/20 bg-amber-600/5 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
          {t("modelNoteOfficialLabel")}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {t("modelNoteOfficialBody")}
        </p>
      </div>

      {/* External links */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => openExternalLink("ggufSource")}
          className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-studio-foreground"
        >
          {t("modelButtonGgufSource")}
        </button>
        <button
          type="button"
          onClick={() => openExternalLink("officialSourceLicense")}
          className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-studio-foreground"
        >
          {t("modelButtonOfficialSource")}
        </button>
      </div>
    </div>
  );
}