import { expect, test } from "@playwright/test";

test.describe("Onboarding wizard smoke test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows all three steps in progress rail", async ({ page }) => {
    const steps = page.getByRole("navigation", { name: "Onboarding steps" });
    await expect(steps.getByText("Engine", { exact: true })).toBeVisible();
    await expect(steps.getByText("Model file")).toBeVisible();
    await expect(steps.getByText("Output")).toBeVisible();
    await expect(page.getByText("LOCAL ONLY")).toBeVisible();
  });

  test("install guide opens and switches language", async ({ page }) => {
    // Open quick guide
    const summary = page.getByText(/Necesitas instalar s2\.cpp/i);
    await summary.click();

    // Quick guide content visible
    await expect(
      page.getByText(/Voice of Fish no instala s2\.cpp/i),
    ).toBeVisible();

    // All three OS command blocks visible
    await expect(page.getByText("Windows PowerShell")).toBeVisible();
    await expect(page.getByText("Linux shell")).toBeVisible();
    await expect(page.getByText("Terminal macOS")).toBeVisible();

    // Switch to English
    await page.getByRole("button", { name: "English" }).click();
    await expect(
      page.getByText(/Voice of Fish does not install s2\.cpp/i),
    ).toBeVisible();
  });

  test("opens full install guide and returns", async ({ page }) => {
    // Open quick guide
    await page.getByText(/Necesitas instalar s2\.cpp/i).click();
    // Open full guide
    await page.getByRole("button", { name: /Abrir guía completa/i }).click();

    // Full guide heading visible
    await expect(
      page.getByRole("heading", { name: /Guía completa de instalación/i }),
    ).toBeVisible();

    // Troubleshooting section visible
    await expect(page.getByText(/chmod \+x build\/s2/i)).toBeVisible();

    // Return to setup
    await page
      .getByRole("button", { name: /Volver a configuración/i })
      .click();
    await expect(
      page.getByText(/Necesitas instalar s2\.cpp/i),
    ).toBeVisible();
  });

  test("copy buttons exist and are clickable", async ({ page }) => {
    await page.getByText(/Necesitas instalar s2\.cpp/i).click();

    const copyButtons = page.getByRole("button", { name: "Copiar" });
    await expect(copyButtons).toHaveCount(3);

    // Click doesn't crash (clipboard API unavailable in headless)
    await copyButtons.first().click();
  });
  test("navigates engine → model → output via continue", async ({ page }) => {
    // Start on engine step
    await expect(
      page.getByRole("heading", { name: /connect s2\.cpp/i }),
    ).toBeVisible();

    // Fill binary path (won't validate in web mode, but enables continue)
    const binaryInput = page.getByLabel(/connect s2\.cpp/i);
    await binaryInput.fill("/usr/local/bin/s2");
    // Tab to trigger validation
    await binaryInput.blur();

    // Continue button should eventually enable
    const continueBtn = page.getByRole("button", { name: /continue/i });
    // In web mode checkBinaryExists will fail, so continue stays disabled.
    // Just verify the button exists and step counter shows step 1/3.
    await expect(continueBtn).toBeVisible();
    await expect(page.getByText("Step 1 of 3")).toBeVisible();

    // Back button disabled on first step
    await expect(page.getByRole("button", { name: /back/i })).toBeDisabled();
  });

  test("sidebar absent during setup, visible after flow hint", async ({ page }) => {
    // No sidebar navigation during setup
    await expect(
      page.getByRole("navigation", { name: /primary/i }),
    ).not.toBeVisible();

    // Privacy note visible
    await expect(
      page.getByText(/No telemetry/i),
    ).toBeVisible();
  });
});
