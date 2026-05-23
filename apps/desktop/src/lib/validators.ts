import {
  generationRequestSchema,
  settingsSchema,
  setupSchema,
  voicePresetSchema,
} from "@voice-of-fish/shared/schemas";

export const validateGenerationRequest = (input: unknown) =>
  generationRequestSchema.safeParse(input);

export const validateSettings = (input: unknown) =>
  settingsSchema.safeParse(input);

export const validateSetup = (input: unknown) => setupSchema.safeParse(input);

export const validateVoicePreset = (input: unknown) =>
  voicePresetSchema.safeParse(input);
