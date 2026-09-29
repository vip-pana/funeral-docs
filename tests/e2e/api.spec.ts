import { expect, test } from "@playwright/test";

import { createPractice, deletePractice } from "./helpers";

test("la route di generazione nei casi limite", async ({ page }) => {
  const id = await createPractice(page);
  const get = (url: string) => page.request.get(url);

  // The id is a UUID: there is no shape to validate, so an id that matches no
  // row is "not found" whether it is well formed or not.
  expect(
    (
      await get("/api/deceased/00000000-0000-4000-8000-000000000000/generate")
    ).status(),
  ).toBe(404);
  expect((await get("/api/deceased/abc/generate")).status()).toBe(404);

  // Not a number that happens to be free today: 9 was one until the
  // cremation forms were added.
  expect((await get(`/api/deceased/${id}/generate?doc=999`)).status()).toBe(
    400,
  );

  for (const url of [
    `/api/deceased/${id}/generate?doc=2`,
    // No doc: the first one.
    `/api/deceased/${id}/generate`,
  ]) {
    const r = await get(url);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toContain("wordprocessingml");
  }

  await deletePractice(page, id);
});
