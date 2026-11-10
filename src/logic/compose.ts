// מהבחירות לפרומפט. חישוב מקומי ומיידי, בלי רשת. הליטוש החכם (ai.ts) רק משפר את התוצאה הזו.
import { GROUPS, STAFF, group, type GroupId, type Selection } from '../data/options';

export const STYLE_LIMIT = 1000; // לפי מדריכים חיצוניים לגרסאות 4.5 ומעלה. Suno לא מפרסמת מספר רשמי.

export type Prompt = { title: string; style: string; lyrics: string; exclude: string };

const picks = (sel: Selection, id: GroupId) =>
  (sel[id] ?? []).map((oid) => group(id).options.find((o) => o.id === oid)).filter(Boolean) as { id: string; he: string; en: string; bpm?: number; minor?: boolean }[];

export const isInstrumental = (sel: Selection) => (sel.voice ?? [])[0] === 'instrumental';
export const hasVoice = (sel: Selection) => !!(sel.voice ?? [])[0] && !isInstrumental(sel);
export const countPicks = (sel: Selection) => GROUPS.reduce((n, g) => n + (sel[g.id]?.length ?? 0), 0);

export function composeStyle(sel: Selection): string {
  const parts: string[] = [];
  const genres = picks(sel, 'genre').map((o) => o.en);
  if (genres.length === 2) parts.push(`${genres[0]} fused with ${genres[1]}`); else parts.push(...genres);
  parts.push(...picks(sel, 'mood').map((o) => o.en));
  parts.push(...picks(sel, 'tempo').map((o) => o.en));
  const voice = picks(sel, 'voice')[0];
  if (voice) {
    const lang = picks(sel, 'lang')[0];
    parts.push(voice.id !== 'instrumental' && lang ? `${voice.en} singing in ${lang.en}` : voice.en);
  }
  const inst = picks(sel, 'inst').map((o) => o.en);
  if (inst.length) parts.push(`featuring ${inst.join(', ')}`);
  parts.push(...picks(sel, 'use').map((o) => o.en));
  return parts.join(', ');
}

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
