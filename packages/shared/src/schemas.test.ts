import { describe, expect, it } from "vitest";
import { STYLE_TAGS, S2_MODEL_MANIFEST } from "./constants";
import { generationRequestSchema, setupSchema, voicePresetSchema } from "./schemas";

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

  it("defines first model quants and insertion tags", () => {
    expect(S2_MODEL_MANIFEST.map((model) => model.quant)).toEqual(["Q8", "Q6", "Q5", "Q4"]);
    expect(STYLE_TAGS).toContain("[professional broadcast tone]");
  });
});
