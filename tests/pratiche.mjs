import { chromium } from 'playwright-core';
import fs from 'node:fs';
import JSZip from 'jszip';
import { fillPractice, pickSelect, SEED_CLIENT } from './helpers.mjs';

const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0,150)));
let fail = 0;
const check = (n,c,x='') => { console.log(c?'ok  ':'FAIL', n, x); if(!c) fail++; };

// login
await p.goto(`${B}/login`);
await p.fill('#password',(process.env.TEST_PASSWORD ?? 'sviluppo123'));
await Promise.all([p.waitForURL(/deceased/,{timeout:15000}), p.click('button[type=submit]')]);

// --- new practice ---
await p.goto(`${B}/deceased/new`);
check('1 form nuovo defunto', (await p.textContent('h1'))?.includes('Nuovo defunto'));

// autofill from the tax code: type it, then move the focus away
await p.fill('#personTaxCode','RSSMRA40C12D643D');
await p.locator('#personLastName').focus();
await p.waitForTimeout(600);
check('2 data nascita da CF', await p.inputValue('#personBirthDate') === '1940-03-12',
      await p.inputValue('#personBirthDate'));

// fill in the rest
const v = {
  personFirstName:'Mario', personLastName:'Rossi',
  personBirthCity:'Foggia', personResidenceCity:'San Severo',
  personResidenceAddress:'Via Roma 15',
  personDeathDate:'2026-08-04', personDeathTime:'14:30',
  personDeathCity:'San Severo', personDeathPlace:'Ospedale Masselli',
  transportDate:'2026-08-06', transportTime:'09:00', transportPermitDate:'2026-08-05',
  funeralChurch:'Chiesa San Severino',
  destinationCity:'Foggia',
  destinationCemetery:'Cimitero Comunale',
};
// The client is required, and fillPractice picks it: without one the form does
// not save at all, so this is checked before the optional hearse and driver.
await fillPractice(p, v);
const hasClient = await p.$eval('#clientId', el => (el.textContent ?? '').trim());
check('3a cliente selezionato', hasClient.includes(SEED_CLIENT), hasClient);
// Hearse and driver are left behind by veicoli.mjs and conducenti.mjs, which
// run first: without them plate and name would not reach the document and the
// checks below would be pointless.
const hasVehicle = await pickSelect(p, 'vehicleId', 'FG123AB');
const hasDriver = await pickSelect(p, 'driverId', 'Giuseppe Verdi');
await Promise.all([
  p.waitForURL(/\/deceased\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, { timeout: 15000 }),
  p.click('button:has-text("Crea scheda")'),
]);
check('3b autofunebre selezionata', hasVehicle, hasVehicle ? '' : 'nessun veicolo in elenco');
check('3c conducente selezionato', hasDriver, hasDriver ? '' : 'nessun conducente in elenco');
const url = p.url();
check('3 creata e aperta', /\/deceased\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(url), url);
check('  intestazione', (await p.textContent('h1'))?.includes('Rossi'));

// normalised province
check('4 provincia dal comune', await p.inputValue('#destinationProvince') === 'FG',
      await p.inputValue('#destinationProvince'));

// --- single download ---
const id = url.match(/\/deceased\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/)[1];
// Scoped to id^=doc-, not every checkbox on the page: the form has its own for
// the bearers. Counted rather than hardcoded, so adding a template does not
// break this test.
const docBoxes = p.locator('[role=checkbox][id^=doc-]');
const nDocs = await docBoxes.count();
await docBoxes.nth(0).check();
for (let i=1;i<nDocs;i++) await docBoxes.nth(i).uncheck();
const [d1] = await Promise.all([
  p.waitForEvent('download', {timeout:20000}),
  p.click('button:has-text("Scarica")'),
]);
const f1 = `/tmp/dl_${d1.suggestedFilename()}`;
await d1.saveAs(f1);
check('5 docx singolo', d1.suggestedFilename().endsWith('.docx'), d1.suggestedFilename());

// content: is the real data in there?
const z1 = await JSZip.loadAsync(fs.readFileSync(f1));
const xml = await z1.file('word/document.xml').async('string');
const txt = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join('');
check('6 nome nel documento', txt.includes('Mario') && txt.includes('Rossi'));
check('  data italiana', txt.includes('12/03/1940'), txt.match(/\d{2}\/\d{2}\/\d{4}/g)?.slice(0,3).join(' '));
// doc 1 is the Mayor's act: by design it carries no company data
check('  nessun placeholder', !txt.match(/\{[^}]*\}/));

// --- multiple download: N separate files, not one zip ---
const got = [];
p.on('download', d => got.push(d));
for (let i=0;i<nDocs;i++) await docBoxes.nth(i).check();
await p.waitForTimeout(300);
await p.click('button:has-text("Scarica")');
for (let i=0; i<60 && got.length<nDocs; i++) await p.waitForTimeout(250);

check(`7 ${nDocs} download separati`, got.length===nDocs, `${got.length}/${nDocs}`);
const names = got.map(d=>d.suggestedFilename());
check('  tutti .docx', names.every(n=>n.endsWith('.docx')));
check('  nessuno zip', !names.some(n=>n.endsWith('.zip')));
check('  nomi distinti', new Set(names).size===names.length);

// document 4 uses every company field
const d4 = got.find(d=>d.suggestedFilename().endsWith('_4.docx'));
const f4 = `/tmp/dl_${d4.suggestedFilename()}`;
await d4.saveAs(f4);
const z4 = await JSZip.loadAsync(fs.readFileSync(f4));
const t4 = [...(await z4.file('word/document.xml').async('string'))
  .matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join('');
// Read live from the client picked above, not copied onto the record.
check('  doc4 dati ditta', t4.includes(SEED_CLIENT), SEED_CLIENT);
check('  doc4 targa autofunebre', t4.includes('FG123AB'), t4.match(/[A-Z]{2}\d{3}[A-Z]{2}/)?.[0] ?? 'assente');
check('  doc4 conducente', t4.includes('Giuseppe Verdi'), '');
check('  doc4 codice fiscale', t4.includes('RSSMRA40C12D643D'));
check('  doc4 nessun placeholder', !t4.match(/\{[^}]*\}/));

// --- editing ---
await p.fill('#personDeathPlace','Abitazione');
await p.click('button:has-text("Salva modifiche")');
await p.waitForFunction(()=>[...document.querySelectorAll('[data-sonner-toast]')]
  .some(t=>t.textContent?.includes('aggiornato')), null, {timeout:12000});
await p.reload();
check('8 modifica persiste', await p.inputValue('#personDeathPlace') === 'Abitazione');

// --- list ---
await p.goto(`${B}/deceased`);
check('9 compare in elenco', (await p.textContent('body')).includes('Rossi'));

// --- validation ---
await p.goto(`${B}/deceased/new`);
await p.click('button:has-text("Crea scheda")');
await p.waitForFunction(()=>document.querySelectorAll('[role=alert]').length>3,null,{timeout:12000});
check('10 validazione blocca vuoto', true);
check('  resta su nuova', p.url().includes('/deceased/new'));

// invalid tax code rejected
await p.fill('#personTaxCode','ABC');
await p.locator('#personFirstName').focus();
await p.waitForTimeout(400);
check('11 CF invalido non compila', await p.inputValue('#personBirthDate') === '');

// Clean up the practice created here: otherwise every run leaves one behind
// and the list fills with identical duplicates.
await p.goto(`${B}/deceased/${id}`);
await p.click('button:has-text("Elimina")');
await Promise.all([p.waitForURL(u=>u.pathname==='/deceased',{timeout:15000}),
                   p.click('button:has-text("Confermi")')]);

await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
