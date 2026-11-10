// בדיקת קצה לקצה: npm run build && npm test (מריץ vite preview בעצמו)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const BASE = 'http://localhost:4199/';
const MENU = fs.readFileSync(__dirname + '/ai-menu.js', 'utf8');
const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails.push(msg); };
const AI = { style: 'Israeli folk pop, warm, 110 BPM, female vocals singing in Hebrew, oud', lyrics: '[Verse 1]\nשורה ראשונה\n\n[Chorus]\nפזמון', title: 'שקיעה בטיילת', exclude: 'heavy metal', note: 'תרגמתי את השם לתכונות מוזיקליות.', engine: 'gemini' };

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await ctx.newPage();
    await p.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
    let aiCalls = 0, aiFail = false;
    await p.route('**/functions/v1/musicprompt-compose', (r) => { aiCalls++; return aiFail ? r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'הליטוש החכם לא זמין כרגע.' }) }) : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AI) }); });
    await ctx.route('https://suno.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'suno' }));
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));

    // דף הבית
    await p.goto(BASE, { waitUntil: 'networkidle' });
    ok((await p.locator('h1').innerText()).includes('טעם אישי הופך לפס קול'), 'בית: שורת התובנה');
    ok(await p.locator('svg.staff .staff-line').count() === 6, 'בית: שש דוגמאות על החמשה כשהספרייה ריקה');
    ok(await p.locator('ai-menu .logo').isVisible(), 'כפתור הלוגו A&I בסרגל');
    ok(!(await p.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'אין כפתורי פיתוח חופשיים בסרגל');
    await p.locator('.h-legend .lg').nth(2).hover();
    ok((await p.locator('.h-now strong').innerText()) === 'הליכה על הטיילת', 'בית: ריחוף על המקרא מדגיש את הקו ומציג את שמו');
    ok(await p.locator('.staff-line.is-on').count() === 1, 'בית: קו אחד מודגש');
    await p.locator('.h-legend .lg').nth(2).click();
    await p.waitForFunction(() => location.hash === '#/create');

    // יצירה מדוגמה
    ok((await p.locator('[data-testid=style] textarea').inputValue()).includes('110 BPM'), 'יצירה: הדוגמה מילאה את הבחירות והסגנון נכתב');
    ok((await p.locator('[data-testid=style] textarea').inputValue()).includes('singing in Hebrew'), 'יצירה: שפת המילים נכנסת לסגנון');
    ok(await p.locator('[data-testid=lyrics]').isVisible(), 'יצירה: יש שדה מילים כשנבחר קול');
    ok(await p.locator('textarea.field:not(.cb-text)').count() === await p.locator('.voice-btn').count() && await p.locator('.voice-btn').count() === 2, 'ליד כל שדה כתיבה חופשי יש כפתור הקלטה');
    await p.getByRole('group', { name: 'קול' }).getByRole('button', { name: 'בלי מילים' }).click();
    ok(!(await p.locator('[data-testid=lyrics]').isVisible().catch(() => false)) && (await p.locator('.o-note').innerText()).includes('Instrumental'), 'יצירה: בלי מילים מסתיר את שדה המילים ומסביר');
    ok((await p.locator('[data-testid=style] textarea').inputValue()).includes('instrumental, no vocals'), 'יצירה: הסגנון התעדכן לאינסטרומנטלי');
    ok((await p.locator('[data-testid=exclude] textarea').inputValue()).includes('vocals'), 'יצירה: שדה "בלי" מתמלא');
    ok(!(await p.getByRole('group', { name: 'שפת המילים' }).isVisible().catch(() => false)), 'יצירה: שורת השפה נעלמת בלי קול');
    await p.getByRole('group', { name: 'קול' }).getByRole('button', { name: 'זמרת' }).click();
    // מגבלת בחירות: סגנון עד 2
    const genre = p.getByRole('group', { name: 'סגנון' });
    await genre.getByRole('button', { name: "ג'אז" }).click();
    ok(await genre.locator('[aria-pressed=true]').count() === 2, 'יצירה: בסגנון נשארות שתי בחירות לכל היותר');

    // העתקה
    await p.locator('[data-testid=style] .cb-copy').click();
    ok(await p.evaluate(() => navigator.clipboard.readText()) === await p.locator('[data-testid=style] textarea').inputValue(), 'העתקה: הסגנון בלוח');
    ok((await p.locator('[data-testid=style] .cb-copy').innerText()) === 'הועתק', 'העתקה: הכפתור מאשר');
    const [popup] = await Promise.all([ctx.waitForEvent('page'), p.getByRole('button', { name: 'העתקת הסגנון ופתיחת Suno' }).click()]);
    await popup.waitForURL(/suno\.com/).catch(() => {});
    ok(popup.url().startsWith('https://suno.com/create'), 'פתיחת Suno בלשונית חדשה');
    await popup.close();

    // ליטוש חכם
    await p.locator('#desc').fill('כמו שיר ישן של זמר אהוב');
    await p.getByRole('button', { name: 'ליטוש חכם' }).click();
    await p.locator('.tag.e-gemini').waitFor();
    ok(aiCalls === 1 && (await p.locator('[data-testid=style] textarea').inputValue()) === AI.style, 'ליטוש חכם: הסגנון הוחלף בתוצאה');
    ok((await p.locator('[data-testid=lyrics] textarea').inputValue()).includes('[Chorus]') && (await p.locator('.msg-solution').innerText()).includes('תרגמתי'), 'ליטוש חכם: מילים ומשפט הסבר');
    await genre.getByRole('button', { name: 'פופ' }).click();
    ok(await p.getByText('הבחירות השתנו מאז הליטוש').isVisible(), 'ליטוש חכם: שינוי בחירה מסומן, והתוצאה לא נמחקת');
    await p.reload({ waitUntil: 'networkidle' });
    ok((await p.locator('#desc').inputValue()) === 'כמו שיר ישן של זמר אהוב' && (await p.locator('[data-testid=title] textarea').inputValue()) === AI.title, 'שמירה אוטומטית: הטיוטה חוזרת אחרי רענון');
    aiFail = true;
    await p.getByRole('button', { name: 'ליטוש חכם' }).click();
    await p.locator('.msg-problem').waitFor({ timeout: 4000 }).catch(() => {});
    ok(await p.locator('.msg-problem').isVisible(), 'ליטוש חכם: כשל מוצג כהודעה, והפרומפט נשאר');
    aiFail = false;

    // שמירה בספרייה
    await p.getByRole('button', { name: 'שמירה בספרייה' }).click();
    await p.getByRole('button', { name: 'מעבר לספרייה' }).click();
    await p.waitForFunction(() => location.hash.startsWith('#/library'));
    ok((await p.locator('.d-title').inputValue()) === AI.title, 'ספרייה: השיר שנשמר פתוח');
    ok((await p.locator('.l-tools h1').innerText()).startsWith('1'), 'ספרייה: מונה');
    await p.getByRole('button', { name: 'סימון כאהוב' }).click();
    ok(await p.locator('.l-item .t-loved').count() === 1, 'ספרייה: אהבתי מסומן ברשימה');
    // העלאת קובץ שמע
    await p.locator('.player input[type=file]').setInputFiles({ name: 'song.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from([0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0]) });
    await p.locator('audio.audio').waitFor();
    ok(await p.locator('.l-item .t-song').count() === 1, 'ספרייה: קובץ שמע הועלה ומסומן "שיר"');
    await p.reload({ waitUntil: 'networkidle' });
    ok(await p.locator('audio.audio').count() === 1, 'ספרייה: קובץ השמע נשמר אחרי רענון');
    await p.locator('#suno-url').fill('https://suno.com/song/abc');
    ok((await p.locator('.suno-link a').getAttribute('href')) === 'https://suno.com/song/abc', 'ספרייה: קישור ל-Suno');
    await p.locator('#suno-url').fill('javascript:alert(1)');
    ok((await p.locator('.suno-link a').getAttribute('href')) === null, 'ספרייה: קישור שאינו של Suno לא נפתח');
    await p.getByRole('button', { name: 'בלי שיר' }).click();
    ok(await p.getByText('לא נמצא שיר שמתאים').isVisible(), 'ספרייה: סינון עם מצב ריק מוסבר');
    await p.getByRole('button', { name: 'הכול' }).click();

    // הטעם שלי
    await p.locator('.tabs').getByRole('button', { name: 'יצירה' }).click();
    await p.getByRole('button', { name: 'ניקוי' }).click();
    await p.getByRole('button', { name: 'הטעם שלי' }).click();
    ok(await p.getByRole('group', { name: 'קצב' }).locator('[aria-pressed=true]').count() === 1, 'הטעם שלי: ממלא בחירות מהשירים האהובים');
    await p.locator('.brand').click();
    await p.waitForFunction(() => location.hash === '');
    ok(await p.locator('.staff-line.k-taste').count() === 1, 'בית: קו הטעם שלי מופיע על החמשה');

    // גרסה חדשה ומחיקה
    await p.locator('.tabs').getByRole('button', { name: 'ספרייה' }).click();
    await p.getByRole('button', { name: 'גרסה חדשה מזה' }).click();
    await p.waitForFunction(() => location.hash === '#/create');
    ok((await p.locator('#desc').inputValue()) === 'כמו שיר ישן של זמר אהוב', 'גרסה חדשה: הבחירות והתיאור נטענו ליצירה');
    await p.locator('.tabs').getByRole('button', { name: 'ספרייה' }).click();
    await p.getByRole('button', { name: 'מחיקה', exact: true }).click();
    await p.getByRole('button', { name: 'כן, מחיקה' }).click();
    await p.getByText('הספרייה עוד ריקה.').waitFor({ timeout: 4000 }).catch(() => {});
    ok(await p.getByText('הספרייה עוד ריקה.').isVisible(), 'מחיקה באישור, ומצב ריק מוסבר');

    // שפה קבועה
    await p.goto(BASE + '#/create?preset=p-night', { waitUntil: 'networkidle' });
    const radius = await p.evaluate(() => [...document.querySelectorAll('button, .field')].every((el) => getComputedStyle(el).borderRadius === '0px'));
    ok(radius, 'כל הכפתורים והשדות מרובעים');
    const framed = await p.evaluate(() => [...document.querySelectorAll('button.press')].filter((el) => { const c = getComputedStyle(el); return c.borderTopWidth !== '0px' && !/rgba\(0, 0, 0, 0\)|transparent/.test(c.borderTopColor); }).length);
    ok(framed === 0, 'כפתורים סמויים: בלי קו מסגרת');
    const cdp = await ctx.newCDPSession(p);
    await p.goto(BASE, { waitUntil: 'networkidle' });
    const inst = await cdp.send('Page.getInstallabilityErrors');
    ok(inst.installabilityErrors.length === 0, 'התקנה: ' + (JSON.stringify(inst.installabilityErrors) || 'אין שגיאות'));

    // בגודל המסך, ובלי גלילה אופקית
    for (const vp of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      const m = await b.newPage({ viewport: vp, reducedMotion: 'reduce' });
      await m.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
      for (const h of ['', '#/create?preset=p-walk', '#/library']) {
        await m.goto(BASE + h, { waitUntil: 'networkidle' });
        const r = await m.evaluate(() => ({ x: document.documentElement.scrollWidth > window.innerWidth, y: document.documentElement.scrollHeight > window.innerHeight + 1 }));
        ok(!r.x, `${vp.width}px ${h || 'בית'}: בלי גלילה אופקית`);
        if (vp.width > 900) ok(!r.y, `${vp.width}×${vp.height} ${h || 'בית'}: הדף בגודל המסך, בלי גלילת דף`);
        if (vp.width > 900 && h.startsWith('#/create')) {
          const inner = await m.evaluate(() => { const el = document.querySelector('.c-in'); return el.scrollHeight - el.clientHeight; });
          ok(inner <= 1, `${vp.width}×${vp.height} יצירה: כל הבוררים נראים בלי גלילה בתוך המסגרת (${inner})`);
        }
      }
      await m.close();
    }
    ok(errors.length === 0, 'אין שגיאות JavaScript ' + errors.join(' | '));
  } finally {
    await b.close();
    srv.kill();
  }
  console.log(fails.length ? `\n${fails.length} נכשלו` : '\nהכול עבר');
  process.exit(fails.length ? 1 : 0);
})();
