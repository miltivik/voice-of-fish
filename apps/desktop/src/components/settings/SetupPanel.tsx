import { getPlatformDefaultPaths } from "@/lib/platform";
import { useState } from "react";
import type { AppConfig, AppMode, ModelQuant } from "@voice-of-fish/shared";
import { DEFAULT_APP_CONFIG } from "@voice-of-fish/shared/constants";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import { OnboardingProgressRail } from "./OnboardingProgressRail";
import { OnboardingEngineStep } from "./OnboardingEngineStep";
import { OnboardingModelStep } from "./OnboardingModelStep";
import { OnboardingOutputStep } from "./OnboardingOutputStep";
import { modelIdFromQuant, STEP_ORDER } from "./onboarding-validation";
import type { OnboardingStep } from "./onboarding-validation";

interface SetupPanelProps {
  onSave: (config: AppConfig) => Promise<void>;
}

const WIZARD_KEY = "vof-wizard";

interface PersistedWizard {
  step: OnboardingStep;
  binaryPath: string;
  modelsPath: string;
  selectedQuant: ModelQuant | null;
  selectedModelFile: string;
  mode: AppMode;
  outputsPath: string;
}

function loadWizard(): PersistedWizard | null {
  try {
    const raw = localStorage.getItem(WIZARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.step !== "string") return null;
    return parsed as PersistedWizard;
  } catch {
    return null;
  }
}

function saveWizard(state: PersistedWizard) {
  try {
    localStorage.setItem(WIZARD_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

function clearWizard() {
  try {
    localStorage.removeItem(WIZARD_KEY);
  } catch {
    // Silently skip
  }
}

export function SetupPanel({ onSave }: SetupPanelProps) {
  const defaults = getPlatformDefaultPaths();
  const persisted = loadWizard();

  // Step 1 state
  const [step, setStep] = useState<OnboardingStep>(
    persisted?.step ?? "engine",
  );
  const [binaryPath, setBinaryPath] = useState(
    persisted?.binaryPath ?? "",
  );
  const [engineValid, setEngineValid] = useState(false);

  // Step 2 state
  const [modelsPath, setModelsPath] = useState(
    persisted?.modelsPath ?? defaults.modelsPath,
  );
  const [selectedQuant, setSelectedQuant] = useState<ModelQuant | null>(
    persisted?.selectedQuant ?? null,
  );
  const [selectedModelFile, setSelectedModelFile] = useState(
    persisted?.selectedModelFile ?? "",
  );
  const [modelValid, setModelValid] = useState(false);

  // Step 3 state
  const [mode, setMode] = useState<AppMode>(
    persisted?.mode ?? DEFAULT_APP_CONFIG.mode,
  );
  const [outputsPath, setOutputsPath] = useState(
    persisted?.outputsPath ?? defaults.outputsPath,
  );
  const [outputValid, setOutputValid] = useState(
    !!((persisted?.outputsPath ?? defaults.outputsPath).trim()),
  );

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

  const persistCurrentState = (nextStep: OnboardingStep) => {
    saveWizard({
      step: nextStep,
      binaryPath,
      modelsPath,
      selectedQuant,
      selectedModelFile,
      mode,
      outputsPath,
    });
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prev = STEP_ORDER[currentIndex - 1];
      setStep(prev);
      persistCurrentState(prev);
    }
  };

  const handleContinue = () => {
    if (currentIndex < STEP_ORDER.length - 1 && canContinue()) {
      const next = STEP_ORDER[currentIndex + 1];
      setStep(next);
      persistCurrentState(next);
    }
  };

  const handleFinish = async () => {
    if (!engineValid || !modelReady || !outputValid) return;

    try {
      await onSave({
        mode,
        binaryPath,
        modelsPath,
        outputsPath,
        defaultModelId: selectedQuant
          ? modelIdFromQuant(selectedQuant)
          : DEFAULT_APP_CONFIG.defaultModelId,
        defaultAudioFormat: DEFAULT_APP_CONFIG.defaultAudioFormat,
        cpuThreads: DEFAULT_APP_CONFIG.cpuThreads,
        gpuEnabled: DEFAULT_APP_CONFIG.gpuEnabled,
        advancedArgs: DEFAULT_APP_CONFIG.advancedArgs,
      });
      clearWizard();
    } catch (e) {
      toast.error(`Failed to save configuration: ${e}`);
    }
  };

  const finishEnabled = engineValid && modelReady && outputValid;

  return (
    <div className="flex min-h-screen">
      <OnboardingProgressRail
        currentStep={step}
        onStepClick={(clickedStep) => {
          setStep(clickedStep);
          persistCurrentState(clickedStep);
        }}
      />

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
                mode={mode}
                onModeChange={setMode}
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
              {t("onboardingStepCounter", {
                current: currentIndex + 1,
                total: STEP_ORDER.length,
              })}
            </span>
          </div>

          {step === "output" ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={!finishEnabled}
              title={
                finishEnabled ? undefined : t("onboardingFinishDisabled")
              }
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
