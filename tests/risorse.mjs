import { chromium } from 'playwright-core';
import { login } from './helpers.mjs';

/**
 * The page that used to be Impostazioni: mezzi and personale. The declarant and
 * the company moved to Clienti, the password to Impostazioni.
 */

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,150)));
let fail = 0;
const check = (n, c, x='') => { console.log(c?'ok  ':'FAIL', n, x); if(!c) fail++; };

await login(p, B);

await p.goto(`${B}/resources`);
check('1 pagina aperta', (await p.textContent('h1'))?.includes('Risorse'));

const body = await p.textContent('body');
check('2 autofunebri e necrofori', body.includes('Autofunebri') && body.includes('Necrofori'));

// Neither the declarant nor the password is here: two places saving the same
// thing is how they drift apart.
check('3 niente form dichiarante', !(await p.$('#companyName')));
check('  niente campi owner', !(await p.$('#ownerFirstName')));
check('  niente cambio password', !(await p.$('#newPassword')));

// --- the sidebar reaches the other three ---
for (const [href, title] of [
  ['/clients', 'Clienti'],
  ['/settings', 'Impostazioni'],
  ['/resources', 'Risorse'],
]) {
  await p.click(`a[href="${href}"]`);
  await p.waitForURL(new RegExp(`${href}$`), { timeout: 15000 });
  check(`4 sidebar -> ${title}`, (await p.textContent('h1'))?.includes(title));
}

await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
