// שמירה מקומית בדפדפן. טקסט ובחירות ב-localStorage, קובצי שמע ב-IndexedDB (גדולים מדי ל-localStorage).
// הספרייה חיה במכשיר הזה, ועובדת גם בלי רשת. אחרי כניסה היא משתקפת לענן (cloud.ts), וכל מכשיר רואה אותה ספרייה.
import { useSyncExternalStore } from 'react';
import type { Selection } from '../data/options';
import type { Prompt } from './compose';
import { audioDownload, audioRemove, audioUpload, audioUploadNow, cloudState, initCloud, remoteDelete, remoteList, remoteUpsert, remoteUpsertNow } from './cloud';

export type Song = Prompt & {
  id: string;
  createdAt: number;
  desc: string;
  sel: Selection;
  sunoUrl: string;
  loved: boolean;
  audioName: string;     // ריק: אין קובץ שמע
  engine: 'local' | 'gemini' | 'claude';
  styleHe?: string;      // הסגנון בעברית, לקריאה
  updatedAt?: number;    // לסנכרון: הגרסה החדשה מנצחת
  synced?: boolean;      // כבר קיים בענן. שיר כזה שנעלם מהענן נמחק במכשיר אחר
};

export type Draft = { desc: string; words: string; sel: Selection; out: Prompt | null; note: string; styleHe: string; engine: Song['engine'] };

const K_LIB = 'musicprompt.library.v1';
const K_DRAFT = 'musicprompt.draft.v1';
export const EMPTY_DRAFT: Draft = { desc: '', words: '', sel: {}, out: null, note: '', styleHe: '', engine: 'local' };

const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};

let lib: Song[] = read<Song[]>(K_LIB, []);
let draft: Draft = { ...EMPTY_DRAFT, ...read<Partial<Draft>>(K_DRAFT, {}) };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export const useLibrary = () => useSyncExternalStore(subscribe, () => lib);
export const useDraft = () => useSyncExternalStore(subscribe, () => draft);
export const getLibrary = () => lib;

function saveLib(next: Song[]) {
  lib = next;
  try { localStorage.setItem(K_LIB, JSON.stringify(lib)); } catch { /* מלא: הנתונים נשארים בזיכרון עד רענון */ }
  emit();
}
export function setDraft(patch: Partial<Draft>) {
  draft = { ...draft, ...patch };
  try { localStorage.setItem(K_DRAFT, JSON.stringify(draft)); } catch { /* ראו למעלה */ }
  emit();
}

// מה שעולה לענן: השיר בלי הסימון המקומי
const wire = (s: Song) => { const { synced: _s, ...rest } = s; return rest; };
const timers = new Map<string, number>();
function push(id: string) {
  if (!cloudState().uid) return;
  window.clearTimeout(timers.get(id));
  timers.set(id, window.setTimeout(async () => {
    const s = lib.find((x) => x.id === id);
    if (!s) return;
    if ((await remoteUpsert(id, wire(s))) !== null && !s.synced) saveLib(lib.map((x) => (x.id === id ? { ...x, synced: true } : x)));
  }, 700));
}

export function addSong(s: Omit<Song, 'id' | 'createdAt' | 'sunoUrl' | 'loved' | 'audioName'>): Song {
  const song: Song = { ...s, id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now(), updatedAt: Date.now(), sunoUrl: '', loved: false, audioName: '' };
  saveLib([song, ...lib]);
  push(song.id);
  return song;
}
export const updateSong = (id: string, patch: Partial<Song>) => { saveLib(lib.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: Date.now() } : s))); push(id); };
export async function removeSong(id: string) {
  window.clearTimeout(timers.get(id));
  await delAudio(id).catch(() => {});
  saveLib(lib.filter((s) => s.id !== id));
  void remoteDelete(id);
}

// שמע: IndexedDB
const DB = 'musicprompt-audio', STORE = 'audio';
const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = async <T,>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) => {
  const db = await open();
  return new Promise<T>((res, rej) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};
const putAudio = (id: string, file: Blob) => tx('readwrite', (s) => s.put(file, id));
const getAudio = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
const delAudio = (id: string) => tx('readwrite', (s) => s.delete(id));

// שמע: קודם במכשיר, ואחרי כניסה גם בענן. במכשיר אחר הקובץ יורד מהענן בפעם הראשונה ונשמר.
export async function saveAudio(id: string, file: File) { await putAudio(id, file); updateSong(id, { audioName: file.name }); void audioUpload(id, file); }
export async function dropAudio(id: string) { await delAudio(id).catch(() => {}); updateSong(id, { audioName: '' }); void audioRemove(id); }
export async function loadAudio(id: string): Promise<Blob | null> {
  const local = await getAudio(id).catch(() => undefined);
  if (local) return local;
  const remote = await audioDownload(id);
  if (remote) await putAudio(id, remote).catch(() => {});
  return remote;
}

// סנכרון מלא בכניסה: מאחדים את המכשיר ואת הענן. בכל שיר הגרסה החדשה מנצחת.
async function syncAll() {
  const remote = new Map((await remoteList()).map((r) => [r.id, r.data as unknown as Song]));
  const next: Song[] = [];
  const up: Song[] = [];
  for (const s of lib) {
    const r = remote.get(s.id);
    if (!r) {
      if (s.synced) { await delAudio(s.id).catch(() => {}); continue; }   // נמחק במכשיר אחר
      up.push(s); next.push({ ...s, synced: true });
    } else if ((s.updatedAt ?? s.createdAt) > (r.updatedAt ?? r.createdAt)) { up.push(s); next.push({ ...s, synced: true }); }
    else next.push({ ...r, synced: true });
    remote.delete(s.id);
  }
  for (const r of remote.values()) next.push({ ...r, synced: true });
  for (const s of up) {
    await remoteUpsertNow(s.id, wire(s));
    if (s.audioName && !s.synced) { const f = await getAudio(s.id).catch(() => undefined); if (f) await audioUploadNow(s.id, f); }
  }
  saveLib(next.sort((a, b) => b.createdAt - a.createdAt));
}
// ביציאה: מה שכבר בענן יורד מהמכשיר, ומה שנוצר רק כאן נשאר
function leave() {
  for (const s of lib) if (s.synced) void delAudio(s.id).catch(() => {});
  saveLib(lib.filter((s) => !s.synced));
}
void initCloud({ onSignIn: syncAll, onSignOut: leave });

// גיבוי ושחזור: הפרומפטים והקישורים. קובצי השמע נשארים במכשיר.
export function exportLibrary() {
  const blob = new Blob([JSON.stringify({ app: 'musicprompt', version: 1, songs: lib.map(wire) }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `partitura-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export async function importLibrary(file: File): Promise<number> {
  const data = JSON.parse(await file.text());
  const songs: Song[] = Array.isArray(data?.songs) ? data.songs : [];
  const known = new Set(lib.map((s) => s.id));
  const fresh = songs.filter((s) => s && typeof s.id === 'string' && typeof s.style === 'string' && !known.has(s.id)).map((s) => ({ ...s, audioName: '', synced: false }));
  saveLib([...fresh, ...lib].sort((a, b) => b.createdAt - a.createdAt));
  fresh.forEach((s) => push(s.id));
  return fresh.length;
}
