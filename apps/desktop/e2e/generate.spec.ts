import { expect, test } from "@playwright/test";

test("mock generation completes", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel(/s2\.cpp binary/i).fill("C:\\s2\\s2.exe");
  await page.getByLabel(/models folder/i).fill("C:\\voice-of-fish\\models");
  await page.getByLabel(/outputs folder/i).fill("C:\\voice-of-fish\\outputs");
  await page.getByRole("button", { name: /save setup/i }).click();

  await page.goto("/#/generate");

  await page.getByLabel(/script text/i).fill("A local workstation voice.");
  await page.getByRole("button", { name: "[serious]" }).click();
  await page.getByRole("button", { name: /^generate$/i }).click();

  await expect(page.getByText(/generation completed/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /export wav/i })).toBeEnabled();
});
