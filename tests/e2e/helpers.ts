import { expect, type Page, type TestInfo } from "@playwright/test";

export const PASSWORD = process.env.TEST_PASSWORD ?? "sviluppo123";

/** For the tests that start logged out, whatever the project gives them. */
export const LOGGED_OUT = { cookies: [], origins: [] };

/**
 * A name no other test is using: tests run in parallel against one database,
 * and a retry must not trip over what the failed attempt left behind.
 */
export function unique(info: TestInfo, prefix: string) {
  return `${prefix} ${info.workerIndex}-${info.retry}-${Date.now() % 1e6}`;
}

/**
 * Not an <input>: the trigger is a button that opens a popover with the
 * search, so `fill()` on the field fails. With no match, the typed text is
 * confirmed as is: the field also accepts municipalities not in the list.
 */
export async function pickComune(page: Page, field: string, comune: string) {
  await page.click(`#${field}`);
  const search = page.locator("[cmdk-input]");
  await search.fill(comune);

  const first = page.locator("[cmdk-item]").first();
  const found = await first
    .waitFor({ timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (found) await first.click();
  else await page.keyboard.press("Enter");
  await expect(search).toBeHidden();
}

/**
 * Not a native <select>: the trigger is a button that opens a menu, so
 * `selectOption()` fails.
 */
export async function pickSelect(page: Page, field: string, text: string) {
  await page.click(`#${field}`);
  await page.locator(`[role=option]:has-text("${text}")`).click();
  await expect(page.getByRole("listbox")).toBeHidden();
}
