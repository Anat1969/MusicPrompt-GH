// מהבחירות לפרומפט. חישוב מקומי ומיידי, בלי רשת. הליטוש החכם (ai.ts) רק משפר את התוצאה הזו.
import { GROUPS, STAFF, group, type GroupId, type Selection } from '../data/options';

export const STYLE_LIMIT = 1000; // לפי מדריכים חיצוניים לגרסאות 4.5 ומעלה. Suno לא מפרסמת מספר רשמי.

export type Prompt = { title: string; style: string; lyrics: string; exclude: string };

const picks = (sel: Selection, id: GroupId) =>
  (sel[id] ?? []).map((oid) => group(id).options.find((o) => o.id === oid)).filter(Boolean) as { id: string; he: string; en: string; bpm?: number; minor?: boolean; gloss?: string }[];

export const isInstrumental = (sel: Selection) => (sel.voice ?? [])[0] === 'instrumental';
export const hasVoice = (sel: Selection) => !!(sel.voice ?? [])[0] && !isInstrumental(sel);
export const countPicks = (sel: Selection) => GROUPS.reduce((n, g) => n + (sel[g.id]?.length ?? 0), 0);

// חלקי הפרומפט: כל שלב תורם חלק אחד, באנגלית (מה ש-Suno מקבל) ובעברית (מה שזה אומר). זה הבסיס לטבלה במסך היצירה.
export type Part = { group: GroupId; en: string; he: string };
export function composeParts(sel: Selection): Part[] {
  const parts: Part[] = [];
  const genres = picks(sel, 'genre');
  if (genres.length === 2) parts.push({ group: 'genre', en: `${genres[0].en} fused with ${genres[1].en}`, he: `${genres[0].he} בשילוב ${genres[1].he}` });
  else if (genres.length) parts.push({ group: 'genre', en: genres[0].en, he: genres[0].he });
  const mood = picks(sel, 'mood');
  if (mood.length) parts.push({ group: 'mood', en: mood.map((o) => o.en).join(', '), he: mood.map((o) => o.he).join(', ') });
  const tempo = picks(sel, 'tempo')[0];
  if (tempo) parts.push({ group: 'tempo', en: tempo.en, he: `${tempo.he}, ${tempo.bpm} פעימות בדקה` });
  const voice = picks(sel, 'voice')[0];
  if (voice) {
    const lang = picks(sel, 'lang')[0];
    if (voice.id === 'instrumental') parts.push({ group: 'voice', en: voice.en, he: 'כלים בלבד, בלי שירה' });
    else parts.push({ group: 'voice', en: lang ? `${voice.en} singing in ${lang.en}` : voice.en, he: lang ? `${voice.he}, שירה ב${lang.he}` : voice.he });
  }
  const inst = picks(sel, 'inst');
  if (inst.length) parts.push({ group: 'inst', en: `featuring ${inst.map((o) => o.en).join(', ')}`, he: `עם ${inst.map((o) => o.he).join(', ')}` });
  const use = picks(sel, 'use')[0];
  if (use) parts.push({ group: 'use', en: use.en, he: use.gloss ?? use.he });
  return parts;
}
export const composeStyle = (sel: Selection) => composeParts(sel).map((p) => p.en).join(', ');
export const composeStyleHe = (sel: Selection) => composeParts(sel).map((p) => p.he).join(', ');

export function composeExclude(sel: Selection): string {
  const out: string[] = [];
  if (isInstrumental(sel)) out.push('vocals', 'spoken word');
  const mood = sel.mood ?? [];
  if (mood.some((m) => ['calm', 'intimate', 'dreamy'].includes(m)) && !(sel.inst ?? []).includes('drums')) out.push('heavy drums', 'distortion');
  return out.join(', ');
}

export function composeTitle(sel: Selection, desc: string): string {
  const d = desc.trim().split(/[.\n,]/)[0].trim();
  if (d) return d.split(/\s+/).slice(0, 5).join(' ');
  const g = picks(sel, 'genre')[0], m = picks(sel, 'mood')[0];
  return [g?.he, m?.he].filter(Boolean).join(' ') || '';
}

// שלד מילים. מילים מלאות כותבים לבד, או מבקשים בליטוש החכם.
export function composeLyrics(sel: Selection, words: string): string {
  if (!hasVoice(sel)) return '';
  const w = words.trim();
  if (w.includes('[')) return w;
  if (w.split('\n').length >= 4) return `[Verse 1]\n${w}`;
  return ['[Verse 1]', w, '', '[Chorus]', '', '[Verse 2]', '', '[Chorus]', '', '[Outro]'].join('\n').trim();
}

export function compose(sel: Selection, desc: string, words: string): Prompt {
  return { title: composeTitle(sel, desc), style: composeStyle(sel), lyrics: composeLyrics(sel, words), exclude: composeExclude(sel) };
}

// מיקום הבחירה על כל קו בחמשה: 0 בקצה אחד, 1 בקצה השני. כמה בחירות: הממוצע שלהן.
export function staffPoints(sel: Selection): (number | null)[] {
  return STAFF.map((g) => {
    const idx = (sel[g.id] ?? []).map((id) => g.options.findIndex((o) => o.id === id)).filter((i) => i >= 0);
    if (!idx.length) return null;
    return idx.reduce((a, b) => a + b, 0) / idx.length / (g.options.length - 1);
  });
}

export const bpmOf = (sel: Selection) => picks(sel, 'tempo')[0]?.bpm ?? null;
export const isMinor = (sel: Selection) => picks(sel, 'mood').some((o) => o.minor);
export const labelsOf = (sel: Selection, id: GroupId) => picks(sel, id).map((o) => o.he);

// שורת סיכום בעברית לפריט בספרייה
export const summary = (sel: Selection) =>
  (['genre', 'mood', 'tempo', 'voice'] as GroupId[]).flatMap((id) => labelsOf(sel, id)).join(' · ');
