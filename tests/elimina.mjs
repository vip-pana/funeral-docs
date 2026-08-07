import { chromium } from 'playwright-core';
import { fillPractice } from './helpers.mjs';
const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({channel:'chrome'});
const p = await (await b.newContext()).newPage();
let fail=0; const check=(n,c,x='')=>{console.log(c?'ok  ':'FAIL',n,x); if(!c)fail++;};

await p.goto(`${B}/login`);
await p.fill('#password',(process.env.TEST_PASSWORD ?? 'sviluppo123'));
await Promise.all([p.waitForURL(/deceased/,{timeout:15000}), p.click('button[type=submit]')]);

// create a throwaway practice
await p.goto(`${B}/deceased/new`);
const v={personFirstName:'Elimina',personLastName:'Prova',personTaxCode:'RSSMRA40C12D643D',
 personBirthDate:'1940-03-12',personBirthCity:'Foggia',personResidenceCity:'San Severo',
 personResidenceAddress:'Via X',personDeathDate:'2026-08-01',personDeathTime:'10:00',
 personDeathCity:'San Severo',personDeathPlace:'Ospedale',transportDate:'2026-08-03',
 transportTime:'08:00',transportPermitDate:'2026-08-02',destinationCity:'Foggia',destinationCemetery:'Comunale'};
await fillPractice(p, v);
await Promise.all([p.waitForURL(/\/deceased\/\d+$/,{timeout:15000}), p.click('button:has-text("Crea scheda")')]);
const id = p.url().match(/(\d+)$/)[1];

// first click: asks for confirmation, does not delete
await p.click('button:has-text("Elimina")');
await p.waitForTimeout(400);
check('1 chiede conferma', await p.isVisible('button:has-text("Confermi")'));
check('  ancora sulla scheda', p.url().endsWith(id));

// cancel
await p.click('button:has-text("Annulla")');
await p.waitForTimeout(300);
check('2 annulla ripristina', await p.isVisible('button:has-text("Elimina")'));

// confirm
await p.click('button:has-text("Elimina")');
await Promise.all([
  p.waitForURL(u => u.pathname === '/deceased', {timeout:15000}),
  p.click('button:has-text("Confermi")'),
]);
check('3 eliminata, torna a elenco', p.url().endsWith('/deceased'));
check('  sparita dall elenco', !(await p.textContent('body')).includes('Elimina Prova'));

// the page no longer exists
const r = await p.request.get(`${B}/deceased/${id}`);
check('4 pagina -> 404', r.status()===404, String(r.status()));

await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
