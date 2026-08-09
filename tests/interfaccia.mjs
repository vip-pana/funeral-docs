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

const isDark = () => p.evaluate(() => document.documentElement.classList.contains("dark"));
// The palette is in oklch, so the browser reports the background as
// `lab(L a b)` where L is a 0-100 lightness — not as `rgb()`.
const bodyIsLight = async () => {
  const c = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const l = Number(c.match(/[\d.]+/)?.[0]);
  return [l > 50, c];
};

// --- dark theme ---
await p.goto(`${B}/login`);
check("1 classe dark sul root", await isDark());
check(
  "  color-scheme dark",
  (await p.evaluate(() => getComputedStyle(document.documentElement).colorScheme)) === "dark",
);
const [light, bg] = await bodyIsLight();
check("  sfondo scuro senza scelta salvata", !light, bg);

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
await Promise.all([p.waitForURL(/deceased/, { timeout: 15000 }), p.click('button[type=submit]')]);
await p.waitForTimeout(500);

check("3 sidebar presente", await p.isVisible('[data-slot="sidebar"], [data-sidebar="sidebar"]'));
check("  nessuna navbar orizzontale", !(await p.isVisible("header nav")));

const activeHref = await p.getAttribute('[data-active="true"] a, a[data-active="true"]', "href").catch(() => null);
check("4 voce attiva su Defunti", activeHref === "/deceased", String(activeHref));

await p.goto(`${B}/resources`);
await p.waitForTimeout(400);
const active2 = await p.getAttribute('[data-active="true"] a, a[data-active="true"]', "href").catch(() => null);
check("  voce attiva su Risorse", active2 === "/resources", String(active2));

// the subpage keeps the parent entry active
await p.goto(`${B}/deceased/new`);
await p.waitForTimeout(400);
const active3 = await p.getAttribute('[data-active="true"] a, a[data-active="true"]', "href").catch(() => null);
check("  sottopagina mantiene Defunti", active3 === "/deceased", String(active3));

// --- theme switch in the sidebar ---
await p.goto(`${B}/deceased`);
await p.click('button:has-text("Tema chiaro")');
await p.waitForTimeout(300);
check("5 il tasto passa al chiaro", !(await isDark()));
const [light2, bg2] = await bodyIsLight();
check("  sfondo chiaro", light2, bg2);

await p.reload();
await p.waitForTimeout(600);
check("  la scelta resta dopo il reload", !(await isDark()));

// back to dark, so the checks that follow start from the usual theme
await p.click('button:has-text("Tema scuro")');
await p.waitForTimeout(300);
check("  secondo clic torna allo scuro", await isDark());

// --- collapse persists ---
await p.click('button[data-sidebar="trigger"]');
await p.waitForTimeout(600);
check("6 cookie salvato", (await ctx.cookies()).some((c) => c.name === "sidebar_state" && c.value === "false"));

await p.reload();
await p.waitForTimeout(600);
const w = (await p.locator('[data-slot="sidebar-container"], [data-sidebar="sidebar"]').first().boundingBox())?.width;
check("  resta compressa dopo il reload", w !== undefined && w < 100, `${w}px`);

// --- logout from the sidebar ---
await p.click('button[data-sidebar="trigger"]');
await p.waitForTimeout(400);
await p.click('button:has-text("Esci")');
await p.waitForURL(/login/, { timeout: 10000 });
check("7 logout dalla sidebar", p.url().includes("/login"));

await b.close();
console.log(fail ? `\n=== ${fail} FALLITI ===` : "\n=== TUTTI OK ===");
process.exit(fail ? 1 : 0);
