import { chromium } from 'playwright-core';
import { login } from './helpers.mjs';

/**
 * What is left on the settings page: the two lists. The declarant and the
 * company moved to the clients page, covered by clienti.mjs.
 */

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,150)));
let fail = 0;
const check = (n, c, x='') => { console.log(c?'ok  ':'FAIL', n, x); if(!c) fail++; };

await login(p, B);

await p.goto(`${B}/settings`);
check('1 pagina aperta', (await p.textContent('h1'))?.includes('Impostazioni'));

const body = await p.textContent('body');
check('2 autofunebri e necrofori', body.includes('Autofunebri') && body.includes('Necrofori'));

// The declarant and the company are no longer here: leaving the old form
// behind would mean two places saving the same data.
check('3 niente form dichiarante',
  !(await p.$('button:has-text("Salva impostazioni")')));
check('  niente campi owner', !(await p.$('#ownerFirstName')));

// --- the clients page is reachable from the sidebar ---
await p.click('a[href="/clients"]');
await p.waitForURL(/\/clients$/, { timeout: 15000 });
check('4 link Clienti nella sidebar', (await p.textContent('h1'))?.includes('Clienti'));

await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
