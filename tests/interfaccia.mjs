import { chromium } from "playwright-core";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const PW = process.env.TEST_PASSWORD ?? "sviluppo123";

const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 820 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0, 160)));

let fail = 0;
const check = (n, c, x = "") => {
  console.log(c ? "ok  " : "FAIL", n, x);
  if (!c) fail++;
};

// --- dark theme ---
await p.goto(`${B}/login`);
check("1 classe dark sul root", await p.evaluate(() => document.documentElement.classList.contains("dark")));
check(
  "  color-scheme dark",
  (await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme)) === "dark",
);
const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
const light = bg.match(/\d+/g)?.slice(0, 3).every((v) => Number(v) > 200);
check("  sfondo scuro", !light, bg);

// --- show password ---
check("2 password nascosta all'inizio", (await p.getAttribute("#password", "type")) === "password");
await p.fill("#password", PW);
await p.click('button[aria-label*="Mostra"]');
check("  clic la rende visibile", (await p.getAttribute("#password", "type")) === "text");
check("  aria-pressed aggiornato", (await p.getAttribute('button[aria-label*="Nascondi"]', "aria-pressed")) === "true");
await p.click('button[aria-label*="Nascondi"]');
check("  secondo clic la rinasconde", (await p.getAttribute("#password", "type")) === "password");
check("  il valore non si perde", (await p.inputValue("#password")) === PW);

// --- sidebar ---
await Promise.all([p.waitForURL(/pratiche/, { timeout: 15000 }), p.click('button[type=submit]')]);
await p.waitForTimeout(500);

check("3 sidebar presente", await p.isVisible('[data-slot="sidebar"], [data-sidebar="sidebar"]'));
check("  nessuna navbar orizzontale", !(await p.isVisible("header nav")));

const activeHref = await p.getAttribute('[data-active="true"] a, a[data-active="true"]', "href").catch(() => null);
check("4 voce attiva su Pratiche", activeHref === "/pratiche", String(activeHref));

await p.goto(`${B}/impostazioni`);
await p.waitForTimeout(400);
const active2 = await p.getAttribute('[data-active="true"] a, a[data-active="true"]', "href").catch(() => null);
check("  voce attiva su Impostazioni", active2 === "/impostazioni", String(active2));

// the subpage keeps the parent entry active
await p.goto(`${B}/pratiche/nuova`);
await p.waitForTimeout(400);
const active3 = await p.getAttribute('[data-active="true"] a, a[data-active="true"]', "href").catch(() => null);
check("  sottopagina mantiene Pratiche", active3 === "/pratiche", String(active3));

// --- collapse persists ---
await p.goto(`${B}/pratiche`);
await p.click('button[data-sidebar="trigger"]');
await p.waitForTimeout(600);
check("5 cookie salvato", (await ctx.cookies()).some((c) => c.name === "sidebar_state" && c.value === "false"));

await p.reload();
await p.waitForTimeout(600);
const w = (await p.locator('[data-slot="sidebar-container"], [data-sidebar="sidebar"]').first().boundingBox())?.width;
check("  resta compressa dopo il reload", w !== undefined && w < 100, `${w}px`);

// --- logout from the sidebar ---
await p.click('button[data-sidebar="trigger"]');
await p.waitForTimeout(400);
await p.click('button:has-text("Esci")');
await p.waitForURL(/login/, { timeout: 10000 });
check("6 logout dalla sidebar", p.url().includes("/login"));

await b.close();
console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
process.exit(fail ? 1 : 0);
