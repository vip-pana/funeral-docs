import { chromium } from 'playwright-core';
import { pickComune } from './helpers.mjs';
const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel:'chrome' });
try {
  const p = await (await b.newContext({viewport:{width:1280,height:940}})).newPage();
  p.on('pageerror', e=>console.log('  [pageerror]', e.message.slice(0,160)));
  let fail=0; const ck=(n,c,x='')=>{console.log(c?'ok  ':'FAIL',n,x); if(!c)fail++;};

  await p.goto(`${B}/login`);
  await p.fill('#password', process.env.TEST_PASSWORD ?? 'sviluppo123');
  await Promise.all([p.waitForURL(/pratiche/,{timeout:15000}), p.click('button[type=submit]')]);
  await p.goto(`${B}/pratiche/nuova`);
  await p.waitForTimeout(900);

  const btn = p.locator('button:has-text("Calcola")');
  ck('1 pulsante presente', await btn.isVisible());
  ck('  spento senza dati', await btn.isDisabled());

  await p.fill('#personFirstName','Mario');
  await p.fill('#personLastName','Rossi');
  await p.fill('#personBirthDate','1940-03-12');
  await p.waitForTimeout(300);
  ck('2 ancora spento senza comune', await btn.isDisabled());

  // pick the municipality from the list
  await p.click('#personBirthCity');
  await p.waitForTimeout(400);
  await p.fill('[cmdk-input]','Foggia');
  await p.waitForTimeout(1000);
  await p.click('[cmdk-item]');
  await p.waitForTimeout(600);
  ck('3 acceso con tutti i dati', await btn.isEnabled());

  // must NOT have computed on its own
  ck('4 CF ancora vuoto (nessun calcolo automatico)', (await p.inputValue('#personTaxCode'))==='' ,
     await p.inputValue('#personTaxCode'));

  await btn.click();
  await p.waitForTimeout(700);
  ck('5 calcolo su richiesta', (await p.inputValue('#personTaxCode'))==='RSSMRA40C12D643D',
     await p.inputValue('#personTaxCode'));

  // female -> different code
  await p.click('#personSex'); await p.waitForTimeout(300);
  await p.click('[role=option]:has-text("Femminile")'); await p.waitForTimeout(400);
  await btn.click(); await p.waitForTimeout(600);
  const f = await p.inputValue('#personTaxCode');
  ck('6 donna: giorno +40', f.slice(9,11)==='52', f);

  // --- reopened practice: the cadastral code is not in memory ---
  await p.fill('#personFirstName','Giuseppe');
  await p.fill('#personLastName','Verdi');
  await p.fill('#personDeathDate','2026-08-01');
  await p.fill('#personDeathTime','10:00');
  await p.fill('#personDeathPlace','Ospedale');
  await p.fill('#personResidenceAddress','Via X');
  await p.fill('#transportDate','2026-08-03');
  await p.fill('#transportTime','08:00');
  await p.fill('#transportPermitDate','2026-08-02');
  await p.fill('#destinationCemetery','Comunale');
  await pickComune(p,'personResidenceCity','San Severo');
  await pickComune(p,'personDeathCity','San Severo');
  await pickComune(p,'destinationCity','Foggia');
  await Promise.all([p.waitForURL(/\/pratiche\/\d+$/,{timeout:20000}),
                     p.click('button:has-text("Crea pratica")')]);
  await p.reload();
  await p.waitForTimeout(900);

  const btn2 = p.locator('button:has-text("Calcola")');
  ck('7 acceso su pratica riaperta', await btn2.isEnabled());
  await p.fill('#personTaxCode','');
  await p.waitForTimeout(200);
  await btn2.click();
  await p.waitForTimeout(1200);
  ck('  calcola risalendo dal nome del comune',
     (await p.inputValue('#personTaxCode')).length===16,
     await p.inputValue('#personTaxCode'));

  // cleanup
  await p.click('button:has-text("Elimina")');
  await Promise.all([p.waitForURL(u=>u.pathname==='/pratiche',{timeout:15000}),
                     p.click('button:has-text("Confermi")')]);

  console.log(fail?`\n=== ${fail} FALLITI ===`:'\n=== TUTTI OK ===');
  if (fail) process.exitCode = 1;
} finally { await b.close(); }
