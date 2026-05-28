import { expect, test } from "@playwright/test";

test("onboarding wizard renders engine step", async ({ page }) => {
  await page.goto("/");

  // Wizard heading is visible, not the main shell
  await expect(
    page.getByRole("heading", { name: /connect s2\.cpp/i }),
  ).toBeVisible();

  // Progress rail shows all 3 steps
  const steps = page.getByRole("navigation", { name: "Onboarding steps" });
  await expect(steps.getByText("Engine", { exact: true })).toBeVisible();
  await expect(steps.getByText("Model file")).toBeVisible();
  await expect(steps.getByText("Output")).toBeVisible();

  // LOCAL ONLY badge is present
  await expect(page.getByText("LOCAL ONLY")).toBeVisible();

  // Back button is disabled on first step
  await expect(page.getByRole("button", { name: /back/i })).toBeDisabled();

  // Sidebar is absent before setup completion
  await expect(
    page.getByRole("navigation", { name: /primary/i }),
  ).not.toBeVisible();
});

test("external source link is present on engine step", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("button", { name: /view s2\.cpp source/i }),
  ).toBeVisible();
});

test("community badge is visible", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("COMMUNITY / EXPERIMENTAL")).toBeVisible();
});
