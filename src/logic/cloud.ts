// ספרייה בענן: Supabase, כניסה באימייל ובסיסמה של החשבון הקיים. כל שיר וכל קובץ שמע פרטיים לבעלים (RLS).
// הספרייה המקומית נשארת מקור התצוגה, כך שהאפליקציה עובדת גם בלי רשת. השכבה הזו רק משקפת אותה לענן.
// המפתח כאן הוא המפתח הציבורי (publishable). הוא מיועד לדפדפן, וההגנה היא במדיניות השורות.
import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
const KEY = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';
const BUCKET = 'mp-audio';

export type CloudState = { ready: boolean; email: string; uid: string; status: 'off' | 'syncing' | 'synced' | 'error'; error: string };
let state: CloudState = { ready: false, email: '', uid: '', status: 'off', error: '' };
const subs = new Set<() => void>();
const set = (p: Partial<CloudState>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
export const useCloud = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state);
export const cloudState = () => state;

let client: Promise<SupabaseClient> | null = null;
const sb = () => (client ??= import('@supabase/supabase-js').then((m) => m.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'musicprompt.auth' } })));

type Hooks = { onSignIn: () => Promise<void>; onSignOut: () => void };
let hooks: Hooks | null = null;

export async function initCloud(h: Hooks) {
  hooks = h;
  // בלי סשן שמור לא טוענים את הספרייה של Supabase בכלל
  if (!localStorage.getItem('musicprompt.auth')) { set({ ready: true }); return; }
  try {
    const { data } = await (await sb()).auth.getSession();
    const u = data.session?.user;
    set({ ready: true, email: u?.email ?? '', uid: u?.id ?? '' });
    if (u) await runSync();
  } catch { set({ ready: true }); }
}

export async function runSync() {
  if (!state.uid || !hooks) return;
  set({ status: 'syncing', error: '' });
  try { await hooks.onSignIn(); set({ status: 'synced' }); }
  catch { set({ status: 'error', error: 'הסנכרון לא הצליח. הספרייה במכשיר שלמה, ואפשר לנסות שוב.' }); }
}

export async function signIn(email: string, password: string): Promise<string> {
  try {
    const { data, error } = await (await sb()).auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      const m = error?.message ?? '';
      return /invalid login/i.test(m) ? 'האימייל או הסיסמה לא נכונים.' : /fetch|network/i.test(m) ? 'אין חיבור לרשת. אפשר לנסות שוב.' : 'הכניסה לא הצליחה. אפשר לנסות שוב.';
    }
    set({ email: data.user.email ?? '', uid: data.user.id });
    void runSync();
    return '';
  } catch { return 'אין חיבור לרשת. אפשר לנסות שוב.'; }
}

export async function signOut() {
  try { await (await sb()).auth.signOut(); } catch { /* מנתקים מקומית בכל מקרה */ }
  localStorage.removeItem('musicprompt.auth');
  set({ email: '', uid: '', status: 'off', error: '' });
  hooks?.onSignOut();
}

const guard = async <T,>(run: (c: SupabaseClient) => Promise<T>): Promise<T | null> => {
  if (!state.uid) return null;
  try { const r = await run(await sb()); if (state.status !== 'syncing') set({ status: 'synced', error: '' }); return r; }
  catch { set({ status: 'error', error: 'שינוי אחד לא נשמר בענן. הוא שמור במכשיר, ויישלח בסנכרון הבא.' }); return null; }
};
const must = <T,>(r: { data: T; error: unknown }) => { if (r.error) throw r.error; return r.data; };

export type Row = { id: string; data: Record<string, unknown> };
export const remoteList = async (): Promise<Row[]> => must(await (await sb()).from('mp_songs').select('id, data')) as Row[];
export const remoteUpsertNow = async (id: string, data: unknown) => { must(await (await sb()).from('mp_songs').upsert({ id, data, updated_at: new Date().toISOString() })); };
export const remoteUpsert = (id: string, data: unknown) => guard(() => remoteUpsertNow(id, data));
export const remoteDelete = (id: string) => guard(async (c) => {
  must(await c.from('mp_songs').delete().eq('id', id));
  await c.storage.from(BUCKET).remove([`${state.uid}/${id}`]);
});
export const audioUploadNow = async (id: string, file: Blob) => { must(await (await sb()).storage.from(BUCKET).upload(`${state.uid}/${id}`, file, { upsert: true, contentType: file.type || 'audio/mpeg' })); };
export const audioUpload = (id: string, file: Blob) => guard(() => audioUploadNow(id, file));
export const audioRemove = (id: string) => guard(async (c) => { await c.storage.from(BUCKET).remove([`${state.uid}/${id}`]); });
export const audioDownload = async (id: string): Promise<Blob | null> => {
  if (!state.uid) return null;
  try { const { data } = await (await sb()).storage.from(BUCKET).download(`${state.uid}/${id}`); return data ?? null; } catch { return null; }
};
