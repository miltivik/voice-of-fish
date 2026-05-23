import { expect, test } from "@playwright/test";

test("setup and route navigation stay usable", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /voice of fish setup/i }),
  ).toBeVisible();

  await page.getByLabel(/s2\.cpp binary/i).fill("C:\\s2\\s2.exe");
  await page.getByLabel(/models folder/i).fill("C:\\voice-of-fish\\models");
  await page.getByLabel(/outputs folder/i).fill("C:\\voice-of-fish\\outputs");
  await page.getByRole("button", { name: /save setup/i }).click();

  const sidebar = page.getByRole("navigation", { name: /primary/i });
  await sidebar.getByRole("link", { name: /diagnostics/i }).click();

  await expect(
    page.getByRole("heading", { name: /diagnostics/i }),
  ).toBeVisible();
});
