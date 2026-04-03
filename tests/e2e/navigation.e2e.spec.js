import { expect, test } from "@playwright/test";

test("home page can launch graph editor", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /open graph editor/i })).toBeVisible();
  await page.getByRole("button", { name: /open graph editor/i }).click();

  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByText("Graph Editor")).toBeVisible();
});

test("unknown routes redirect to homepage", async ({ page }) => {
  await page.goto("/not-a-real-route");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /open graph editor/i })).toBeVisible();
});
