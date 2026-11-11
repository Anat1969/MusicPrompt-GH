// בדיקת קצה לקצה: npm run build && npm test (מריץ vite preview בעצמו)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const BASE = 'http://localhost:4199/';
const MENU = fs.readFileSync(__dirname + '/ai-menu.js', 'utf8');
const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails.push(msg); };
const AI = { style: 'Israeli folk pop, warm, 110 BPM, female vocals singing in Hebrew, oud', lyrics: '[Verse 1]\nשורה ראשונה\n\n[Chorus]\nפזמון', title: 'שקיעה בטיילת', exclude: 'heavy metal', note: 'תרגמתי את השם לתכונות מוזיקליות.', styleHe: 'פופ פולק ישראלי, חם, 110 פעימות בדקה, זמרת בעברית, עוד', engine: 'gemini' };

(async () => {
  const srv = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, permissions: ['clipboard-read', 'clipboard-write'] });
    const p = await ctx.newPage();
    await p.route('**/appofapp-gh.vercel.app/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: MENU }));
    let aiCalls = 0, aiFail = false;
    await p.route('**/functions/v1/musicprompt-compose', async (r) => { aiCalls++; await new Promise((res) => setTimeout(res, 1200)); return aiFail ? r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'הליטוש החכם לא זמין כרגע.' }) }) : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AI) }); });
    await ctx.route('https://suno.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'suno' }));
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));

    // דף הבית
    await p.goto(BASE, { waitUntil: 'networkidle' });
    ok((await p.locator('h1').innerText()).includes('המילים חסרות'), 'בית: הפתיח פותח בכאב');
    ok((await p.locator('.h-fix').innerText()).includes('מתרגמת טעם לפס קול') && await p.locator('.h-fixes li').count() === 3, 'בית: הפתרון בשלושה צעדים');
    const vid = await p.evaluate(async () => { const v = document.querySelector('.h-film video'); const r = await fetch(v.getAttribute('src'), { method: 'HEAD' }); const pr = await fetch(v.getAttribute('poster'), { method: 'HEAD' }); return { ok: r.ok && pr.ok, type: r.headers.get('content-type') }; });
    ok(vid.ok && /video/.test(vid.type || ''), 'בית: סרטון השיווק נמצא בפתיח');
    ok(await p.locator('.h-dot').count() === 3 && (await p.locator('.h-dot[aria-current=true]').innerText()).includes('פתיח'), 'בית: מחוון של שלושה מסכים');
    await p.locator('.h-dot').nth(1).click(); await p.waitForTimeout(700);
    ok((await p.locator('.h-title').innerText()).includes('טעם אישי הופך לפס קול') && (await p.locator('.h-dot[aria-current=true]').innerText()).includes('החמשה'), 'בית: המסך השני הוא החמשה, והתוכן הקודם נשמר');
    ok(await p.locator('.h-cards .h-card').count() === 3 && await p.locator('.h-museum .h-quote').count() === 1, 'בית: מפת התוכן ושכבת הידע נשמרו במסך השלישי');
    ok(await p.locator('svg.staff .staff-line').count() === 6, 'בית: שש דוגמאות על החמשה כשהספרייה ריקה');
    ok(await p.locator('ai-menu .logo').isVisible(), 'כפתור הלוגו A&I בסרגל');
    ok(!(await p.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'אין כפתורי פיתוח חופשיים בסרגל');
    await p.locator('.h-legend .lg').nth(2).hover();
    ok((await p.locator('.h-now strong').innerText()) === 'הליכה על הטיילת', 'בית: ריחוף על המקרא מדגיש את הקו ומציג את שמו');
    ok(await p.locator('.staff-line.is-on').count() === 1, 'בית: קו אחד מודגש');
    await p.locator('.h-legend .lg').nth(2).click();
    await p.waitForFunction(() => location.hash === '#/create?s=1');

    // יצירה מדוגמה: שלב אחד מבודד, עם הסבר והצעות
    const tick = () => p.waitForTimeout(150);   // מעבר שלב עובר דרך הכתובת
    const step = (name) => ({ click: async () => { await p.locator('.steps-list').getByRole('button', { name }).click(); await tick(); } });
    const opt = (name) => p.locator('.opts .opt').filter({ has: p.locator('strong', { hasText: new RegExp('^' + name + '$') }) });
    const add = (name) => p.locator('.opts').getByRole('button', { name: `להוסיף את ${name} לבחירה` });
    ok((await p.locator('.q h1').innerText()) === 'מאיזה עולם המוזיקה?', 'יצירה: שאלה אחת מבודדת בכל שלב');
    ok((await p.locator('.q-how').innerText()).includes('מה זה משנה בפרומפט'), 'יצירה: כל שלב מסביר מה הוא משנה בפרומפט');
    ok(await p.locator('.step[aria-current=step] .step-t').innerText() === 'סגנון', 'יצירה: המחוון מראה באיזה שלב אני');
    ok(await p.locator('.opts .opt span').first().innerText() === 'classical orchestral', 'יצירה: כל אפשרות מציגה גם את המונח באנגלית');
    ok((await p.locator('[data-testid=style] textarea').inputValue()).includes('110 BPM'), 'יצירה: הדוגמה מילאה את הבחירות והפרומפט נכתב');
    ok((await p.locator('[data-testid=style-he]').innerText()).includes('110 פעימות בדקה'), 'יצירה: הפרומפט מוצג גם בעברית');
    const row = p.locator('.build tbody tr').nth(2);
    ok((await row.locator('td').nth(0).innerText()).includes('קצב הליכה') && (await row.locator('td').nth(1).innerText()).includes('110 BPM'), 'טבלת הבנייה: עברית מול אנגלית לכל שלב');
    await p.getByRole('button', { name: 'הבא', exact: true }).click(); await tick();
    ok((await p.locator('.q h1').innerText()) === 'מה מרגישים?' && p.url().endsWith('s=2'), 'יצירה: "הבא" מתקדם, והשלב בכתובת');
    ok(await p.locator('.opt.is-sug').count() > 0 && (await p.locator('.q-sug').innerText()).includes('מוצע'), 'יצירה: הצעות לפי הסגנון שנבחר, מסומנות');
    ok(await p.locator('.build tr.is-now th').innerText() === 'אווירה', 'טבלת הבנייה: השורה של השלב הנוכחי מודגשת');
    // החמשה כבחירה: לחיצה על נקודה בקו הקצב
    const before = await p.locator('[data-testid=style] textarea').inputValue();
    // הגרירה עוברת לשלב של הקו, והדיאגרמה משנה גודל. לכן המיקום מחושב מחדש אחרי תחילת הגרירה
    const at = async (line, frac) => { const box = await p.locator('svg.staff.is-live').boundingBox(); const vb = { w: 640, h: 270 }, sc = Math.min(box.width / vb.w, box.height / vb.h), ox = box.x + (box.width - vb.w * sc) / 2, oy = box.y + (box.height - vb.h * sc) / 2; return { x: ox + (555 - frac * 530) * sc, y: oy + (34 + line * 50.5) * sc }; };
    const a = await at(2, 0);
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await tick();
    const mid = await at(2, 0.5); await p.mouse.move(mid.x, mid.y, { steps: 6 });
    const z = await at(2, 1); await p.mouse.move(z.x, z.y, { steps: 6 }); await p.mouse.up(); await tick();
    const after = await p.locator('[data-testid=style] textarea').inputValue();
    ok(before.includes('110 BPM') && after.includes('150 BPM'), 'החמשה: גרירת העיגול לאורך קו הקצב משנה את הפרומפט');
    ok((await p.locator('.q h1').innerText()) === 'כמה מהר?', 'החמשה: גרירה על קו עוברת לשלב שלו');
    ok(await opt('מהיר מאוד').getAttribute('aria-pressed') === 'true', 'החמשה: הבחירה מסומנת גם בשלב');
    ok((await p.locator('.staff-how').innerText()).includes('איך הדיאגרמה עובדת'), 'החמשה: הסבר איך היא עובדת');
    await p.locator('.build tbody tr').nth(3).click(); await tick();
    ok((await p.locator('.q h1').innerText()) === 'מי שר, אם בכלל?', 'טבלת הבנייה: לחיצה על שורה עוברת לשלב');
    await p.locator('.o-tabs').getByRole('tab', { name: 'מילים' }).click();
    ok(await p.locator('[data-testid=lyrics]').isVisible(), 'יצירה: יש שדה מילים כשנבחר קול');
    ok(await p.locator('textarea.field:not(.cb-text)').count() === await p.locator('.voice-btn').count() && await p.locator('.voice-btn').count() >= 1, 'ליד כל שדה כתיבה חופשי יש כפתור הקלטה');
    await opt('בלי מילים').click();
    ok(!(await p.locator('[data-testid=lyrics]').isVisible().catch(() => false)) && (await p.locator('.o-note').innerText()).includes('Instrumental'), 'יצירה: בלי מילים מסתיר את שדה המילים ומסביר');
    await p.locator('.o-tabs').getByRole('tab', { name: 'הפרומפט המלא' }).click();
    ok((await p.locator('[data-testid=style] textarea').inputValue()).includes('instrumental, no vocals'), 'יצירה: הפרומפט התעדכן לאינסטרומנטלי');
    ok((await p.locator('[data-testid=style-he]').innerText()).includes('בלי שירה'), 'יצירה: גם העברית התעדכנה');
    await p.locator('.o-tabs').getByRole('tab', { name: 'כותרת ובלי' }).click();
    ok((await p.locator('[data-testid=exclude] textarea').inputValue()).includes('vocals'), 'יצירה: שדה "בלי" מתמלא');
    ok(!(await p.getByRole('group', { name: 'שפת המילים' }).isVisible().catch(() => false)), 'יצירה: שורת השפה נעלמת בלי קול');
    await opt('זמרת').click();
    ok(await p.getByRole('group', { name: 'שפת המילים' }).isVisible(), 'יצירה: שורת השפה חוזרת עם קול');
    await p.locator('.o-tabs').getByRole('tab', { name: 'הפרומפט המלא' }).click();
    // מגבלת בחירות: סגנון עד 2
    await step('סגנון').click();
    await opt("ג'אז").click();
    ok(await p.locator('.opts [aria-pressed=true]').count() === 1 && (await p.locator('[data-testid=picked]').innerText()).includes("ג'אז"), 'יצירה: לחיצה מחליפה את הבחירה, והנבחר כתוב במילים');
    await add('פופ').click(); await add('רוק').click();
    ok(await p.locator('.opts [aria-pressed=true]').count() === 2 && await opt('רוק').getAttribute('aria-pressed') === 'true', 'יצירה: "+" מוסיף בחירה, ובסגנון נשארות שתיים לכל היותר');
    // תצוגת "הכול"
    await p.getByRole('button', { name: 'הכול', exact: true }).click(); await tick();
    ok(await p.locator('.rows .row').count() >= 6 && p.url().includes('v=all'), 'יצירה: "הכול" מציג את כל השאלות יחד, והמצב בכתובת');
    await p.getByRole('button', { name: 'שלב אחד' }).click(); await tick();
    await step('תיאור').click();

    // העתקה
    await p.locator('[data-testid=style] .cb-copy').click();
    ok(await p.evaluate(() => navigator.clipboard.readText()) === await p.locator('[data-testid=style] textarea').inputValue(), 'העתקה: הסגנון בלוח');
    ok((await p.locator('[data-testid=style] .cb-copy').innerText()) === 'הועתק', 'העתקה: הכפתור מאשר');
    const [popup] = await Promise.all([ctx.waitForEvent('page'), p.getByRole('button', { name: 'העתקה ופתיחת Suno' }).click()]);
    await popup.waitForURL(/suno\.com/).catch(() => {});
    ok(popup.url().startsWith('https://suno.com/create'), 'פתיחת Suno בלשונית חדשה');
    await popup.close();

    // ליטוש חכם
    await p.locator('#desc').fill('כמו שיר ישן של זמר אהוב');
    await p.getByRole('button', { name: 'ליטוש חכם' }).click();
    await p.locator('[data-testid=waiting]').waitFor({ timeout: 1000 }).catch(() => {});
    ok(await p.locator('[data-testid=waiting]').isVisible(), 'ליטוש חכם: חיווי המתנה עם שעון בזמן העבודה');
    await p.locator('.tag.e-gemini').waitFor();
    ok(aiCalls === 1 && (await p.locator('[data-testid=style] textarea').inputValue()) === AI.style, 'ליטוש חכם: הסגנון הוחלף בתוצאה');
    ok((await p.locator('[data-testid=style-he]').innerText()).includes('פופ פולק ישראלי') && (await p.locator('.msg-solution').innerText()).includes('תרגמתי'), 'ליטוש חכם: תרגום עברי ומשפט הסבר');
    await p.locator('.o-tabs').getByRole('tab', { name: 'מילים' }).click();
    ok((await p.locator('[data-testid=lyrics] textarea').inputValue()).includes('[Chorus]'), 'ליטוש חכם: מילים מלאות');
    await p.locator('.o-tabs').getByRole('tab', { name: 'הפרומפט המלא' }).click();
    await step('סגנון').click();
    await opt('פופ').click();
    ok(await p.getByText('הבחירות השתנו מאז הליטוש').isVisible(), 'ליטוש חכם: שינוי בחירה מסומן, והתוצאה לא נמחקת');
    await p.reload({ waitUntil: 'networkidle' });
    ok((await p.locator('[data-testid=style] textarea').inputValue()) === AI.style, 'שמירה אוטומטית: הפרומפט חוזר אחרי רענון');
    await step('תיאור').click();
    ok((await p.locator('#desc').inputValue()) === 'כמו שיר ישן של זמר אהוב', 'שמירה אוטומטית: התיאור חוזר אחרי רענון');
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
    ok((await p.locator('[data-testid=d-he]').innerText()).includes('פופ פולק ישראלי'), 'ספרייה: הניסוח בעברית נשמר עם השיר');
    ok((await p.locator('[data-testid=d-note]').innerText()).includes('תרגמתי'), 'ספרייה: נשמר גם מה שהליטוש עשה');
    ok((await p.locator('.stage .st-kicker').innerText()).includes('במה מס') && await p.locator('.st-key p:not(.label)').count() === 4, 'ספרייה כמגזין: לכל שיר במה, עם מפתח של ארבע פרשנויות');
    const hk = await p.locator('.frame-haiku').evaluateAll((els) => els.map((e) => e.querySelectorAll('span').length));
    ok(hk.length === 3 && hk.every((n) => n === 3), 'ספרייה כמגזין: הייקו של שלוש שורות לכל תמונה');
    ok((await p.locator('.frame-eye').allInnerTexts()).join(' ').replace(/\s+/g, ' ').includes('מבחוץ') && (await p.locator('.frame-eye').allInnerTexts()).join(' ').includes('על הגוף'), 'ספרייה כמגזין: שלוש מעטפות, מבחוץ, מבפנים ועל הגוף');
    ok(!(await p.locator('.st-drawer').isVisible().catch(() => false)), 'ספרייה כמגזין: הטקסט הטכני סגור במגירה');
    // השראה חזותית: שלוש מסגרות ופרומפט לתמונה
    ok(await p.locator('.d-strip .frame').count() === 3, 'ספרייה: שלוש מסגרות, מבנה, מרחב מחיה ובגד');
    await p.locator('.frame[data-kind=garment] figcaption .chip').first().click();
    const vp = await p.evaluate(() => navigator.clipboard.readText());
    ok(vp.includes('בגד אופנתי') && vp.endsWith('--ar 1:1 --no text, words, writing, frame divisions') && vp.includes('Documentary realism'), 'ספרייה: העתקת פרומפט לתמונה, בעברית ועם הפרמטרים הקבועים');
    ok((await p.locator('[data-testid=d-visual] textarea').inputValue()) === vp && (await p.locator('[data-testid=d-distill]').innerText()).includes('הופך למרחב') && await p.locator('.st-drawer').isVisible(), 'ספרייה: הפרומפט לתמונה נפתח במגירה ונערך בה');
    await p.locator('.st-close').click();
    ok(!(await p.locator('.st-drawer').isVisible().catch(() => false)), 'ספרייה: המגירה נסגרת');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await p.locator('.frame[data-kind=building] input[type=file]').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
    await p.locator('.frame[data-kind=building] img').waitFor();
    ok(true, 'מסגרת: העלאה בלחיצה');
    const dropOrPaste = (kind, type) => p.evaluate(async ([kind, type, b64]) => {
      const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const dt = new DataTransfer(); dt.items.add(new File([arr], 'x.png', { type: 'image/png' }));
      const box = document.querySelector(`.frame[data-kind=${kind}] .frame-box`);
      if (type === 'drop') box.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      else { box.focus(); window.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt })); }
    }, [kind, type, png.toString('base64')]);
    await dropOrPaste('space', 'drop');
    await p.locator('.frame[data-kind=space] img').waitFor({ timeout: 4000 }).catch(() => {});
    ok(await p.locator('.frame[data-kind=space] img').count() === 1, 'מסגרת: גרירה של תמונה');
    await p.locator('.frame[data-kind=garment] .frame-box').focus(); await p.waitForTimeout(200);   // המסגרת שנבחרה היא היעד של ההדבקה
    await dropOrPaste('garment', 'paste');
    await p.locator('.frame[data-kind=garment] img').waitFor({ timeout: 4000 }).catch(() => {});
    ok(await p.locator('.frame[data-kind=garment] img').count() === 1, 'מסגרת: הדבקה של תמונה');
    await p.reload({ waitUntil: 'networkidle' });
    await p.locator('.frame img').first().waitFor({ timeout: 4000 }).catch(() => {});
    ok(await p.locator('.frame img').count() === 3, 'מסגרות: שלוש התמונות נשמרות אחרי רענון');
    await p.locator('.frame[data-kind=space] figcaption .chip').last().click();
    await p.waitForTimeout(300);
    ok(await p.locator('.frame img').count() === 2, 'מסגרת: הסרת תמונה');
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
    await p.getByRole('button', { name: 'סידור וסינון' }).click();
    await p.getByRole('button', { name: 'בלי שיר' }).click();
    ok(await p.getByText('לא נמצא שיר שמתאים').isVisible(), 'ספרייה: סינון עם מצב ריק מוסבר');
    await p.getByRole('button', { name: 'הכול' }).click();

    // הטעם שלי
    await p.locator('.tabs').getByRole('button', { name: 'יצירה' }).click();
    await p.getByRole('button', { name: 'ניקוי' }).click(); await tick();
    await p.getByRole('button', { name: 'הטעם שלי' }).click(); await tick();
    ok(!(await p.locator('.build tbody tr').nth(0).getAttribute('class')).includes('is-off'), 'הטעם שלי: ממלא בחירות מהשירים האהובים');
    await p.locator('.brand').click();
    await p.waitForFunction(() => location.hash === '');
    ok(await p.locator('.staff-line.k-taste').count() === 1, 'בית: קו הטעם שלי מופיע על החמשה');

    // גרסה חדשה ומחיקה
    await p.locator('.tabs').getByRole('button', { name: 'ספרייה' }).click();
    await p.getByRole('button', { name: 'גרסה חדשה מזה' }).click();
    await p.waitForFunction(() => location.hash === '#/create?s=1');
    await step('תיאור').click();
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
          for (const st of [1, 2, 4, 5]) {
            await m.goto(BASE + '#/create?s=' + st, { waitUntil: 'networkidle' });
            const inner = await m.evaluate(() => Math.max(...['.q', '.o-blocks'].map((q) => { const el = document.querySelector(q); return el ? el.scrollHeight - el.clientHeight : 0; })));
            ok(inner <= 1, `${vp.width}×${vp.height} יצירה, שלב ${st}: השאלה והפרומפט נראים בלי גלילה בתוך מסגרת (${inner})`);
          }
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
