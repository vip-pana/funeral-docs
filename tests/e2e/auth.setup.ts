import { expect, test as setup } from "@playwright/test";

import { PASSWORD, SESSION } from "./helpers";

setup("accesso", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/deceased$/);
  await page.context().storageState({ path: SESSION });
});
