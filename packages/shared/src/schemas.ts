import { z } from "zod";

const nonBlank = z.string().trim().min(1);
const referenceFile = z
  .string()
  .regex(/\.(wav|mp3|flac)$/i, "Reference file must be wav, mp3, or flac.");

export const setupSchema = z.object({
  mode: z.enum(["simple", "advanced"]),
  binaryPath: nonBlank,
  modelsPath: nonBlank,
  outputsPath: nonBlank,
});

export const generationRequestSchema = z.object({
  text: nonBlank.max(8_000),
  language: nonBlank,
  modelId: nonBlank,
  seed: z.coerce.number().int().optional(),
  voicePresetId: z.string().optional(),
  referenceAudioPath: z.string().optional(),
  referenceText: z.string().optional(),
});

export const voicePresetSchema = z.object({
  name: nonBlank,
  language: nonBlank,
  referenceText: nonBlank,
  referenceFileName: referenceFile,
  notes: z.string().max(400).optional(),
  durationSeconds: z.number().positive().optional(),
});

export const settingsSchema = setupSchema.extend({
  defaultModelId: nonBlank,
  defaultAudioFormat: z.literal("wav"),
  cpuThreads: z.coerce.number().int().min(1).max(256),
  gpuEnabled: z.boolean(),
});
