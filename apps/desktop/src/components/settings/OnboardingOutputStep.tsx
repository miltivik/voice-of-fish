import { useState, useCallback } from "react";
import type { ModelQuant } from "@voice-of-fish/shared";
import { t } from "@/lib/i18n";
import { validateOutputPath } from "./onboarding-validation";
import { getPlatformDefaultPaths } from "@/lib/platform";
import { pickFolderPath } from "@/lib/tauri";

interface OnboardingOutputStepProps {
  outputsPath: string;
  onOutputsPathChange: (path: string) => void;
  binaryPath: string;
  selectedQuant: ModelQuant | null;
  selectedModelFile: string;
  onValidationChange: (valid: boolean) => void;
}

export function OnboardingOutputStep({
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
      const { valid, error: err } = validateOutputPath(path);
      setError(err);
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
    // Use the current DOM value, not the stale prop from closure.
    // The input ref approach isn't needed here since we only need
    // to validate whatever is currently in the parent state.
    // After onChange fires, the parent state is already updated,
    // and React will re-render with the new prop before the next
    // event. For blur specifically, we validate the prop directly.
    if (outputsPath.trim()) {
      runValidation(outputsPath);
    } else {
      const defaultPath = getPlatformDefaultPaths().outputsPath;
      onOutputsPathChange(defaultPath);
      runValidation(defaultPath);
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
