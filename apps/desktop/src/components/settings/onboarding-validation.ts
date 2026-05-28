import type { ModelQuant } from "@voice-of-fish/shared";

export type OnboardingStep = "engine" | "model" | "output";

export const STEP_ORDER: OnboardingStep[] = ["engine", "model", "output"];

/**
 * Normalise the filename stem to detect the quant variant.
 * This is intentionally simple — MVP only supports the community GGUF
 * filenames listed in S2_MODEL_MANIFEST.
 */
export function detectQuantFromFilename(filename: string): ModelQuant | null {
  const stem = filename.replace(/\.gguf$/i, "");
  const upper = stem.toUpperCase();

  if (upper.includes("Q8")) return "Q8";
  if (upper.includes("Q6")) return "Q6";
  if (upper.includes("Q5")) return "Q5";
  if (upper.includes("Q4")) return "Q4";
  return null;
}

/**
 * Is this filename an F16 GGUF? We must reject it for MVP.
 */
export function isF16Gguf(filename: string): boolean {
  const upper = filename.toUpperCase();
  return upper.endsWith(".GGUF") && upper.includes("F16");
}

/**
 * Is this filename a Safetensors file?
 */
export function isSafetensors(filename: string): boolean {
  return /\.safetensors$/i.test(filename);
}

export interface ModelValidation {
  valid: boolean;
  quant: ModelQuant | null;
  error: "safetensors" | "f16" | "no_gguf" | "no_compatible" | null;
}

/**
 * Validate a model file path or folder.
 * - Rejects .safetensors files
 * - Rejects F16 GGUF files
 * - Requires a supported quant (Q8, Q6, Q5, Q4)
 */
export function validateModelFile(
  filename: string,
): ModelValidation {
  if (!filename) {
    return { valid: false, quant: null, error: "no_gguf" };
  }

  if (isSafetensors(filename)) {
    return { valid: false, quant: null, error: "safetensors" };
  }

  if (isF16Gguf(filename)) {
    return { valid: false, quant: null, error: "f16" };
  }

  const quant = detectQuantFromFilename(filename);

  if (!quant) {
    // Has .gguf extension but no recognized quant?
    if (/\.gguf$/i.test(filename)) {
      return { valid: false, quant: null, error: "no_compatible" };
    }
    return { valid: false, quant: null, error: "no_gguf" };
  }

  return { valid: true, quant, error: null };
}

export interface PathValidation {
  valid: boolean;
  error: string | null;
}

export function validateEnginePath(path: string): PathValidation {
  if (!path.trim()) {
    return { valid: false, error: "Binary path is required." };
  }
  return { valid: true, error: null };
}

export function validateOutputPath(path: string): PathValidation {
  if (!path.trim()) {
    return { valid: false, error: "Output folder is required." };
  }
  return { valid: true, error: null };
}

/**
 * Build the AppConfig defaultModelId from a quant selection.
 */
export function modelIdFromQuant(quant: ModelQuant): string {
  return `s2-${quant.toLowerCase()}`;
}
