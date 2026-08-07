import { chromium } from 'playwright-core';
import { login } from './helpers.mjs';

/**
 * The password now lives in the database, not in AUTH_PASSWORD_HASH, so this
 * suite changes shared state that every other suite depends on to log in.
 * Whatever happens it must put the original password back — hence the
 * try/finally, and the restore going through the action rather than assuming
 * the change went through.
 */

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const ORIGINAL = process.env.TEST_PASSWORD ?? 'sviluppo123';
const TEMP = 'collaudo-temporanea-9182';

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,150)));
let fail = 0;
const check = (n, c, x='') => { console.log(c?'ok  ':'FAIL', n, x); if(!c) fail++; };

/**
 * Fills the three fields and submits, resolving with the text of the toast this
 * submission produced.
 *
 * The checks below run a few hundred milliseconds apart while a toast lasts
 * four seconds, so several are on screen at once and the success check would
 * otherwise read the error left by the check before it. Sonner prepends, so the
 * newest toast is the first in the DOM, not the last.
 */
async function submit(current, next, confirm = next) {
  const before = await p.locator('[data-sonner-toast]').count();
  await p.fill('#currentPassword', current);
  await p.fill('#newPassword', next);
  await p.fill('#confirmPassword', confirm);
  await p.click('button:has-text("Cambia password")');
  const appeared = await p
    .waitForFunction(
      n => document.querySelectorAll('[data-sonner-toast]').length > n,
      before,
      { timeout: 12000 },
    )
    .then(() => true).catch(() => false);
  if (!appeared) return '';
  return p.locator('[data-sonner-toast]').first().textContent();
}

let changed = false;
try {
  await login(p, B);

  await p.goto(`${B}/settings`);
  check('1 pagina aperta', (await p.textContent('h1'))?.includes('Impostazioni'));
  check('  card password', await p.isVisible('#newPassword'));
  // Vehicles and bearers moved out: they are Risorse now.
  check('  niente autofunebri', !(await p.$('button:has-text("Aggiungi")')));

  /** The error rendered under one field, which is where the message belongs. */
  const errorOn = async name =>
    (await p.locator(`#${name}-error`).textContent().catch(() => '')) ?? '';

  // --- the current password is checked, not just the session ---
  await submit('password-sbagliata', TEMP);
  await p.waitForTimeout(400);
  check('2 password attuale errata rifiutata',
    (await errorOn('currentPassword')).includes('errata'));

  // --- confirmation must match, and the message lands on the right field ---
  await submit(ORIGINAL, TEMP, 'qualcos-altro');
  await p.waitForTimeout(400);
  check('3 conferma diversa rifiutata',
    (await errorOn('confirmPassword')).includes('non coincidono'));

  // --- too short ---
  await submit(ORIGINAL, 'corta');
  await p.waitForTimeout(400);
  check('4 password corta rifiutata',
    (await errorOn('newPassword')).includes('almeno 8 caratteri'));

  // --- the real change ---
  const toast = await submit(ORIGINAL, TEMP);
  check('5 cambio riuscito', toast?.includes('aggiornata'), toast ?? '');
  changed = true;

  // --- it holds: log out and back in with the new one ---
  await p.click('button:has-text("Esci")');
  await p.waitForURL(/\/login/, { timeout: 15000 });

  await p.fill('#password', ORIGINAL);
  await p.click('button[type=submit]');
  await p.waitForTimeout(1200);
  check('6 la vecchia password non entra più', p.url().includes('/login'));

  await p.fill('#password', TEMP);
  await Promise.all([
    p.waitForURL(/deceased/, { timeout: 15000 }),
    p.click('button[type=submit]'),
  ]);
  check('7 la nuova password entra', p.url().includes('/deceased'));
} finally {
  // Put it back, or every later run — and the next developer — is locked out.
  if (changed) {
    await p.goto(`${B}/settings`);
    const toast = await submit(TEMP, ORIGINAL);
    const restored = Boolean(toast?.includes('aggiornata'));
    check('8 password ripristinata', restored, toast ?? '');
    if (!restored) {
      console.log(`\n  !! LA PASSWORD È RIMASTA "${TEMP}" — rimettila a mano.`);
    }
  }
  await b.close();
}

console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
