import { expect, test } from "@playwright/test";

import { LOGGED_OUT, PASSWORD } from "./helpers";

test.use({ storageState: LOGGED_OUT });

test("una pagina protetta porta al login, ricordando dove si andava", async ({
  page,
}) => {
  await page.goto("/deceased");
  await expect(page).toHaveURL(/\/login\?next=%2Fdeceased$/);
});

test("la password errata mostra un errore e non fa entrare", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#password", "sbagliata"); // ggignore
  await page.click("button[type=submit]");
  // Filtered: Next's route announcer is an empty alert too.
  await expect(
    page.getByRole("alert").filter({ hasText: "errata" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("la password giusta apre una sessione che resta fino al logout", async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto("/login?next=%2Fdeceased");
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/deceased$/);
  await expect(page.locator("h1")).toHaveText("Defunti");

  const cookie = (await context.cookies()).find(
    (c) => c.name === "funeral_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  // `secure` depends on the environment: on in production, unless
  // COOKIE_SECURE=false for http access over Tailscale.
  if (baseURL?.startsWith("https")) expect(cookie?.secure).toBe(true);

  await page.goto("/deceased");
  await expect(page).toHaveURL(/\/deceased$/);

  // Already logged in: the login page sends straight on.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/deceased$/);

  await page.click('button:has-text("Esci")');
  await expect(page).toHaveURL(/\/login/);
  const after = (await context.cookies()).find(
    (c) => c.name === "funeral_session",
  );
  expect(after?.value ?? "").toBe("");
});
