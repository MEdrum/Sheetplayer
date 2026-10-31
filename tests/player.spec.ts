import { expect, test } from "@playwright/test";

test("keeps the main player content visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Scores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a score" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear data" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "hidden");
});

test("mobile layout keeps controls visible without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByPlaceholder("Filter scores")).toBeVisible();
  await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Play/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("exposes the PWA manifest and service worker", async ({ request }) => {
  expect((await request.get("/manifest.webmanifest")).ok()).toBe(true);
  expect((await request.get("/sw.js")).ok()).toBe(true);
});
