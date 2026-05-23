import { describe, expect, it } from "vitest";
import { STYLE_TAGS, S2_MODEL_MANIFEST } from "./constants";
import {
  generationRequestSchema,
  settingsSchema,
  setupSchema,
  voicePresetSchema,
} from "./schemas";

describe("shared schemas", () => {
  it("accepts configured setup paths and mode", () => {
    expect(
      setupSchema.parse({
        mode: "simple",
        binaryPath: "C:\\s2\\s2.exe",
        modelsPath: "C:\\voice-of-fish\\models",
        outputsPath: "C:\\voice-of-fish\\outputs",
      }),
    ).toMatchObject({ mode: "simple" });
  });

  it("rejects voice reference formats outside wav mp3 flac", () => {
    expect(() =>
      voicePresetSchema.parse({
        name: "Narrator",
        language: "en",
        referenceText: "Exact sample transcript.",
        referenceFileName: "sample.ogg",
      }),
    ).toThrow(/wav, mp3, or flac/i);
  });

  it("keeps generation request text and model required", () => {
    expect(() => generationRequestSchema.parse({ language: "en" })).toThrow();
  });

  it("treats a blank generation request seed as omitted", () => {
    expect(
      generationRequestSchema.parse({
        text: "Hello fish.",
        language: "en",
        modelId: "s2-q8",
        seed: "",
      }).seed,
    ).toBeUndefined();
  });

  it("coerces a numeric generation request seed", () => {
    expect(
      generationRequestSchema.parse({
        text: "Hello fish.",
        language: "en",
        modelId: "s2-q8",
        seed: "42",
      }).seed,
    ).toBe(42);
  });

  it("retains primitive advanced settings arguments", () => {
    const config = {
      mode: "advanced",
      binaryPath: "C:\\s2\\s2.exe",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q8",
      defaultAudioFormat: "wav",
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {
        speed: 1.1,
        verbose: true,
        preset: "broadcast",
      },
    };

    expect(settingsSchema.parse(config)).toEqual(config);
  });

  it("rejects non-primitive advanced settings arguments", () => {
    expect(() =>
      settingsSchema.parse({
        mode: "advanced",
        binaryPath: "C:\\s2\\s2.exe",
        modelsPath: "C:\\voice-of-fish\\models",
        outputsPath: "C:\\voice-of-fish\\outputs",
        defaultModelId: "s2-q8",
        defaultAudioFormat: "wav",
        cpuThreads: 8,
        gpuEnabled: true,
        advancedArgs: {
          nested: { speed: 1.1 },
        },
      }),
    ).toThrow();
  });

  it("defines first model quants and insertion tags", () => {
    expect(S2_MODEL_MANIFEST.map((model) => model.quant)).toEqual([
      "Q8",
      "Q6",
      "Q5",
      "Q4",
    ]);
    expect(STYLE_TAGS).toContain("[professional broadcast tone]");
  });
});
