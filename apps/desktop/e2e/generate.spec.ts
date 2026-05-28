import { expect, test } from "@playwright/test";

test("onboarding wizard is the first screen", async ({ page }) => {
  await page.goto("/");

  // The wizard is the first thing a user sees
  await expect(
    page.getByRole("heading", { name: /connect s2\.cpp/i }),
  ).toBeVisible();
});
