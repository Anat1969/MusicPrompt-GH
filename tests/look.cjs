// צילום מהיר של דף הבית (שלושה מסכים) ושל הספרייה עם מסגרות: node tests/look.cjs [width height]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const BASE = 'http://localhost:4199/';
const MENU = fs.readFileSync(__dirname + '/ai-menu.js', 'utf8');
const [w, h] = [Number(process.argv[2]) || 1440, Number(process.argv[3]) || 900];
const SEED = [
  { id: 's1', createdAt: Date.now() - 86400000 * 2, title: 'בוקר על הים', style: 'ambient fused with classical orchestral, calm, peaceful, very slow tempo, 60 BPM, instrumental, no vocals, featuring piano, string section', styleHe: 'אמביינט בשילוב קלאסי, רגוע, איטי מאוד, 60 פעימות בדקה, כלים בלבד, בלי שירה, עם פסנתר, כלי קשת', lyrics: '', exclude: 'vocals', desc: 'בוקר שקט מול הים של אשדוד', sel: { genre: ['ambient', 'classical'], mood: ['calm'], tempo: ['t60'], voice: ['instrumental'], inst: ['piano', 'strings'] }, sunoUrl: 'https://suno.com/song/abc', loved: true, audioName: '', engine: 'gemini', note: 'תרגמתי את הים לצלילים ארוכים ורכים.' },
  { id: 's2', createdAt: Date.now() - 86400000 * 5, title: 'הליכה בטיילת', style: 'Mediterranean, uplifting, steady walking pace, 110 BPM, female vocals singing in Hebrew, featuring oud, acoustic guitar', lyrics: '[Verse 1]\nהרוח מהים\n\n[Chorus]', exclude: '', desc: '', sel: { genre: ['med'], mood: ['uplifting'], tempo: ['t110'], voice: ['female'], inst: ['oud', 'acoustic'], lang: ['he'] }, sunoUrl: '', loved: true, audioName: '', engine: 'local' },
];
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
    await p.reload({ waitUntil: 'networkidle' });
    for (const [i, id] of ['open', 'staff', 'inside'].entries()) {
      await p.evaluate((id) => document.querySelector(`[data-screen="${id}"]`).scrollIntoView(), id); await p.waitForTimeout(250);
      await p.screenshot({ path: `${__dirname}/shots/home${i + 1}-${w}.png` });
    }
    await p.goto(BASE + '#/library?id=s1', { waitUntil: 'networkidle' });
    await p.screenshot({ path: `${__dirname}/shots/lib-prompt-${w}.png` });
    const png = await p.screenshot({ clip: { x: 200, y: 200, width: 300, height: 300 } });
    await p.locator('.frame[data-kind=building] input[type=file]').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
    await p.locator('.d-strip').getByRole('button', { name: 'העתקת פרומפט' }).nth(1).click();
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${__dirname}/shots/lib-visual-${w}.png` });
  } finally { await b.close(); srv.kill(); }
})();
