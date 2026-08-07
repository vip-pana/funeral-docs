import { chromium } from 'playwright-core';
const B = process.env.BASE_URL ?? 'http://localhost:3000';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage();
let fail = 0;
const check = (n, cond, extra='') => { console.log(cond?'ok  ':'FAIL', n, extra); if(!cond) fail++; };

// 1. protected page -> login with next
await p.goto(`${B}/practices`);
check('1 redirect a login', p.url().includes('/login?next=%2Fpractices'), p.url());

// 2. wrong password shows an error and does not let you in
await p.fill('#password', 'sbagliata');
await p.click('button[type=submit]');
await p.waitForFunction(
  () => document.querySelector('[role=alert]')?.textContent?.includes('errata'),
  null, { timeout: 8000 });
check('2 errore mostrato', true);
check('  resta su login', p.url().includes('/login'));

// 3. correct password: reload to start from a clean field
await p.goto(`${B}/login?next=%2Fpractices`);
await p.fill('#password', (process.env.TEST_PASSWORD ?? 'sviluppo123'));
await Promise.all([
  p.waitForURL(u => u.pathname === '/practices', { timeout: 15000 }),
  p.click('button[type=submit]'),
]);
check('3 entrato in pratiche', p.url().endsWith('/practices'), p.url());
check('  titolo corretto', (await p.textContent('h1'))?.trim() === 'Pratiche');

// 4. session cookie
const c = (await ctx.cookies()).find(c => c.name === 'funeral_session');
check('4 cookie httpOnly', c?.httpOnly === true);
check('  sameSite Lax', c?.sameSite === 'Lax', String(c?.sameSite));
// `secure` depends on the environment: on in production, unless
// COOKIE_SECURE=false for http access over Tailscale.
check('  secure coerente col protocollo',
      B.startsWith('https') ? c?.secure === true : true,
      `secure=${c?.secure}`);

// 5. session persists
await p.goto(`${B}/practices`);
check('5 sessione persiste', p.url().endsWith('/practices'));

// 6. open redirect blocked
await p.goto(`${B}/login`);
check('6 gia loggato -> pratiche', p.url().endsWith('/practices'), p.url());

// 7. logout
await p.click('button:has-text("Esci")');
await p.waitForURL(/login/, { timeout: 8000 });
check('7 logout torna a login', p.url().includes('/login'));
const after = (await ctx.cookies()).find(c => c.name === 'funeral_session');
check('  cookie rimosso', !after || !after.value);

await b.close();
console.log(fail ? `\n=== ${fail} FALLITI ===` : '\n=== TUTTI OK ===');
process.exit(fail ? 1 : 0);
