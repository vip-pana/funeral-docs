import { chromium } from 'playwright-core';
import { pickComune } from './helpers.mjs';
const B = process.env.BASE_URL ?? 'http://localhost:3000';
const PW = process.env.TEST_PASSWORD ?? 'sviluppo123';
const b = await chromium.launch({ channel:'chrome' });
const p = await (await b.newContext()).newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,160)));
let fail=0; const check=(n,c,x='')=>{console.log(c?'ok  ':'FAIL',n,x); if(!c)fail++;};

await p.goto(`${B}/login`);
await p.fill('#password', PW);
await Promise.all([p.waitForURL(/deceased/,{timeout:15000}), p.click('button[type=submit]')]);

// --- comuni API ---
let r = await p.request.get(`${B}/api/municipalities?q=fogg`);
let j = await r.json();
check('1 ricerca comuni', r.ok() && j.some(c=>c.nome==='Foggia'), `${j.length} risultati`);

r = await p.request.get(`${B}/api/municipalities?codice=D643`);
j = await r.json();
check('2 codice catastale -> comune', r.ok() && j.nome==='Foggia' && j.provincia==='FG', JSON.stringify(j));

r = await p.request.get(`${B}/api/municipalities?codice=ZZZZ`);
check('3 codice ignoto -> 404', r.status()===404, String(r.status()));

r = await p.request.get(`${B}/api/municipalities?q=f`);
check('4 query troppo corta -> vuoto', (await r.json()).length===0);

// --- stati esteri, accanto ai comuni ---
r = await p.request.get(`${B}/api/municipalities?q=germania`);
j = await r.json();
// Il nome esatto vince sul prefisso: Germagnano e Germignaga restano sotto.
check('4a stato estero in testa', r.ok() && j[0]?.nome==='Germania' && j[0]?.provincia==='EE',
      j.slice(0,3).map(c=>c.nome).join(', '));

r = await p.request.get(`${B}/api/municipalities?codice=Z112`);
j = await r.json();
check('4b codice estero -> stato', r.ok() && j.nome==='Germania' && j.provincia==='EE', JSON.stringify(j));

// Gli stati cessati restano cercabili: chi e' nato in Iugoslavia ha quel codice
// stampato sulla tessera sanitaria.
r = await p.request.get(`${B}/api/municipalities?codice=Z118`);
j = await r.json();
check('4c stato cessato risolto', r.ok() && j.storico===true, JSON.stringify(j));

// --- autofill from the tax code ---
await p.goto(`${B}/deceased/new`);
await p.fill('#personTaxCode','RSSMRA40C12D643D');
await p.locator('#personLastName').focus();
// The municipality comes from an /api/municipalities call: wait for the value.
await p.waitForFunction(
  () => document.querySelector('input[name=personBirthCity]')?.value === 'Foggia',
  null, { timeout: 8000 }).catch(()=>{});
check('5 data nascita dal CF', await p.inputValue('#personBirthDate')==='1940-03-12');
check('6 comune nascita dal CF',
      await p.getAttribute('input[name=personBirthCity]','value')==='Foggia',
      await p.getAttribute('input[name=personBirthCity]','value'));

// --- province from the chosen municipality ---
await pickComune(p, 'destinationCity', 'Milano');
await p.waitForTimeout(400);
check('7 provincia da destinazione', await p.inputValue('#destinationProvince')==='MI',
      await p.inputValue('#destinationProvince'));

// --- destinazione estera: la sigla diventa EE ---
// Da una scheda nuova: riusare lo stesso campo mostrerebbe ancora i risultati
// di Milano finche' il debounce non scade, e il primo click prenderebbe quelli.
await p.goto(`${B}/deceased/new`);
await pickComune(p, 'destinationCity', 'Romania');
await p.waitForTimeout(400);
check('7a provincia EE per destinazione estera',
      await p.inputValue('#destinationProvince')==='EE',
      await p.inputValue('#destinationProvince'));

// --- nato all'estero: il CF precompila il paese di nascita ---
await p.goto(`${B}/deceased/new`);
await p.fill('#personTaxCode','RSSMRA40C12Z112F');
await p.locator('#personLastName').focus();
await p.waitForFunction(
  () => document.querySelector('input[name=personBirthCity]')?.value === 'Germania',
  null, { timeout: 8000 }).catch(()=>{});
check('9 paese di nascita dal CF estero',
      await p.getAttribute('input[name=personBirthCity]','value')==='Germania',
      await p.getAttribute('input[name=personBirthCity]','value'));

// --- the field stays free-form ---
await p.goto(`${B}/deceased/new`);
await pickComune(p, 'personResidenceCity', 'Borgo Inventato');
check('8 comune libero accettato',
      await p.getAttribute('input[name=personResidenceCity]','value')==='Borgo Inventato',
      await p.getAttribute('input[name=personResidenceCity]','value'));

await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
