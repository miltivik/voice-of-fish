import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "./onboarding-validation";
import { STEP_ORDER } from "./onboarding-validation";

interface OnboardingProgressRailProps {
  currentStep: OnboardingStep;
  onStepClick?: (step: OnboardingStep) => void;
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  engine: t("onboardingStepEngine"),
  model: t("onboardingStepModel"),
  output: t("onboardingStepOutput"),
};

export function OnboardingProgressRail({
  currentStep,
  onStepClick,
}: OnboardingProgressRailProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-glass-border bg-glass px-5 py-6">
      {/* Brand */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("appName")}
        </h2>
        <p className="mt-0.5 text-xs text-concrete-300">{t("appTagline")}</p>
      </div>

      {/* LOCAL ONLY badge */}
      <span className="mb-6 inline-flex w-fit items-center gap-1 rounded-full border border-electric/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-electric">
        {t("localOnlyBadge")}
      </span>

      {/* Steps */}
      <nav
        aria-label={t("onboardingStepsNavLabel")}
        className="flex-1 space-y-0.5"
      >
        {STEP_ORDER.map((step, idx) => {
          const isActive = step === currentStep;
          const isCompleted = idx < currentIndex;
          const stepNum = idx + 1;

          const content = (
            <>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isActive && "bg-electric text-concrete",
                  isCompleted && "bg-concrete-600 text-concrete-300",
                  !isActive && !isCompleted && "bg-concrete-600 text-concrete-300",
                )}
              >
                {isCompleted ? "\u2713" : stepNum}
              </span>
              <span>{STEP_LABELS[step]}</span>
            </>
          );

          if (isCompleted && onStepClick) {
            return (
              <button
                key={step}
                type="button"
                onClick={() => onStepClick(step)}
                className="flex w-full items-center gap-3 rounded-brutal px-3 py-2.5 text-sm text-concrete-300 transition-colors hover:bg-glass-heavy hover:text-concrete-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-3 rounded-brutal px-3 py-2.5 text-sm transition-colors",
                isActive && "bg-concrete-600/40 font-medium text-concrete-50",
                isCompleted && "text-concrete-300",
                !isActive && !isCompleted && "text-concrete-300",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {content}
            </div>
          );
        })}
      </nav>

      {/* Privacy note */}
      <p className="mt-auto pt-4 text-[11px] leading-relaxed text-concrete-300/60">
        {t("onboardingPrivacyNote")}
      </p>
    </aside>
  );
}
