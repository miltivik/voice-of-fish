import { useState, useCallback } from "react";
import type { AppMode, ModelQuant } from "@voice-of-fish/shared";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { validateOutputPath } from "./onboarding-validation";
import { getPlatformDefaultPaths } from "@/lib/platform";
import { pickFolderPath } from "@/lib/tauri";
interface OnboardingOutputStepProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  outputsPath: string;
  onOutputsPathChange: (path: string) => void;
  binaryPath: string;
  selectedQuant: ModelQuant | null;
  selectedModelFile: string;
  onValidationChange: (valid: boolean) => void;
}

export function OnboardingOutputStep({
  mode,
  onModeChange,
  outputsPath,
  onOutputsPathChange,
  binaryPath,
  selectedQuant,
  selectedModelFile,
  onValidationChange,
}: OnboardingOutputStepProps) {
  const [error, setError] = useState<string | null>(null);

  const runValidation = useCallback(
    (path: string) => {
      const { valid, error } = validateOutputPath(path);
      setError(error);
      onValidationChange(valid);
    },
    [onValidationChange],
  );

  const handleChooseFolder = async () => {
    const folder = await pickFolderPath("Select outputs folder");
    if (folder) {
      onOutputsPathChange(folder);
      runValidation(folder);
    }
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const path = e.target.value;
    onOutputsPathChange(path);
    setError(null);
    onValidationChange(false);
  };

  const handlePathBlur = () => {
    if (outputsPath.trim()) {
      runValidation(outputsPath);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{t("outputHeading")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("outputBody")}
        </p>
      </div>

      {/* Mode selector */}
      <fieldset>
        <legend className="sr-only">Generation mode</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["simple", "advanced"] as AppMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-colors",
                mode === m
                  ? "border-accent bg-accent/10"
                  : "border-line bg-studio hover:border-line/80",
              )}
            >
              <span className="text-sm font-semibold">
                {m === "simple" ? t("outputModeSimple") : t("outputModeAdvanced")}
              </span>
              <p className="mt-1 text-xs text-muted">
                {m === "simple"
                  ? t("outputModeSimpleDesc")
                  : t("outputModeAdvancedDesc")}
              </p>
            </button>
          ))}
        </div>
      </fieldset>

      {/* Output folder */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={outputsPath}
            onChange={handlePathChange}
            onBlur={handlePathBlur}
            placeholder={t("outputFolderPlaceholder", { path: getPlatformDefaultPaths().outputsPath })}
            aria-label="Output folder path"
            className="flex-1 rounded-lg border border-line bg-studio px-3 py-2 text-sm text-studio-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleChooseFolder}
            className="shrink-0 rounded-lg bg-line/50 px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line"
          >
            {t("outputButtonChoose")}
          </button>
        </div>
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Format note */}
      <p className="text-xs text-muted">{t("outputFormatNote")}</p>

      {/* Summary */}
      <div className="rounded-lg border border-line bg-panel px-4 py-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("outputSummaryLabel")}
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t("outputSummaryEngine")}</dt>
            <dd className="max-w-[60%] truncate text-studio-foreground">
              {binaryPath || "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("outputSummaryModel")}</dt>
            <dd className="max-w-[60%] truncate text-studio-foreground">
              {selectedQuant ?? "—"}
              {selectedModelFile ? ` (${selectedModelFile.split(/[/\\]/).pop()})` : ""}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("outputSummaryOutput")}</dt>
            <dd className="max-w-[60%] truncate text-studio-foreground">
              {outputsPath || "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
