import { expect, type Page, test } from "@playwright/test";

import { addBearer, bearerCard, deleteResource, unique } from "./helpers";

/**
 * The calendar rows are put in order by dragging the grip beside the name, and
 * the order is saved: it is still there after a reload.
 */

test.use({ viewport: { width: 1600, height: 960 } });

/** The row names as the grid shows them, top to bottom. */
const rowOrder = (page: Page) =>
  page.locator("tr[data-bearer-row] th").allTextContents();

test("una riga trascinata resta al suo posto", async ({ page }, info) => {
  const first = unique(info, "Primo Ordine");
  const second = unique(info, "Secondo Ordine");
  // Each new bearer goes last, so `second` starts below `first`.
  await addBearer(page, first);
  await addBearer(page, second);

  await page.goto("/calendar?view=mese");
  const before = await rowOrder(page);
  expect(before.indexOf(second.toUpperCase())).toBeGreaterThan(
    before.indexOf(first.toUpperCase()),
  );

  // The two are last in a long list: brought on screen, or the mouse has
  // nowhere to press.
  const grip = page.getByRole("button", { name: `Sposta ${second}` });
  await grip.scrollIntoViewIfNeeded();
  // Moved in steps: dnd-kit waits for a few pixels before it starts a drag.
  const from = await grip.boundingBox();
  const to = await page
    .getByRole("button", { name: `Sposta ${first}` })
    .boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 2, { steps: 12 });
  await page.mouse.up();

  const moved = (order: string[]) =>
    order.indexOf(second.toUpperCase()) < order.indexOf(first.toUpperCase());
  await expect.poll(async () => moved(await rowOrder(page))).toBe(true);

  await page.reload();
  await expect.poll(async () => moved(await rowOrder(page))).toBe(true);

  await deleteResource(page, bearerCard, first);
  await deleteResource(page, bearerCard, second);
});
