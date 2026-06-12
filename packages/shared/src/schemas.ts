import { z } from "zod";

export const TEXT_MAX_LENGTH = 8_000;
export const PRESET_NOTES_MAX_LENGTH = 400;
export const CPU_THREADS_MAX = 256;
export const SEED_MAX = 2_147_483_647;

export const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "pl",
  "tr",
  "ru",
  "nl",
  "cs",
  "ar",
  "zh-cn",
  "ja",
  "hu",
  "ko",
  "hi",
] as const;

const nonBlank = z.string().trim().min(1);
const referenceFile = z
  .string()
  .regex(/\.(wav|mp3|flac)$/i, "Reference file must be wav, mp3, or flac.");
const optionalSeed = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().int().min(0).max(SEED_MAX).optional(),
);

const appModeSchema = z.enum(["simple", "advanced"]).default("simple");

export const setupSchema = z.object({
  mode: appModeSchema,
  binaryPath: nonBlank,
  modelsPath: nonBlank,
  outputsPath: nonBlank,
});

export const appConfigSchema = setupSchema.extend({
  defaultModelId: nonBlank,
  defaultAudioFormat: z.literal("wav").default("wav"),
  cpuThreads: z.coerce.number().int().min(1).max(CPU_THREADS_MAX),
  gpuEnabled: z.boolean(),
  schemaVersion: z.number().int().default(0),
});

export const generationRequestSchema = z.object({
  text: nonBlank.max(TEXT_MAX_LENGTH),
  language: z.enum(SUPPORTED_LANGUAGES),
  modelId: nonBlank,
  seed: optionalSeed,
  voicePresetId: z.string().optional(),
  referenceAudioPath: z.string().optional(),
  referenceText: z.string().optional(),
});

export const voicePresetSchema = z.object({
  name: nonBlank,
  language: nonBlank,
  referenceText: nonBlank,
  referenceFileName: referenceFile,
  notes: z.string().max(PRESET_NOTES_MAX_LENGTH).optional(),
  durationSeconds: z.number().positive().optional(),
});

// Backwards-compatible alias
export const settingsSchema = appConfigSchema;