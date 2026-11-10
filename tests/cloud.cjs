// בדיקת סנכרון אמיתית מול Supabase, בשני "מכשירים". דורשת משתמש בדיקה:
// MP_EMAIL=... MP_PW=... node tests/cloud.cjs (אחרי npm run build). לא רצה ב-npm test.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const BASE = 'http://localhost:4199/';
const MENU = fs.readFileSync(__dirname + '/ai-menu.js', 'utf8');
const { MP_EMAIL, MP_PW } = process.env;
const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails.push(msg); };

(async () => {
  if (!MP_EMAIL || !MP_PW) { console.log('חסרים MP_EMAIL ו-MP_PW'); process.exit(2); }
  const srv = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch();
  const device = async () => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    await p.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
    p.on('pageerror', (e) => fails.push('JS: ' + e.message));
    return p;
  };
  const login = async (p, pw = MP_PW) => {
    await p.getByRole('button', { name: 'כניסה לספרייה בענן' }).first().click();
    await p.locator('#login-email').fill(MP_EMAIL);
    await p.locator('#login-pw').fill(pw);
    await p.locator('.login button[type=submit]').click();
  };
  const synced = (p) => p.locator('.saved', { hasText: 'שמור בענן' }).waitFor({ timeout: 30000 });
  try {
    // מכשיר א: שיר מקומי עם קובץ שמע, ואז כניסה
    const A = await device();
    await A.goto(BASE + '#/create?preset=p-walk', { waitUntil: 'networkidle' });
    await A.getByRole('button', { name: 'שמירה בספרייה' }).click();
    await A.getByRole('button', { name: 'מעבר לספרייה' }).click();
    await A.locator('.player input[type=file]').setInputFiles({ name: 'song.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from([0xff, 0xfb, 0x90, 0x00, 1, 2, 3, 4]) });
    await A.locator('audio.audio').waitFor();
    await login(A, 'wrong-password-1');
    await A.locator('.login .msg-problem').waitFor({ timeout: 15000 });
    ok((await A.locator('.login .msg-problem').innerText()).includes('לא נכונים'), 'סיסמה שגויה: הודעה ברורה');
    await A.locator('#login-pw').fill(MP_PW);
    ok(await A.locator('#login-pw').getAttribute('type') === 'password', 'הסיסמה מוסתרת כברירת מחדל');
    await A.locator('.login .pw button').click();
    ok(await A.locator('#login-pw').getAttribute('type') === 'text', 'הצגת סיסמה');
    await A.locator('.login button[type=submit]').click();
    await synced(A);
    ok(await A.locator('.l-cloud').innerText().then((t) => t.includes('שמור בענן')), 'מכשיר א: הספרייה המקומית עלתה לענן');

    // מכשיר ב: ספרייה ריקה, כניסה, והשיר מגיע עם הקובץ
    const B = await device();
    await B.goto(BASE + '#/library', { waitUntil: 'networkidle' });
    ok(await B.getByText('הספרייה עוד ריקה.').isVisible(), 'מכשיר ב: מתחיל ריק');
    await login(B);
    await B.locator('.l-item').first().waitFor({ timeout: 30000 });
    ok(await B.locator('.l-item').count() === 1, 'מכשיר ב: השיר הגיע מהענן');
    await B.locator('audio.audio').waitFor({ timeout: 30000 });
    const size = await B.evaluate(async () => (await (await fetch(document.querySelector('audio.audio').src)).arrayBuffer()).byteLength);
    ok(size === 8, 'מכשיר ב: קובץ השמע ירד מהענן בשלמותו (' + size + ' בתים)');
    await B.getByRole('button', { name: 'סימון כאהוב' }).click();
    await B.waitForTimeout(2500);

    // חזרה למכשיר א: השינוי מגיע אחרי רענון, והסשן נשמר
    await A.reload({ waitUntil: 'networkidle' });
    await A.locator('.l-item .t-loved').waitFor({ timeout: 30000 }).catch(() => {});
    ok(await A.locator('.l-item .t-loved').count() === 1, 'מכשיר א: "אהבתי" ממכשיר ב הגיע, והכניסה נשמרה אחרי רענון');

    // מחיקה במכשיר א נעלמת במכשיר ב
    await A.getByRole('button', { name: 'מחיקה', exact: true }).click();
    await A.getByRole('button', { name: 'כן, מחיקה' }).click();
    await A.getByText('הספרייה עוד ריקה.').waitFor();
    await A.waitForTimeout(2500);
    await B.reload({ waitUntil: 'networkidle' });
    await B.getByText('הספרייה עוד ריקה.').waitFor({ timeout: 30000 }).catch(() => {});
    ok(await B.getByText('הספרייה עוד ריקה.').isVisible(), 'מכשיר ב: מחיקה ממכשיר א הגיעה');

    // יציאה: שיר שנוצר אחרי הכניסה יורד מהמכשיר ונשאר בענן
    await B.goto(BASE + '#/create?preset=p-night', { waitUntil: 'networkidle' });
    await B.getByRole('button', { name: 'שמירה בספרייה' }).click();
    await B.waitForTimeout(2500);
    await B.evaluate(() => document.querySelector('ai-menu').items.find((i) => i.label.startsWith('יציאה')).onSelect());
    await B.locator('.tabs').getByRole('button', { name: 'ספרייה' }).click();
    await B.getByText('הספרייה עוד ריקה.').waitFor({ timeout: 15000 }).catch(() => {});
    ok(await B.getByText('הספרייה עוד ריקה.').isVisible(), 'יציאה: מה שבענן יורד מהמכשיר');
    await login(B);
    await B.locator('.l-item').first().waitFor({ timeout: 30000 }).catch(() => {});
    ok(await B.locator('.l-item').count() === 1, 'כניסה מחדש: השיר חוזר מהענן');
    await B.getByRole('button', { name: 'מחיקה', exact: true }).click();
    await B.getByRole('button', { name: 'כן, מחיקה' }).click();
    await B.waitForTimeout(2500);
  } finally { await b.close(); srv.kill(); }
  console.log(fails.length ? `\n${fails.length} נכשלו: ${fails.join(' | ')}` : '\nהכול עבר');
  process.exit(fails.length ? 1 : 0);
})();
