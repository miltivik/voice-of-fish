const messages = {
  en: {
    /* --- App identity --- */
    appName: "Voice of Fish",
    appTagline: "S2 Pro GGUF Studio",
    localOnlyBadge: "LOCAL ONLY",

    /* --- Navigation --- */
    generate: "Generate",
    diagnostics: "Diagnostics",
    setup: "Voice of Fish Setup",

    /* --- Onboarding: Progress rail --- */
    onboardingStepEngine: "Engine",
    onboardingStepModel: "Model file",
    onboardingStepOutput: "Output",
    onboardingPrivacyNote: "No telemetry. All generation stays on this workstation.",
    onboardingStepCounter: "Step {current} of {total}",

    onboardingStepsNavLabel: "Onboarding steps",
    /* --- Onboarding: Step 1 — Engine --- */
    engineHeading: "Connect s2.cpp",
    engineBody:
      "Voice of Fish does not install the engine. Point it to your existing s2.cpp binary — generation remains entirely local after you provide both the engine and a compatible model file.",
    engineBadgeCommunity: "COMMUNITY / EXPERIMENTAL",
    engineButtonChoose: "Choose binary",
    engineButtonSource: "View s2.cpp source",
    engineStatusFound: "Binary found",
    engineStatusMissing: "Binary missing",
    engineBinaryPlaceholder: "e.g. {path}",

    /* --- Onboarding: Step 2 — Model file --- */
    modelHeading: "Add an S2 Pro GGUF model",
    modelBody:
      "Choose a compatible GGUF conversion for local inference. The official Fish Audio model is provided for source and license reference only.",
    modelBadgeRecommended: "RECOMMENDED",
    modelButtonOpenFolder: "Open models folder",
    modelButtonChooseFile: "Choose GGUF file",
    modelButtonGgufSource: "View GGUF source",
    modelButtonOfficialSource: "View source + license",
    modelFolderPlaceholder: "e.g. {path}",
    modelFilePlaceholder: "Select a .gguf model file",
    modelQuantQ8: "Higher quality, higher memory use",
    modelQuantQ6: "Recommended balance",
    modelQuantQ5: "Better fit for limited GPU memory",
    modelQuantQ4: "Lowest consumption, lower quality",
    modelQuantLegend: "Choose model quantization variant",
    modelNoteOfficialLabel: "OFFICIAL FORMAT NOTE",
    modelNoteOfficialBody: "BF16 Safetensors files are not supported by s2.cpp.",
    modelErrorSafetensors:
      "Official BF16 Safetensors files cannot be used by s2.cpp. Choose a compatible GGUF model.",
    modelErrorF16:
      "F16 GGUF is not enabled in this version. Choose Q8, Q6, Q5, or Q4.",
    modelErrorNoCompatible:
      "No compatible GGUF model detected in this folder.",
    modelStatusFound: "Compatible GGUF detected",
    modelStatusNotFound: "No compatible GGUF in folder",

    /* --- Onboarding: Step 3 — Output --- */
    outputHeading: "Choose your output folder",
    outputBody: "Generated WAV files will be written here.",
    outputModeSimple: "Simple",
    outputModeAdvanced: "Advanced",
    outputModeSimpleDesc: "Recommended for initial use. One generation at a time.",
    outputModeAdvancedDesc:
      "Advanced settings available after onboarding.",
    outputButtonChoose: "Open output folder",
    outputFolderPlaceholder: "e.g. {path}",
    outputSummaryLabel: "Setup summary",
    outputSummaryEngine: "Engine",
    outputSummaryModel: "Model",
    outputSummaryOutput: "Output",
    outputFormatNote: "Default format: WAV",

    /* --- Onboarding: Navigation --- */
    onboardingBack: "Back",
    onboardingContinue: "Continue",
    onboardingFinish: "Finish setup",
    onboardingFinishDisabled: "Complete all three steps before finishing.",

    /* --- Generic --- */
    genericStatusOk: "OK",
    genericStatusError: "Error",
    genericRequired: "This field is required.",
  },
} as const;

type MessageKey = keyof typeof messages.en;

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let message: string = messages.en[key];

  if (!params) {
    return message;
  }

  for (const [name, value] of Object.entries(params)) {
    message = message.replaceAll(`{${name}}`, String(value));
  }

  return message;
}
