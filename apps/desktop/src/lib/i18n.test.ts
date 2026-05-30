import { describe, expect, it } from "vitest";
import { getGuideMessages, t } from "./i18n";

describe("getGuideMessages", () => {
  it("serves Spanish setup guide copy by default-compatible key", () => {
    const copy = getGuideMessages("es");

    expect(copy.quickSummary).toMatch(/Necesitas instalar s2\.cpp/i);
    expect(copy.fullGuideButton).toBe("Abrir guía completa");
    expect(copy.quickSteps).toHaveLength(5);
  });

  it("serves English setup guide copy", () => {
    const copy = getGuideMessages("en");

    expect(copy.quickSummary).toMatch(/Need to install s2\.cpp/i);
    expect(copy.fullGuideButton).toBe("Open full guide");
    expect(copy.quickSteps).toHaveLength(5);
  });

  it("keeps existing application translations available", () => {
    expect(t("engineHeading")).toBe("Connect s2.cpp");
  });
});
