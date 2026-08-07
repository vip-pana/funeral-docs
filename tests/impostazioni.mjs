import { chromium } from 'playwright-core';
const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,150)));
let fail = 0;
const check = (n, c, x='') => { console.log(c?'ok  ':'FAIL', n, x); if(!c) fail++; };

await p.goto(`${B}/login`);
await p.fill('#password',(process.env.TEST_PASSWORD ?? 'sviluppo123'));
await Promise.all([p.waitForURL(/practices/,{timeout:15000}), p.click('button[type=submit]')]);

await p.goto(`${B}/settings`);
check('1 pagina aperta', (await p.textContent('h1'))?.includes('Impostazioni'));

// Submit with empty fields. They have to be cleared by hand: if the company is
// already configured the form arrives prefilled and the submit would be valid.
// Scoped to this form only: the Autofunebri and Conducenti cards have their own
// fields, which "Salva impostazioni" does not touch.
const ownerForm = 'form:has(button:has-text("Salva impostazioni"))';
for (const el of await p.$$(`${ownerForm} input:not([type=hidden])`)) await el.fill('');
await p.click('button:has-text("Salva impostazioni")');
await p.waitForFunction(()=>document.querySelectorAll('[role=alert]').length>0,null,{timeout:12000});
await p.waitForTimeout(500);
const nErr = await p.$$eval('[role=alert]', e=>e.length);
const invalid = await p.$$eval('[aria-invalid="true"]', e=>e.length);
check('2 validazione blocca vuoto', nErr >= 4, `${nErr} alert, ${invalid} campi invalidi`);

// fill everything in
const vals = {
  ownerFirstName:'Mario', ownerMiddleName:'F.', ownerLastName:'Rossi',
  ownerCompanyName:'OO.FF. Rossi Mario', ownerCompanyCity:'San Severo',
  ownerCity:'San Severo', ownerCityName:'San Severo',
};
for (const [k,v] of Object.entries(vals)) await p.fill(`#${k}`, v);
await p.click('button:has-text("Salva impostazioni")');
await p.waitForFunction(
  () => [...document.querySelectorAll('[data-sonner-toast]')]
          .some(t => t.textContent?.includes('salvate')),
  null, { timeout: 12000 });
check('3 toast di conferma', true);

// reload: the values persist
await p.reload();
check('4 nome persiste', await p.inputValue('#ownerFirstName') === 'Mario');
check('  ragione sociale', (await p.inputValue('#ownerCompanyName')).includes('Rossi'));
await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
