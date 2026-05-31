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
    onboardingPrivacyNote:
      "No telemetry. All generation stays on this workstation.",
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
    modelNoteOfficialBody:
      "BF16 Safetensors files are not supported by s2.cpp.",
    modelErrorSafetensors:
      "Official BF16 Safetensors files cannot be used by s2.cpp. Choose a compatible GGUF model.",
    modelErrorF16:
      "F16 GGUF is not enabled in this version. Choose Q8, Q6, Q5, or Q4.",
    modelErrorNoCompatible: "No compatible GGUF model detected in this folder.",
    modelStatusFound: "Compatible GGUF detected",
    modelStatusNotFound: "No compatible GGUF in folder",

    /* --- Onboarding: Step 3 — Output --- */
    outputHeading: "Choose your output folder",
    outputBody: "Generated WAV files will be written here.",
    outputModeSimple: "Simple",
    outputModeAdvanced: "Advanced",
    outputModeSimpleDesc:
      "Recommended for initial use. One generation at a time.",
    outputModeAdvancedDesc: "Advanced settings available after onboarding.",
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
    genericLanguage: "Language",
    genericNone: "None",

    /* --- Editor --- */
    editorHeading: "Editor",
    editorSubheading:
      "Paste a script, generate each sentence as a clip, and export for DaVinci Resolve.",
    editorScriptLabel: "Script",
    editorScriptPlaceholder:
      "Welcome to the show. Today we explore artificial intelligence. But first, a word from our sponsor.",
    editorModelLabel: "Model",
    editorVoiceLabel: "Voice",
    editorGenerating: "Generating {n} sentence…",
    editorGenerating_plural: "Generating {n} sentences…",
    editorGenerateButton: "Generate {n} sentence",
    editorGenerateButton_plural: "Generate {n} sentences",
    editorTimelineHeading: "Timeline · {n} clip(s) · Total {time}",
    editorCopySrt: "Copy SRT",
    editorSrtCopied: "SRT copied to clipboard",
    editorExportResolve: "Export for Resolve",
    editorSelectExportFolder: "Select export folder",
    editorExportFailed: "Export failed: {error}",

    /* --- Error boundary --- */
    errorBoundaryTitle: "Something went wrong",
    errorBoundaryBody:
      "An unexpected error occurred on this page. Go back to the dashboard and try again.",
    errorBoundaryAction: "Go to dashboard",
   },
 } as const;

type MessageKey = keyof typeof messages.en;

export type GuideLanguage = "es" | "en";

const guideMessages = {
  es: {
    languageLabel: "Idioma de la guía",
    spanish: "Español",
    english: "English",
    quickSummary: "¿Necesitas instalar s2.cpp? Ver guía rápida",
    quickIntro:
      "Voice of Fish no instala s2.cpp. Usa estos pasos para preparar el motor y los archivos del modelo localmente.",
    quickSteps: [
      "Instala Git, CMake y un compilador compatible con C++17. Vulkan es opcional, pero recomendado para usar GPU.",
      "Clona s2.cpp con sus submódulos.",
      "Compila el binario Release para tu sistema.",
      "Instala la CLI hf y descarga un modelo GGUF compatible junto con tokenizer.json.",
      "Vuelve a Voice of Fish: elige el binario, el archivo GGUF y la carpeta de salida.",
    ],
    windowsPowerShell: "Windows PowerShell",
    linuxShell: "Linux shell",
    macosTerminal: "Terminal macOS",
    copyButton: "Copiar",
    copiedLabel: "¡Copiado!",
    fullGuideButton: "Abrir guía completa",
    sourceButton: "Abrir repositorio s2.cpp",
    modelsButton: "Abrir modelos GGUF",
    backButton: "Volver a configuración",
    fullGuideHeading: "Guía completa de instalación",
    communityHeading: "Motor comunitario y experimental",
    communityBody:
      "s2.cpp es un proyecto comunitario experimental. Voice of Fish solo lo controla localmente: no instala dependencias ni ejecuta comandos de instalación.",
    windowsHeading: "Windows",
    windowsBody:
      "Instala Git, CMake y Visual Studio Build Tools con soporte para C++. Abre PowerShell y ejecuta:",
    linuxHeading: "Linux",
    linuxBody:
      "Instala Git, CMake y tu toolchain C++17 desde el gestor de paquetes de tu distribución. Abre una terminal y ejecuta:",
    macosHeading: "macOS",
    macosBody:
      "Instala CMake y Git con Homebrew. Abre una terminal y ejecuta:",
    modelHeading: "Descargar modelo GGUF y tokenizer",
    modelBody:
      "Instala la CLI actual de Hugging Face y descarga Q6 junto con tokenizer.json. Puedes elegir Q8, Q5 o Q4 según memoria disponible.",
    binaryLocationsHeading: "Ubicaciones típicas del binario",
    binaryLocations: [
      "Windows: build\\Release\\s2.exe o build\\s2.exe",
      "Linux: build/s2",
    ],
    requiredFilesHeading: "Archivos requeridos",
    requiredFiles: [
      "Un GGUF compatible: Q8, Q6, Q5 o Q4.",
      "tokenizer.json en la carpeta de modelos elegida.",
    ],
    returnHeading: "Volver a Voice of Fish",
    returnSteps: [
      "Elige el binario compilado.",
      "Elige el archivo GGUF compatible.",
      "Elige una carpeta de salida.",
      "Finaliza la configuración.",
    ],
    troubleshootingHeading: "Solución de problemas",
    troubleshootingSteps: [
      "Binary missing: verifica que la ruta elegida apunte al archivo compilado.",
      "Linux rechaza el ejecutable: ejecuta chmod +x build/s2.",
      "Vulkan no está disponible: recompila sin -DS2_VULKAN=ON.",
      "Modelo rechazado: elige GGUF Q8, Q6, Q5 o Q4; no uses Safetensors ni F16.",
    ],
  },
  en: {
    languageLabel: "Guide language",
    spanish: "Español",
    english: "English",
    quickSummary: "Need to install s2.cpp? View quick guide",
    quickIntro:
      "Voice of Fish does not install s2.cpp. Use these steps to prepare the engine and local model files.",
    quickSteps: [
      "Install Git, CMake, and a C++17-compatible compiler. Vulkan is optional but recommended for GPU execution.",
      "Clone s2.cpp with its submodules.",
      "Build the Release binary for your system.",
      "Install the hf CLI and download a compatible GGUF model together with tokenizer.json.",
      "Return to Voice of Fish: choose the binary, GGUF file, and output folder.",
    ],
    windowsPowerShell: "Windows PowerShell",
    linuxShell: "Linux shell",
    macosTerminal: "macOS Terminal",
    copyButton: "Copy",
    copiedLabel: "Copied!",
    fullGuideButton: "Open full guide",
    sourceButton: "Open s2.cpp repository",
    modelsButton: "Open GGUF models",
    backButton: "Back to setup",
    fullGuideHeading: "Complete installation guide",
    communityHeading: "Community and experimental engine",
    communityBody:
      "s2.cpp is an experimental community project. Voice of Fish only controls it locally: it does not install dependencies or execute installation commands.",
    windowsHeading: "Windows",
    windowsBody:
      "Install Git, CMake, and Visual Studio Build Tools with C++ support. Open PowerShell and run:",
    linuxHeading: "Linux",
    linuxBody:
      "Install Git, CMake, and your C++17 toolchain from your distribution package manager. Open a terminal and run:",
    macosHeading: "macOS",
    macosBody:
      "Install CMake and Git via Homebrew. Open a terminal and run:",
    modelHeading: "Download GGUF model and tokenizer",
    modelBody:
      "Install the current Hugging Face CLI and download Q6 together with tokenizer.json. You can choose Q8, Q5, or Q4 based on available memory.",
    binaryLocationsHeading: "Typical binary locations",
    binaryLocations: [
      "Windows: build\\Release\\s2.exe or build\\s2.exe",
      "Linux: build/s2",
    ],
    requiredFilesHeading: "Required files",
    requiredFiles: [
      "One compatible GGUF file: Q8, Q6, Q5, or Q4.",
      "tokenizer.json in the selected models folder.",
    ],
    returnHeading: "Return to Voice of Fish",
    returnSteps: [
      "Choose the built binary.",
      "Choose the compatible GGUF file.",
      "Choose an output folder.",
      "Finish setup.",
    ],
    troubleshootingHeading: "Troubleshooting",
    troubleshootingSteps: [
      "Binary missing: verify that the selected path points to the built file.",
      "Linux rejects the executable: run chmod +x build/s2.",
      "Vulkan is unavailable: rebuild without -DS2_VULKAN=ON.",
      "Model rejected: choose GGUF Q8, Q6, Q5, or Q4; do not use Safetensors or F16.",
    ],
  },
} as const;

export function getGuideMessages(language: GuideLanguage) {
  return guideMessages[language];
}

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