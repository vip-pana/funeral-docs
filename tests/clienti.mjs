import { chromium } from 'playwright-core';
import { login, pickComune } from './helpers.mjs';

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,150)));
let fail = 0;
const check = (n, c, x='') => { console.log(c?'ok  ':'FAIL', n, x); if(!c) fail++; };

await login(p, B);

await p.goto(`${B}/clients`);
check('1 pagina clienti', (await p.textContent('h1'))?.includes('Clienti'));

// --- validation: nothing filled in ---
await p.goto(`${B}/clients/new`);
await p.click('button:has-text("Crea cliente")');
await p.waitForFunction(()=>document.querySelectorAll('[role=alert]').length>3,null,{timeout:12000});
check('2 validazione blocca vuoto', true);
check('  resta su nuovo', p.url().includes('/clients/new'));

// --- create ---
// A name of its own, so the suite does not collide with the seeded clients.
const COMPANY = 'OO.FF. Collaudo E2E';
for (const [k,v] of Object.entries({
  firstName:'Giulio', middleName:'M.', lastName:'Collaudo',
  companyName:COMPANY,
  birthDate:'1970-01-15', address:'Via Prova 1', postalCode:'71016',
  idType:"CARTA D'IDENTITA", idNumber:'CA00001XX',
  idIssuer:'COMUNE DI SAN SEVERO', idDate:'2020-02-02',
})) await p.fill(`#${k}`, v);
// Municipalities go through the combobox, not fill().
for (const f of ['birthCity','companyCity','city','cityName']) {
  await pickComune(p, f, 'San Severo');
}
await Promise.all([
  p.waitForURL(/\/clients\/[0-9a-f]{8}-/, { timeout: 15000 }),
  p.click('button:has-text("Crea cliente")'),
]);
const url = p.url();
check('3 creato e aperto', /\/clients\/[0-9a-f-]{36}$/.test(url), url);
check('  intestazione', (await p.textContent('h1'))?.includes(COMPANY));
const id = url.split('/').pop();

// --- the values persist ---
await p.reload();
check('4 nome persiste', await p.inputValue('#firstName') === 'Giulio');
check('  documento persiste', await p.inputValue('#idNumber') === 'CA00001XX');
// The combobox writes into a hidden input, so the value is read from the DOM.
check('  comune persiste',
  await p.$eval('input[name=birthCity]', el => el.value) === 'San Severo');

// --- edit ---
await p.fill('#address','Via Modificata 9');
await p.click('button:has-text("Salva modifiche")');
await p.waitForFunction(()=>[...document.querySelectorAll('[data-sonner-toast]')]
  .some(t=>t.textContent?.includes('aggiornato')), null, {timeout:12000});
await p.reload();
check('5 modifica persiste', await p.inputValue('#address') === 'Via Modificata 9');

// --- it shows up in the list, and in the picker on a record ---
await p.goto(`${B}/clients`);
// Scoped to the table for the same reason as the deletion check below.
const listed = await p.$$eval('td', els => els.map(e => e.textContent));
check('6 compare in elenco', listed.some(r => r?.includes(COMPANY)));

// Every row opens from its own button, as in the records list.
const opener = p.locator(`tr:has-text("${COMPANY}") a:has-text("Apri")`);
check('  ha il tasto Apri', await opener.count() === 1);
await opener.click();
await p.waitForURL(new RegExp(`/clients/${id}$`), { timeout: 15000 });
check('  Apri porta alla scheda', (await p.textContent('h1'))?.includes(COMPANY));

await p.goto(`${B}/deceased/new`);
await p.click('#clientId');
const inPicker = await p
  .waitForSelector(`[role=option]:has-text("${COMPANY}")`, { timeout: 5000 })
  .then(() => true).catch(() => false);
await p.keyboard.press('Escape');
check('7 selezionabile su un defunto', inPicker);

// --- delete ---
await p.goto(`${B}/clients/${id}`);
await p.click('button:has-text("Elimina")');
await Promise.all([
  p.waitForURL(u => u.pathname === '/clients', { timeout: 15000 }),
  p.click('button:has-text("Confermi")'),
]);
// The table, not textContent('body'): the body carries the RSC payload inside a
// <script>, where the name of the page just left behind is still serialised.
// Reading the whole body finds it there and reports a deletion that did happen
// as failed.
const rows = await p.$$eval('td', els => els.map(e => e.textContent));
check('8 eliminato', !rows.some(r => r?.includes(COMPANY)), rows.join(' | '));

await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
