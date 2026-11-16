// החיבור למסלול: שיר שנוצר מתדריך של קולקציה חוזר אליה, עם קובץ השמע עצמו.
// מסלול שם בקישור מפתח חד־פעמי (key). הפונקציה mo-media שומרת רק את הגיבוב שלו, ומקבלת את השיר רק איתו.
import { loadAudio, type Song } from './store';

const FN = 'https://ktqmwpbzcnzkhjskqisy.supabase.co/functions/v1/mo-media';
const KEY = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';
const SUNO = /^https:\/\/(www\.)?suno\.com\//;

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(FN, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `מסלול לא ענה (${r.status})`);
  return j as T;
}

function duration(b: Blob): Promise<number> {
  return new Promise((ok) => {
    const a = new Audio(); const u = URL.createObjectURL(b);
    const done = (d: number) => { URL.revokeObjectURL(u); ok(Number.isFinite(d) ? d : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0); a.src = u;
    setTimeout(() => done(0), 8000);
  });
}

export const canSend = (s: Song) => !!s.origin && (!!s.audioName || SUNO.test(s.sunoUrl));

/** The way back for a song without a key (made before the key existed): the Suno link in the address. */
export const backLink = (s: Song) => `${s.origin!.back}${s.origin!.back.includes('?') ? '&' : '?'}${new URLSearchParams({ suno: s.sunoUrl, song: s.id, title: s.title || '' })}`;

/** Sends the song to its collection and returns the address to go back to. */
export async function sendToMaslul(s: Song, onStep: (m: string) => void): Promise<string> {
  const o = s.origin!;
  if (!o.key) return backLink(s);
  const patch: Record<string, string | number> = { song_id: s.id, title: s.title || o.title };
  if (SUNO.test(s.sunoUrl)) patch.suno_url = s.sunoUrl;
  const blob = s.audioName ? await loadAudio(s.id) : null;
  if (blob) {
    onStep('שולחת את השיר');
    const ext = ((s.audioName.split('.').pop() || 'mp3').toLowerCase().match(/^(mp3|m4a|wav|ogg|webm|aac|mp4)$/) ?? ['mp3'])[0];
    const sg = await call<{ signedUrl: string; url: string; path: string }>({ action: 'handoff_sign', collection_id: o.ref, key: o.key, ext });
    const signed = sg.signedUrl.startsWith('http') ? sg.signedUrl : `https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1${sg.signedUrl}`;
    const r = await fetch(signed, { method: 'PUT', headers: { 'Content-Type': blob.type || 'audio/mpeg', 'x-upsert': 'true' }, body: blob });
    if (!r.ok) throw new Error(`ההעלאה נכשלה (${r.status})`);
    Object.assign(patch, { audio_url: sg.url, audio_path: sg.path });
    const d = await duration(blob); if (d) patch.duration = d;
  }
  onStep('שומרת בקולקציה');
  await call({ action: 'handoff_save', collection_id: o.ref, key: o.key, patch });
  return `${o.back}${o.back.includes('?') ? '&' : '?'}sent=1`;
}
