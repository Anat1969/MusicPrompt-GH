// MusicPrompt-GH ("פרטיטורה"): שלושה פרומפטים לתמונה בהשראת פס קול: מבנה, מרחב מחיה ובגד.
// נכתב לפי הסקיל image-prompt-architect: עברית, רצף אחד, חמש שכבות, ובלוק פרמטרים קבוע שהפונקציה מוסיפה בעצמה.
// Gemini החינמי, שלושה מודלים במקביל, והראשון שעונה מנצח. הפונקציה לא שומרת דבר.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 6;
}

const PARAMS = 'Documentary realism, Professional architecture photography, 1:1 --ar 1:1 --no text, words, writing, frame divisions';

const SYSTEM = `אתה מוזיקאי, אדריכל ומעצב אופנה באדם אחד. קיבלת פס קול: כותרת, תיאור, והפרומפט המוזיקלי שלו.
המשימה: לתרגם את האווירה של המוזיקה לשלוש תמונות, כך שמי שרואה אותן מרגיש את אותו שיר.
1. building: מבנה אדריכלי.
2. space: מרחב מחיה, חלל פנים שאפשר לגור בו.
3. garment: בגד אופנתי אחד, בגוף מלא, על דמות בלי פנים מזוהות, בתוך חלל אדריכלי.

כל פרומפט נכתב בעברית, ברצף אחד עם פסיקים, בלי כותרות ובלי מספור, לפי חמש שכבות בסדר הזה:
א. רעיון ומתח: ניגוד אחד בלבד שמחזיק את התמונה (אור וצל, כבד וקל, עתיק ועכשווי, מלא וריק).
ב. מקום וצורה: סוג המרחב, השפה האדריכלית וקנה המידה. נוף ים תיכוני כשזה מתאים.
ג. חומר ומרקם: חומר אחד מוביל ומצבו. בבגד: הבד והגזרה.
ד. אור וזמן: מקור האור, הכיוון, האיכות והשעה. האור הוא גיבור.
ה. קומפוזיציה ומבט: זווית המצלמה, מוקד אחד, וחוק אחד (שלישים, חתך הזהב או קווים מובילים).
ובסוף: פלטה של שלושה צבעים בשמות.

איך מתרגמים מוזיקה: הקצב הוא המקצב של האלמנטים החוזרים. הכלים הם החומר. האווירה היא האור והמתח. הסגנון הוא השפה האדריכלית והגזרה. קול הזמר הוא הדמות.
כללים: ספציפי ולא כללי ("אור בוקר נמוך שמסתנן דרך סבכת בטון", לא "אור בוקר"). פרט שהסרתו לא משנה את התמונה יוצא. שלוש התמונות שונות זו מזו בזווית ובאור, ושומרות על אותה פלטה ואותו מתח.
בלי שמות של אמנים, אדריכלים, מעצבים, מותגים או יצירות. בלי טקסט בתמונה. בלי פנים מזוהות. כל פרומפט 60 עד 110 מילים.
אל תכתוב את מונחי האנגלית או את הפרמטרים: הם מתווספים אחר כך.
distill: משפט אחד בעברית, עד 20 מילים, שאומר איזו אווירה עוברת מהשיר אל התמונות. בלי סימן קריאה.
החזר JSON בלבד.`;

const SCHEMA = { type: 'OBJECT', required: ['distill', 'building', 'space', 'garment'], properties: { distill: { type: 'STRING' }, building: { type: 'STRING' }, space: { type: 'STRING' }, garment: { type: 'STRING' } } };
const MODELS = [...new Set([Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash'])];

async function ask(key: string, model: string, user: string) {
  const started = Date.now();
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.9 },
      }),
      signal: AbortSignal.timeout(24000),
    });
    if (!r.ok) throw new Error(`Gemini ${model} ${r.status}`);
    const j = await r.json();
    const out = JSON.parse(j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '');
    if (!out?.building || !out?.space || !out?.garment) throw new Error(`Gemini ${model} empty`);
    console.log('musicprompt-images ok', model, Date.now() - started, 'ms');
    return out;
  } catch (err) {
    console.error('musicprompt-images try', model, Date.now() - started, 'ms', String((err as Error).message ?? err));
    throw err;
  }
}

const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);
// הפרמטרים הקבועים מתווספים כאן, כדי שהמודל לא ישנה אותם
const seal = (s: unknown) => `${clip(s, 1100).replace(/\s+/g, ' ').replace(/[,.\s]+$/, '').replace(/Documentary realism.*$/i, '').replace(/--\w+.*$/, '').trim()}, ${PARAMS}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST בלבד' }, 405);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  if (limited(ip)) return json({ error: 'יותר מדי בקשות. אפשר לנסות שוב בעוד דקה.' }, 429);
  let body: { title?: unknown; desc?: unknown; style?: unknown; styleHe?: unknown; base?: { building?: unknown } };
  try { body = await req.json(); } catch { return json({ error: 'גוף הבקשה אינו JSON' }, 400); }
  const style = clip(body.style, 1000);
  if (!style.trim()) return json({ error: 'אין פרומפט מוזיקלי לתרגם.' }, 400);
  const user = [
    `כותרת השיר: "${clip(body.title, 80) || '(בלי כותרת)'}"`,
    `התיאור החופשי של המשתמשת: "${clip(body.desc, 1200) || '(אין)'}"`,
    `הפרומפט המוזיקלי (אנגלית): "${style}"`,
    `אותו פרומפט בעברית: "${clip(body.styleHe, 1200) || '(אין)'}"`,
    `טיוטה ראשונה של פרומפט המבנה, לשיפור ולא להעתקה: "${clip(body.base?.building, 900) || '(אין)'}"`,
  ].join('\n');
  const gk = Deno.env.get('GEMINI_API_KEY');
  if (!gk) return json({ error: 'הניסוח העשיר לא זמין כרגע.' }, 503);
  try {
    const r = await Promise.any(MODELS.map((m) => ask(gk, m, user)));
    return json({ distill: clip(r.distill, 220).trim(), building: seal(r.building), space: seal(r.space), garment: seal(r.garment), engine: 'gemini' });
  } catch {
    return json({ error: 'הניסוח העשיר לא זמין כרגע. הפרומפטים מהבחירות מוכנים, ואפשר לנסות שוב.' }, 503);
  }
});
