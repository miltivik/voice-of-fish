import { useState, useCallback, useRef } from "react";
import { t } from "@/lib/i18n";
import { pickBinaryPath, checkBinaryExists, openExternalLink } from "@/lib/tauri";
import { validateEnginePath } from "./onboarding-validation";
import { getPlatformDefaultPaths } from "@/lib/platform";
interface OnboardingEngineStepProps {
  binaryPath: string;
  onBinaryPathChange: (path: string) => void;
  onValidationChange: (valid: boolean) => void;
}

export function OnboardingEngineStep({
  binaryPath,
  onBinaryPathChange,
  onValidationChange,
}: OnboardingEngineStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "checking" | "found" | "missing" | "invalid"
  >("idle");
  const checkRequestRef = useRef(0);

  const runCheck = useCallback(
    async (path: string) => {
      const requestId = ++checkRequestRef.current;
      const previousStatus = status;
      const { valid, error } = validateEnginePath(path);
      setError(error);
      onValidationChange(valid);

      if (!valid) {
        setStatus("invalid");
        return;
      }

      setStatus("checking");
      try {
        const found = await checkBinaryExists(path);
        if (checkRequestRef.current !== requestId) {
          return;
        }
        setStatus(found ? "found" : "missing");
        onValidationChange(found);
      } catch (checkError) {
        if (checkRequestRef.current === requestId) {
          setStatus(previousStatus === "checking" ? "idle" : previousStatus);
        }
        throw checkError;
      }
    },
    [onValidationChange, status],
  );

  const handleChooseBinary = async () => {
    const path = await pickBinaryPath();
    if (path) {
      onBinaryPathChange(path);
      await runCheck(path);
    }
  };

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const path = e.target.value;
    onBinaryPathChange(path);
    // Debounce implicit — user must blur or click continue for final check
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const path = e.currentTarget.value;
    if (path.trim()) {
      void runCheck(path);
    }
  };

  const statusText =
    status === "checking"
      ? "…"
      : status === "found"
        ? t("engineStatusFound")
        : status === "missing"
          ? t("engineStatusMissing")
          : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{t("engineHeading")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("engineBody")}
        </p>
      </div>

      {/* Community badge */}
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
        {t("engineBadgeCommunity")}
      </span>

      {/* Binary path */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={binaryPath}
            onChange={handlePathChange}
            onBlur={handleBlur}
            placeholder={t("engineBinaryPlaceholder", { path: getPlatformDefaultPaths().binaryPath })}
            aria-label={t("engineHeading")}
            className="flex-1 rounded-lg border border-line bg-studio px-3 py-2 text-sm text-studio-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleChooseBinary}
            className="shrink-0 rounded-lg bg-line/50 px-4 py-2 text-sm font-medium text-studio-foreground transition-colors hover:bg-line"
          >
            {t("engineButtonChoose")}
          </button>
        </div>

        {/* Status line */}
        {statusText && (
          <p
            className={`text-xs ${status === "found" ? "text-accent" : "text-danger"}`}
            role="status"
            aria-live="polite"
          >
            {statusText}
          </p>
        )}

        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* External link */}
      <button
        type="button"
        onClick={() => openExternalLink("engineSource")}
        className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-studio-foreground"
      >
        {t("engineButtonSource")}
      </button>
    </div>
  );
}
