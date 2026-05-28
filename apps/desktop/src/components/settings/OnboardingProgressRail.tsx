import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "./onboarding-validation";
import { STEP_ORDER } from "./onboarding-validation";

interface OnboardingProgressRailProps {
  currentStep: OnboardingStep;
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  engine: t("onboardingStepEngine"),
  model: t("onboardingStepModel"),
  output: t("onboardingStepOutput"),
};

export function OnboardingProgressRail({
  currentStep,
}: OnboardingProgressRailProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-panel px-5 py-6">
      {/* Brand */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("appName")}
        </h2>
        <p className="mt-0.5 text-xs text-muted">{t("appTagline")}</p>
      </div>

      {/* LOCAL ONLY badge */}
      <span className="mb-6 inline-flex w-fit items-center gap-1 rounded-full border border-accent/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
        {t("localOnlyBadge")}
      </span>

      {/* Steps */}
      <nav aria-label={t("onboardingStepsNavLabel")} className="flex-1 space-y-0.5">
        {STEP_ORDER.map((step, idx) => {
          const isActive = step === currentStep;
          const isCompleted = idx < currentIndex;
          const stepNum = idx + 1;

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive && "bg-line/40 font-medium text-studio-foreground",
                isCompleted && "text-muted",
                !isActive && !isCompleted && "text-muted",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isActive && "bg-accent text-studio",
                  isCompleted && "bg-line text-muted",
                  !isActive && !isCompleted && "bg-line/50 text-muted",
                )}
              >
                {isCompleted ? "✓" : stepNum}
              </span>
              <span>{STEP_LABELS[step]}</span>
            </div>
          );
        })}
      </nav>

      {/* Privacy note */}
      <p className="mt-auto pt-4 text-[11px] leading-relaxed text-muted/60">
        {t("onboardingPrivacyNote")}
      </p>
    </aside>
  );
}
