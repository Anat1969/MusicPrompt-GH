// ליטוש חכם: פונקציית Edge ב-Supabase שמתרגמת תיאור חופשי בעברית לשפה של Suno. המפתח נמצא רק בשרת.
import type { Selection } from '../data/options';
import type { Prompt } from './compose';

const URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co/functions/v1/musicprompt-compose';

export type Polished = Prompt & { note: string; engine: 'gemini' | 'claude' };

export async function polish(input: { desc: string; words: string; base: Prompt; sel: Selection; instrumental: boolean; lang: string; taste: string }): Promise<Polished> {
  let r: Response;
  try {
    r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(45000) });
  } catch {
    throw new Error('אין חיבור לליטוש החכם. הפרומפט מהבחירות מוכן, ואפשר לנסות שוב.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'הליטוש החכם לא זמין כרגע. הפרומפט מהבחירות מוכן.');
  return j as Polished;
}
