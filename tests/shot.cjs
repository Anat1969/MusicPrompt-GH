// צילומי מסך לבדיקה בעין: node tests/shot.cjs (אחרי npm run build)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const BASE = 'http://localhost:4199/';
const MENU = fs.readFileSync(__dirname + '/ai-menu.js', 'utf8');
const SEED = [
  { id: 's1', createdAt: Date.now() - 86400000 * 2, title: 'בוקר על הים', style: 'ambient fused with classical orchestral, calm, peaceful, very slow tempo, 60 BPM, instrumental, no vocals, featuring piano, string section', lyrics: '', exclude: 'vocals', desc: 'בוקר שקט מול הים של אשדוד', sel: { genre: ['ambient', 'classical'], mood: ['calm'], tempo: ['t60'], voice: ['instrumental'], inst: ['piano', 'strings'] }, sunoUrl: 'https://suno.com/song/abc', loved: true, audioName: '', engine: 'gemini' },
  { id: 's2', createdAt: Date.now() - 86400000 * 5, title: 'הליכה בטיילת', style: 'Mediterranean, uplifting, steady walking pace, 110 BPM, female vocals singing in Hebrew, featuring oud, acoustic guitar', lyrics: '[Verse 1]\nהרוח מהים\n\n[Chorus]', exclude: '', desc: '', sel: { genre: ['med'], mood: ['uplifting'], tempo: ['t110'], voice: ['female'], inst: ['oud', 'acoustic'], lang: ['he'] }, sunoUrl: '', loved: true, audioName: '', engine: 'local' },
  { id: 's3', createdAt: Date.now() - 86400000 * 40, title: 'מועדון קטן', style: 'jazz, intimate, warm, slow tempo, 80 BPM, male vocals singing in English, featuring saxophone, piano', lyrics: '[Verse 1]', exclude: '', desc: '', sel: { genre: ['jazz'], mood: ['intimate'], tempo: ['t80'], voice: ['male'], inst: ['sax', 'piano'], lang: ['en'] }, sunoUrl: '', loved: false, audioName: '', engine: 'local' },
];
(async () => {
  fs.mkdirSync(__dirname + '/shots', { recursive: true });
  const srv = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      const ctx = await b.newContext({ viewport: vp, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      await p.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
      const shot = async (name) => p.screenshot({ path: `${__dirname}/shots/${name}-${vp.width}.png`, fullPage: vp.width < 500 });
      await p.goto(BASE, { waitUntil: 'networkidle' }); await shot('home-empty');
      await p.goto(BASE + '#/create?preset=p-walk', { waitUntil: 'networkidle' });
      await p.locator('#desc').fill('הליכה בטיילת בשעת שקיעה, כמו שיר ים תיכוני ישן'); await p.waitForTimeout(300); await shot('create');
      await p.evaluate((s) => localStorage.setItem('musicprompt.library.v1', JSON.stringify(s)), SEED);
      await p.goto(BASE + '#/library', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await shot('library');
      await p.goto(BASE, { waitUntil: 'networkidle' }); await p.locator('.h-legend .lg').first().hover().catch(() => {}); await shot('home');
      await ctx.close();
    }
  } finally { await b.close(); srv.kill(); }
})();
