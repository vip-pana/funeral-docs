import { chromium } from 'playwright-core';
import { fillPractice } from './helpers.mjs';
const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel:'chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto(`${B}/login`);
await p.fill('#password',(process.env.TEST_PASSWORD ?? 'sviluppo123'));
await Promise.all([p.waitForURL(/deceased/,{timeout:15000}), p.click('button[type=submit]')]);

let fail=0; const check=(n,c,x='')=>{console.log(c?'ok  ':'FAIL',n,x); if(!c)fail++;};

// The suite creates the practice it needs: depending on an existing id would
// make it sensitive to execution order and to database state.
await p.goto(`${B}/deceased/new`);
const seed = {personFirstName:'Api',personLastName:'Prova',personTaxCode:'RSSMRA40C12D643D',
 personBirthDate:'1940-03-12',personBirthCity:'Foggia',personResidenceCity:'San Severo',
 personResidenceAddress:'Via X',personDeathDate:'2026-08-01',personDeathTime:'10:00',
 personDeathCity:'San Severo',personDeathPlace:'Ospedale',transportDate:'2026-08-03',
 transportTime:'08:00',transportPermitDate:'2026-08-02',destinationCity:'Foggia',destinationCemetery:'Comunale'};
await fillPractice(p, seed);
await Promise.all([p.waitForURL(/\/deceased\/\d+$/,{timeout:15000}),
                   p.click('button:has-text("Crea scheda")')]);
const ID = p.url().match(/(\d+)$/)[1];
const call = async (u) => {
  const r = await p.request.get(`${B}${u}`);
  return { status: r.status(), type: r.headers()['content-type'], body: await r.text().catch(()=>'')};
};

let r = await call('/api/deceased/99999/generate');
check('defunto inesistente -> 404', r.status===404, String(r.status));

r = await call('/api/deceased/abc/generate');
check('id non numerico -> 400', r.status===400, String(r.status));

r = await call(`/api/deceased/${ID}/generate?doc=9`);
check('documento inesistente -> 400', r.status===400, String(r.status));

r = await call(`/api/deceased/${ID}/generate?doc=2`);
check('doc singolo -> docx', r.status===200 && r.type?.includes('wordprocessingml'), `${r.status} ${r.type?.slice(0,40)}`);

r = await call(`/api/deceased/${ID}/generate`);
check('nessun doc -> primo documento', r.status===200 && r.type?.includes('wordprocessingml'),
      `${r.status} ${r.type?.slice(0,40)}`);

// clean up after itself
await p.goto(`${B}/deceased/${ID}`);
await p.click('button:has-text("Elimina")');
await Promise.all([p.waitForURL(u=>u.pathname==='/deceased',{timeout:15000}),
                   p.click('button:has-text("Confermi")')]);

await b.close();
console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
process.exit(fail?1:0);
