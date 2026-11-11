// צילום היצירה והספרייה בגודל נתון, ומדידת גלישה: node tests/audit.cjs [width height]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const BASE = 'http://localhost:4199/';
const MENU = fs.readFileSync(__dirname + '/ai-menu.js', 'utf8');
const [w, h] = [Number(process.argv[2]) || 1865, Number(process.argv[3]) || 1160];
const SEED = [{ id: 's1', createdAt: Date.now() - 86400000 * 2, title: 'בוקר על הים', style: 'ambient fused with classical orchestral, calm, peaceful, very slow tempo, 60 BPM, instrumental, no vocals, featuring piano, string section', styleHe: 'אמביינט בשילוב קלאסי, רגוע, איטי מאוד, 60 פעימות בדקה, כלים בלבד, בלי שירה, עם פסנתר, כלי קשת', lyrics: '', exclude: 'vocals', desc: 'בוקר שקט מול הים של אשדוד', sel: { genre: ['ambient', 'classical'], mood: ['calm'], tempo: ['t60'], voice: ['instrumental'], inst: ['piano', 'strings'] }, sunoUrl: '', loved: true, audioName: '', engine: 'gemini', note: 'תרגמתי את הים לצלילים ארוכים ורכים.' }];
(async () => {
  fs.mkdirSync(__dirname + '/shots', { recursive: true });
  const srv = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await p.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
    await p.goto(BASE, { waitUntil: 'networkidle' });
    await p.evaluate((s) => localStorage.setItem('musicprompt.library.v1', JSON.stringify(s)), SEED);
    for (const [name, hash] of [['lib', '#/library?id=s1'], ['create', '#/create?s=1'], ['create-all', '#/create?v=all']]) {
      await p.goto(BASE + hash, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight, z: getComputedStyle(document.documentElement).getPropertyValue('--z') }));
      if (name === 'create') { await p.locator('.opt').nth(0).click(); await p.locator('.opt-add').nth(1).click(); await p.waitForTimeout(300); }
      console.log(name, JSON.stringify(m));
      await p.screenshot({ path: `${__dirname}/shots/a-${name}-${w}.png` });
    }
  } finally { await b.close(); srv.kill(); }
})();
