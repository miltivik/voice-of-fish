import { describe, expect, it } from "vitest";
import {
  detectQuantFromFilename,
  isF16Gguf,
  isSafetensors,
  validateModelFile,
  modelIdFromQuant,
} from "./onboarding-validation";

describe("detectQuantFromFilename", () => {
  it("detects Q8 from standard filename", () => {
    expect(detectQuantFromFilename("s2-pro-q8_0.gguf")).toBe("Q8");
  });

  it("detects Q6 from standard filename", () => {
    expect(detectQuantFromFilename("s2-pro-q6_k.gguf")).toBe("Q6");
  });

  it("detects Q5 from standard filename", () => {
    expect(detectQuantFromFilename("s2-pro-q5_k_m.gguf")).toBe("Q5");
  });

  it("detects Q4 from standard filename", () => {
    expect(detectQuantFromFilename("s2-pro-q4_k_m.gguf")).toBe("Q4");
  });

  it("returns null for unknown quant", () => {
    expect(detectQuantFromFilename("s2-pro-f16.gguf")).toBeNull();
  });

  it("returns null for non-gguf file", () => {
    expect(detectQuantFromFilename("model.safetensors")).toBeNull();
  });
});

describe("isF16Gguf", () => {
  it("detects F16 GGUF", () => {
    expect(isF16Gguf("s2-pro-f16.gguf")).toBe(true);
    expect(isF16Gguf("s2-pro-F16.GGUF")).toBe(true);
  });

  it("does not flag Q6 as F16", () => {
    expect(isF16Gguf("s2-pro-q6_k.gguf")).toBe(false);
  });
});

describe("isSafetensors", () => {
  it("detects .safetensors files", () => {
    expect(isSafetensors("model.safetensors")).toBe(true);
    expect(isSafetensors("path/to/model.SAFETENSORS")).toBe(true);
  });

  it("does not flag .gguf files", () => {
    expect(isSafetensors("model.gguf")).toBe(false);
  });
});

describe("validateModelFile", () => {
  it("rejects .safetensors files", () => {
    const result = validateModelFile("model.safetensors");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("safetensors");
  });

  it("rejects F16 GGUF", () => {
    const result = validateModelFile("s2-pro-f16.gguf");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("f16");
  });

  it("accepts Q6 GGUF", () => {
    const result = validateModelFile("s2-pro-q6_k.gguf");
    expect(result.valid).toBe(true);
    expect(result.quant).toBe("Q6");
  });

  it("accepts Q8 GGUF", () => {
    const result = validateModelFile("s2-pro-q8_0.gguf");
    expect(result.valid).toBe(true);
    expect(result.quant).toBe("Q8");
  });

  it("accepts Q5 GGUF", () => {
    const result = validateModelFile("s2-pro-q5_k_m.gguf");
    expect(result.valid).toBe(true);
    expect(result.quant).toBe("Q5");
  });

  it("accepts Q4 GGUF", () => {
    const result = validateModelFile("s2-pro-q4_k_m.gguf");
    expect(result.valid).toBe(true);
    expect(result.quant).toBe("Q4");
  });

  it("rejects unrecognized GGUF variant as no_compatible", () => {
    const result = validateModelFile("unknown-model.gguf");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("no_compatible");
  });

  it("rejects empty filename as no_gguf", () => {
    const result = validateModelFile("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("no_gguf");
  });
});

describe("modelIdFromQuant", () => {
  it("maps Q8 to s2-q8", () => {
    expect(modelIdFromQuant("Q8")).toBe("s2-q8");
  });

  it("maps Q6 to s2-q6", () => {
    expect(modelIdFromQuant("Q6")).toBe("s2-q6");
  });

  it("maps Q5 to s2-q5", () => {
    expect(modelIdFromQuant("Q5")).toBe("s2-q5");
  });

  it("maps Q4 to s2-q4", () => {
    expect(modelIdFromQuant("Q4")).toBe("s2-q4");
  });
});
