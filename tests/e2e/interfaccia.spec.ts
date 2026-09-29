import { expect, type Page, test } from "@playwright/test";

import { LOGGED_OUT, PASSWORD } from "./helpers";

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains("dark"));

// The palette is in oklch, so the browser reports the background as
// `lab(L a b)` where L is a 0-100 lightness — not as `rgb()`.
const bodyLightness = (page: Page) =>
  page.evaluate(() =>
    Number(
      getComputedStyle(document.body).backgroundColor.match(/[\d.]+/)?.[0],
    ),
  );

const ACTIVE = '[data-active="true"] a, a[data-active="true"]';
const SIDEBAR = '[data-slot="sidebar-container"], [data-sidebar="sidebar"]';

test.describe("pagina di login", () => {
  test.use({ storageState: LOGGED_OUT });

  test("tema scuro senza una scelta salvata", async ({ page }) => {
    await page.goto("/login");
    expect(await isDark(page)).toBe(true);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).colorScheme,
      ),
    ).toBe("dark");
    expect(await bodyLightness(page)).toBeLessThan(50);
  });

  test("mostra e nasconde la password senza perderla", async ({ page }) => {
    await page.goto("/login");
    const field = page.locator("#password");
    await expect(field).toHaveAttribute("type", "password");

    await field.fill(PASSWORD);
    await page.click('button[aria-label*="Mostra"]');
    await expect(field).toHaveAttribute("type", "text");
    await expect(
      page.locator('button[aria-label*="Nascondi"]'),
    ).toHaveAttribute("aria-pressed", "true");

    await page.click('button[aria-label*="Nascondi"]');
    await expect(field).toHaveAttribute("type", "password");
    await expect(field).toHaveValue(PASSWORD);
  });
});

test.describe("sidebar", () => {
  test("al posto della navbar, con la voce della pagina attiva", async ({
    page,
  }) => {
    await page.goto("/deceased");
    await expect(
      page.locator('[data-slot="sidebar"], [data-sidebar="sidebar"]').first(),
    ).toBeVisible();
    await expect(page.locator("header nav")).toBeHidden();
    await expect(page.locator(ACTIVE)).toHaveAttribute("href", "/deceased");

    await page.goto("/resources");
    await expect(page.locator(ACTIVE)).toHaveAttribute("href", "/resources");

    // A subpage keeps its parent entry active.
    await page.goto("/deceased/new");
    await expect(page.locator(ACTIVE)).toHaveAttribute("href", "/deceased");
  });

  test("il tema scelto resta dopo il reload", async ({ page }) => {
    await page.goto("/deceased");
    await page.click('button:has-text("Tema chiaro")');
    await expect.poll(() => isDark(page)).toBe(false);
    await expect.poll(() => bodyLightness(page)).toBeGreaterThan(50);

    await page.reload();
    await expect.poll(() => isDark(page)).toBe(false);

    await page.click('button:has-text("Tema scuro")');
    await expect.poll(() => isDark(page)).toBe(true);
  });

  test("compressa resta compressa dopo il reload", async ({
    page,
    context,
  }) => {
    await page.goto("/deceased");
    await page.click('button[data-sidebar="trigger"]');
    await expect
      .poll(async () =>
        (await context.cookies()).some(
          (c) => c.name === "sidebar_state" && c.value === "false",
        ),
      )
      .toBe(true);

    await page.reload();
    await expect
      .poll(
        async () =>
          (await page.locator(SIDEBAR).first().boundingBox())?.width ?? 999,
      )
      .toBeLessThan(100);
  });

  test("esci dalla sidebar torna al login", async ({ page }) => {
    await page.goto("/deceased");
    await page.click('button:has-text("Esci")');
    await expect(page).toHaveURL(/\/login/);
  });
});
