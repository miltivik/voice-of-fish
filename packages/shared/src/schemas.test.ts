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


  it("validates language against supported list", () => {
    expect(() =>
      generationRequestSchema.parse({
        text: "Hello",
        modelId: "s2-q6",
        language: "xx",
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
  it("defines real model download metadata", () => {
    for (const model of S2_MODEL_MANIFEST) {
      expect(model.checksum).toMatch(/^[a-f0-9]{64}$/i);
      expect(model.downloadUrl?.endsWith(model.filename)).toBe(true);
      expect(model.approxBytes).toBeGreaterThan(0);
    }
  });
});
