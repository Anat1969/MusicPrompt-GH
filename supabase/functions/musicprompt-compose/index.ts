// MusicPrompt-GH ("פרטיטורה"): ליטוש חכם של פרומפט ל-Suno.
// מקבל תיאור חופשי בעברית, בחירות ופרומפט בסיס, ומחזיר סגנון באנגלית, מילים, כותרת, רשימת "בלי", ומשפט הסבר בעברית.
// Gemini החינמי (GEMINI_API_KEY) קודם, Claude (ANTHROPIC_API_KEY) רק כגיבוי. פלט JSON מובנה, מגבלת קצב. הפונקציה לא שומרת דבר.
import Anthropic from 'npm:@anthropic-ai/sdk';

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

const SYSTEM = `You are a music producer who writes prompts for Suno (AI music generator, Custom mode).
The user describes in Hebrew what they want to hear and may have picked options. You get a baseline prompt built from the picks.
Return JSON with five fields:

1. style: the "Style of Music" field. English only. Comma-separated descriptors, 200 to 600 characters, never above 900.
   Order: genre and era, mood, tempo with BPM, vocal type (or "instrumental, no vocals"), lead instruments, production and mix character, structure hints.
   Keep every pick from the baseline. Add what the free description implies: translate images, places, films and feelings into concrete musical terms.
   NEVER write an artist, band, song, film or brand name. If the description names one, replace it with its musical traits (era, genre, vocal timbre, instrumentation, production).
2. lyrics: the "Lyrics" field. If instrumental is true, return an empty string.
   Otherwise write complete song lyrics in the requested lyrics language (Hebrew if none was requested), with Suno structure tags in English square brackets on their own lines:
   [Intro], [Verse 1], [Chorus], [Verse 2], [Chorus], [Bridge], [Chorus], [Outro]. 16 to 28 sung lines. Natural, singable, concrete images, no cliches.
   If the user supplied their own lyrics, keep their words and only add structure tags and line breaks. Never copy existing songs.
3. title: a short song title, 1 to 4 words, in the lyrics language (Hebrew if instrumental).
4. exclude: the "Exclude Styles" field. English, comma-separated, 0 to 5 items that would spoil this request. Empty string if nothing.
5. note: ONE sentence in natural Hebrew, up to 20 words, telling the user what you translated or added, e.g. which name you replaced with which traits. No exclamation marks, no emoji.

Do not invent facts. Output only the JSON.`;

const SCHEMA_CLAUDE = { type: 'object', additionalProperties: false, required: ['style', 'lyrics', 'title', 'exclude', 'note'], properties: { style: { type: 'string' }, lyrics: { type: 'string' }, title: { type: 'string' }, exclude: { type: 'string' }, note: { type: 'string' } } };
const SCHEMA_GEMINI = { type: 'OBJECT', required: ['style', 'lyrics', 'title', 'exclude', 'note'], properties: { style: { type: 'STRING' }, lyrics: { type: 'STRING' }, title: { type: 'STRING' }, exclude: { type: 'STRING' }, note: { type: 'STRING' } } };

const GEMINI_MODELS = [...new Set([Deno.env.get('GEMINI_MODEL') ?? 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])];

async function viaGemini(key: string, user: string) {
  let last: unknown;
  for (const model of GEMINI_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA_GEMINI, temperature: 0.8 },
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw Object.assign(new Error(`Gemini ${model} ${r.status}`), { status: r.status });
      const j = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
      return JSON.parse(text);
    } catch (err) {
      last = err;
      const st = (err as { status?: number }).status;
      if (st === 400 || st === 401 || st === 403) break;
    }
  }
  throw last;
}

async function viaClaude(key: string, user: string) {
  const client = new Anthropic({ apiKey: key });
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 3000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA_CLAUDE } },
    messages: [{ role: 'user', content: user }],
  } as never);
  if (response.stop_reason === 'refusal') throw new Error('הבקשה נדחתה');
  const text = response.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  return JSON.parse(text);
}

const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST בלבד' }, 405);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  if (limited(ip)) return json({ error: 'יותר מדי בקשות. אפשר לנסות שוב בעוד דקה.' }, 429);

  let body: { desc?: unknown; words?: unknown; base?: { style?: unknown; exclude?: unknown }; instrumental?: unknown; lang?: unknown; taste?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'גוף הבקשה אינו JSON' }, 400); }
  const desc = clip(body.desc, 1200), words = clip(body.words, 3000), baseStyle = clip(body.base?.style, 1000);
  if (!desc.trim() && !baseStyle.trim()) return json({ error: 'אין תיאור ואין בחירות. משפט אחד או בחירה אחת מספיקים.' }, 400);
  const instrumental = body.instrumental === true;

  const user = [
    `Free description (Hebrew): "${desc || '(none)'}"`,
    `Baseline style from picks: "${baseStyle || '(none)'}"`,
    `Baseline exclude: "${clip(body.base?.exclude, 200) || '(none)'}"`,
    `Instrumental: ${instrumental}`,
    `Requested lyrics language: ${clip(body.lang, 30) || '(not chosen)'}`,
    `Song topic or the user's own lyrics: "${words || '(none)'}"`,
    `What this user tends to love (from their library): ${clip(body.taste, 200) || '(unknown yet)'}`,
  ].join('\n');

  const clean = (r: Record<string, unknown>) => ({
    style: clip(r.style, 950).replace(/\s+/g, ' ').trim(),
    lyrics: instrumental ? '' : clip(r.lyrics, 4500).trim(),
    title: clip(r.title, 80).trim(),
    exclude: clip(r.exclude, 200).trim(),
    note: clip(r.note, 220).trim(),
  });

  const gk = Deno.env.get('GEMINI_API_KEY');
  const ak = Deno.env.get('ANTHROPIC_API_KEY');
  const errors: string[] = [];
  if (gk) {
    try { return json({ ...clean(await viaGemini(gk, user)), engine: 'gemini' }); } catch (e) { errors.push(String((e as Error).message ?? e)); }
  }
  if (ak) {
    try { return json({ ...clean(await viaClaude(ak, user)), engine: 'claude' }); } catch (e) { errors.push(String((e as Error).message ?? e)); }
  }
  console.error('musicprompt-compose', errors.join('; '));
  return json({ error: 'הליטוש החכם לא זמין כרגע. הפרומפט מהבחירות מוכן, ואפשר לנסות שוב מאוחר יותר.' }, 503);
});
