// שמירה מקומית בדפדפן. טקסט ובחירות ב-localStorage, קובצי שמע ב-IndexedDB (גדולים מדי ל-localStorage).
// אין שרת ואין חשבון: הספרייה חיה במכשיר הזה, וגיבוי יוצא כקובץ מתוך כפתור הלוגו.
import { useSyncExternalStore } from 'react';
import type { Selection } from '../data/options';
import type { Prompt } from './compose';

export type Song = Prompt & {
  id: string;
  createdAt: number;
  desc: string;
  sel: Selection;
  sunoUrl: string;
  loved: boolean;
  audioName: string;     // ריק: אין קובץ שמע
  engine: 'local' | 'gemini' | 'claude';
};

export type Draft = { desc: string; words: string; sel: Selection; out: Prompt | null; note: string; engine: Song['engine'] };

const K_LIB = 'musicprompt.library.v1';
const K_DRAFT = 'musicprompt.draft.v1';
export const EMPTY_DRAFT: Draft = { desc: '', words: '', sel: {}, out: null, note: '', engine: 'local' };

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

export function addSong(s: Omit<Song, 'id' | 'createdAt' | 'sunoUrl' | 'loved' | 'audioName'>): Song {
  const song: Song = { ...s, id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now(), sunoUrl: '', loved: false, audioName: '' };
  saveLib([song, ...lib]);
  return song;
}
export const updateSong = (id: string, patch: Partial<Song>) => saveLib(lib.map((s) => (s.id === id ? { ...s, ...patch } : s)));
export async function removeSong(id: string) { await delAudio(id).catch(() => {}); saveLib(lib.filter((s) => s.id !== id)); }

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
export const putAudio = (id: string, file: Blob) => tx('readwrite', (s) => s.put(file, id));
export const getAudio = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
export const delAudio = (id: string) => tx('readwrite', (s) => s.delete(id));

// גיבוי ושחזור: הפרומפטים והקישורים. קובצי השמע נשארים במכשיר.
export function exportLibrary() {
  const blob = new Blob([JSON.stringify({ app: 'musicprompt', version: 1, songs: lib }, null, 2)], { type: 'application/json' });
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
  const fresh = songs.filter((s) => s && typeof s.id === 'string' && typeof s.style === 'string' && !known.has(s.id)).map((s) => ({ ...s, audioName: '' }));
  saveLib([...fresh, ...lib].sort((a, b) => b.createdAt - a.createdAt));
  return fresh.length;
}
