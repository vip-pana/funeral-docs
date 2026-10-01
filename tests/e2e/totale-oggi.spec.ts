import { expect, test } from "@playwright/test";

import { addBearer, bearerCard, deleteResource, unique } from "./helpers";

/**
 * The total up to today, right after the name: ferie still to come do not
 * count in it, since it is what deciding who works next goes by.
 */

test.use({ viewport: { width: 1600, height: 960 } });

const rome = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
const label = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

test("la colonna Oggi non conta le ferie ancora da venire", async ({
  page,
}, info) => {
  const today = rome(new Date());
  const tomorrow = rome(new Date(Date.now() + 86_400_000));
  test.skip(
    tomorrow.slice(0, 7) !== today.slice(0, 7),
    "On the last day of the month there is no day to come in it.",
  );

  const name = unique(info, "Mario Oggi");
  await addBearer(page, name);

  const row = page.locator("tr", {
    has: page.locator("th", { hasText: name.toUpperCase() }),
  });
  const cell = (iso: string) =>
    page.getByRole("button", { name: new RegExp(`^${name}, ${label(iso)}:`) });
  const menu = page.locator("[data-slot=popover-content]");
  const ferie = async (iso: string) => {
    await cell(iso).click();
    await menu.getByRole("button", { name: /^Ferie, avviso 48/ }).click();
    await expect(cell(iso)).toHaveText(/^F/);
  };

  await page.goto("/calendar?view=mese");
  await ferie(today);
  await ferie(tomorrow);

  // Today's corner holds the running total so far: the column shows the same.
  const corner = await cell(today).locator(".calendar-corner").textContent();
  const upToToday = row.locator("[data-total-today]");
  await expect(upToToday).toHaveText(corner!);
  const total = Number(await row.locator("[data-total]").textContent());
  expect(total).toBeGreaterThan(Number(corner));

  await deleteResource(page, bearerCard, name);
});
