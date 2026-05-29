import { useState } from "react";
import type { AppConfig, ModelQuant } from "@voice-of-fish/shared";
import { DEFAULT_APP_CONFIG } from "@voice-of-fish/shared/constants";
import { t } from "@/lib/i18n";
import { OnboardingProgressRail } from "./OnboardingProgressRail";
import { OnboardingEngineStep } from "./OnboardingEngineStep";
import { OnboardingModelStep } from "./OnboardingModelStep";
import { OnboardingOutputStep } from "./OnboardingOutputStep";
import { modelIdFromQuant, STEP_ORDER } from "./onboarding-validation";
import type { OnboardingStep } from "./onboarding-validation";

interface SetupPanelProps {
  onSave: (config: AppConfig) => void;
}

export function SetupPanel({ onSave }: SetupPanelProps) {
  const [step, setStep] = useState<OnboardingStep>("engine");

  // Step 1 state
  const [binaryPath, setBinaryPath] = useState("");
  const [engineValid, setEngineValid] = useState(false);

  // Step 2 state
  const [modelsPath, setModelsPath] = useState("");
  const [selectedQuant, setSelectedQuant] = useState<ModelQuant | null>(null);
  const [selectedModelFile, setSelectedModelFile] = useState("");
  const [modelValid, setModelValid] = useState(false);

  // Step 3 state
  const [outputsPath, setOutputsPath] = useState("");
  const [outputValid, setOutputValid] = useState(false);

  const currentIndex = STEP_ORDER.indexOf(step);

  const modelReady = modelValid || selectedQuant !== null;

  const canContinue = () => {
    switch (step) {
      case "engine":
        return engineValid;
      case "model":
        return modelReady;
      case "output":
        return false; // Never continue from output; use finish
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const handleContinue = () => {
    if (currentIndex < STEP_ORDER.length - 1 && canContinue()) {
      setStep(STEP_ORDER[currentIndex + 1]);
    }
  };

  const handleFinish = () => {
    if (!engineValid || !modelReady || !outputValid) return;

    onSave({
      binaryPath,
      modelsPath,
      outputsPath,
      defaultModelId: selectedQuant ? modelIdFromQuant(selectedQuant) : DEFAULT_APP_CONFIG.defaultModelId,
      cpuThreads: DEFAULT_APP_CONFIG.cpuThreads,
      gpuEnabled: DEFAULT_APP_CONFIG.gpuEnabled,
    });
  };

  const finishEnabled = engineValid && modelReady && outputValid;

  return (
    <div className="flex min-h-screen">
      <OnboardingProgressRail currentStep={step} />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex-1 overflow-y-auto px-12 py-10">
          <div className="mx-auto max-w-lg">
            {step === "engine" && (
              <OnboardingEngineStep
                binaryPath={binaryPath}
                onBinaryPathChange={setBinaryPath}
                onValidationChange={setEngineValid}
              />
            )}
            {step === "model" && (
              <OnboardingModelStep
                modelsPath={modelsPath}
                onModelsPathChange={setModelsPath}
                selectedQuant={selectedQuant}
                onSelectedQuantChange={setSelectedQuant}
                selectedModelFile={selectedModelFile}
                onSelectedModelFileChange={setSelectedModelFile}
                onValidationChange={setModelValid}
              />
            )}
            {step === "output" && (
              <OnboardingOutputStep
                outputsPath={outputsPath}
                onOutputsPathChange={setOutputsPath}
                binaryPath={binaryPath}
                selectedQuant={selectedQuant}
                selectedModelFile={selectedModelFile}
                onValidationChange={setOutputValid}
              />
            )}
          </div>
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between border-t border-line px-12 py-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-studio-foreground disabled:opacity-30"
          >
            {t("onboardingBack")}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {t("onboardingStepCounter", { current: currentIndex + 1, total: STEP_ORDER.length })}
            </span>
          </div>

          {step === "output" ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!finishEnabled}
              title={finishEnabled ? undefined : t("onboardingFinishDisabled")}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-studio transition-colors hover:bg-accent/80 disabled:opacity-30"
            >
              {t("onboardingFinish")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue()}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-studio transition-colors hover:bg-accent/80 disabled:opacity-30"
            >
              {t("onboardingContinue")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}