// הספרייה: מה שעבד. רשימה מקובצת מימין, והשיר שנבחר נפתח במקום משמאל, כשהרשימה נשארת גלויה.
import { useEffect, useMemo, useRef, useState } from 'react';
import { group } from '../data/options';
import { staffPoints, summary, labelsOf } from '../logic/compose';
import { STAFF } from '../data/options';
import { getAudio, putAudio, delAudio, removeSong, updateSong, useLibrary, type Song } from '../logic/store';
import { go, type Route } from '../logic/route';
import Staff from '../components/Staff';
import { CopyBlock } from '../components/ui';

type Sort = 'date' | 'genre' | 'loved';
type Filter = 'all' | 'with' | 'without';
const SORTS: { id: Sort; he: string; by: string }[] = [
  { id: 'date', he: 'לפי תאריך', by: 'מהחדש לישן, מקובץ לפי חודש' },
  { id: 'genre', he: 'לפי סגנון', by: 'מקובץ לפי הסגנון הראשון' },
  { id: 'loved', he: 'אהובים קודם', by: 'אהובים למעלה, ואחריהם השאר' },
];
const FILTERS: { id: Filter; he: string }[] = [{ id: 'with', he: 'עם שיר' }, { id: 'without', he: 'בלי שיר' }, { id: 'all', he: 'הכול' }];
const month = (t: number) => new Date(t).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
const day = (t: number) => new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
const hasSong = (s: Song) => !!s.audioName || !!s.sunoUrl;

function groupOf(s: Song, sort: Sort): string {
  if (sort === 'date') return month(s.createdAt);
  if (sort === 'loved') return s.loved ? 'אהבתי' : 'השאר';
  const gid = s.sel.genre?.[0];
  return gid ? group('genre').options.find((o) => o.id === gid)?.he ?? 'בלי סגנון' : 'בלי סגנון';
}

function Player({ song }: { song: Song }) {
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let u = '', live = true;
    setUrl(''); setErr('');
    if (song.audioName) getAudio(song.id).then((b) => { if (live && b) { u = URL.createObjectURL(b); setUrl(u); } else if (live) setErr('הקובץ לא נמצא במכשיר הזה. אפשר להעלות אותו שוב.'); }).catch(() => live && setErr('לא הצלחתי לקרוא את הקובץ.'));
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [song.id, song.audioName]);
  const upload = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('audio/') && !f.type.startsWith('video/')) { setErr('זה לא קובץ שמע. ב-Suno בוחרים Download ואז MP3 Audio.'); return; }
    try { await putAudio(song.id, f); updateSong(song.id, { audioName: f.name }); } catch { setErr('אין מקום לשמור את הקובץ בדפדפן. אפשר לשמור במקומו את הקישור ל-Suno.'); }
  };
  return (
    <div className="player">
      <div className="cb-head">
        <span className="cb-he">השיר עצמו</span>
        <span className="cb-hint-in">{song.audioName ? song.audioName : 'מורידים מ-Suno כקובץ שמע, ומעלים לכאן'}</span>
        <button type="button" className="press chip" onClick={() => input.current?.click()}>{song.audioName ? 'החלפת קובץ' : 'העלאת קובץ שמע'}</button>
        {song.audioName && <button type="button" className="press chip" onClick={async () => { await delAudio(song.id).catch(() => {}); updateSong(song.id, { audioName: '' }); }}>הסרה</button>}
        <input ref={input} type="file" accept="audio/*,video/mp4" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {url && <audio controls src={url} className="audio" />}
      {err && <p className="msg msg-problem" role="alert">{err}</p>}
      <div className="suno-link">
        <label htmlFor="suno-url" className="cb-he">קישור ב-Suno</label>
        <input id="suno-url" className="field" dir="ltr" type="url" placeholder="https://suno.com/song/..." value={song.sunoUrl} onChange={(e) => updateSong(song.id, { sunoUrl: e.target.value.trim() })} />
        <a className={`press chip${/^https:\/\/(www\.)?suno\.com\//.test(song.sunoUrl) ? '' : ' is-off'}`} href={/^https:\/\/(www\.)?suno\.com\//.test(song.sunoUrl) ? song.sunoUrl : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!/^https:\/\/(www\.)?suno\.com\//.test(song.sunoUrl)}>פתיחה ב-Suno</a>
      </div>
    </div>
  );
}

export default function Library({ route, onSaved }: { route: Route; onSaved: (m: string) => void }) {
  const lib = useLibrary();
  const [sort, setSort] = useState<Sort>('date');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = lib.filter((s) => (filter === 'all' ? true : filter === 'with' ? hasSong(s) : !hasSong(s)));
    if (needle) list = list.filter((s) => [s.title, s.style, s.desc, summary(s.sel)].join(' ').toLowerCase().includes(needle));
    const key = (s: Song) => groupOf(s, sort);
    if (sort === 'genre') list = [...list].sort((a, b) => key(a).localeCompare(key(b), 'he') || b.createdAt - a.createdAt);
    else if (sort === 'loved') list = [...list].sort((a, b) => Number(b.loved) - Number(a.loved) || b.createdAt - a.createdAt);
    else list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    const groups: { name: string; items: Song[] }[] = [];
    for (const s of list) { const n = key(s); const g = groups[groups.length - 1]; if (g && g.name === n) g.items.push(s); else groups.push({ name: n, items: [s] }); }
    return { list, groups };
  }, [lib, sort, filter, q]);

  const current = lib.find((s) => s.id === route.params.id) ?? shown.list[0] ?? null;
  useEffect(() => setConfirm(false), [current?.id]);
  // הקשר: שירים שחולקים הכי הרבה בחירות עם השיר שנבחר
  const similar = useMemo(() => {
    if (!current) return [];
    const mine = new Set(Object.entries(current.sel).flatMap(([g, ids]) => (ids ?? []).map((id) => `${g}:${id}`)));
    return lib.filter((s) => s.id !== current.id)
      .map((s) => ({ s, n: Object.entries(s.sel).flatMap(([g, ids]) => (ids ?? []).map((id) => `${g}:${id}`)).filter((k) => mine.has(k)).length }))
      .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  }, [lib, current]);
  const set = (patch: Partial<Song>) => { if (current) { updateSong(current.id, patch); onSaved('נשמר'); } };

  if (!lib.length) {
    return (
      <main className="app-main lib-empty">
        <div className="empty big">
          <h1>הספרייה עוד ריקה.</h1>
          <p>כאן נשמר כל פרומפט שעבד, יחד עם השיר ש-Suno יצר ממנו.</p>
          <p><strong>שלושה צעדים:</strong> יוצרים פרומפט, מעתיקים ל-Suno, ושומרים כאן.</p>
          <button type="button" className="press btn go" onClick={() => go('create')}>יצירת פרומפט ראשון</button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main library">
      <section className="l-list" aria-label="רשימת השירים">
        <header className="l-tools">
          <h1><span className="num">{lib.length}</span> פרומפטים, <span className="num">{lib.filter((s) => s.loved).length}</span> אהובים</h1>
          <input className="field" type="search" placeholder="חיפוש בכותרת, בסגנון ובתיאור" aria-label="חיפוש בספרייה" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="row-chips" role="group" aria-label="סידור">{SORTS.map((s) => <button key={s.id} type="button" className="press chip" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>{s.he}</button>)}</div>
          <div className="row-chips" role="group" aria-label="סינון">{FILTERS.map((f) => <button key={f.id} type="button" className={`press chip${f.id === 'all' ? ' is-all' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.he}</button>)}</div>
          <p className="l-by">מסודר: {SORTS.find((s) => s.id === sort)!.by}.</p>
        </header>
        <div className="l-items scroll-in">
          {!shown.list.length && <p className="empty">לא נמצא שיר שמתאים. אפשר לנקות את החיפוש או לבחור "הכול".</p>}
          {shown.groups.map((g) => (
            <div key={g.name} className="l-group">
              <h2>{g.name} <span className="num">{g.items.length}</span></h2>
              {g.items.map((s) => (
                <button key={s.id} type="button" className="press l-item" aria-pressed={current?.id === s.id} onClick={() => go('library', { id: s.id })}>
                  <strong>{s.title || 'בלי כותרת'}</strong>
                  <span className="l-tags">{s.loved && <i className="tag t-loved">אהבתי</i>}{hasSong(s) && <i className="tag t-song">שיר</i>}</span>
                  <span className="l-sum">{summary(s.sel) || s.style.slice(0, 60)}</span>
                  <span className="l-date num">{day(s.createdAt)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      {current && (
        <section className="l-detail" aria-label="השיר שנבחר">
          <header className="d-head">
            <input className="field d-title" aria-label="כותרת השיר" value={current.title} placeholder="כותרת" onChange={(e) => set({ title: e.target.value })} />
            <button type="button" className="press btn love" aria-pressed={current.loved} onClick={() => set({ loved: !current.loved })} title="שירים אהובים מלמדים את הטעם שלי">{current.loved ? 'אהבתי' : 'סימון כאהוב'}</button>
          </header>
          <div className="d-staff">
              <Staff compact ariaLabel={`החתימה של ${current.title}`} lines={[{ id: current.id, title: current.title, points: staffPoints(current.sel) }]} labels={STAFF.map((g) => labelsOf(current.sel, g.id))} />
            </div>
          <div className="d-body">
            <div className="d-side">
            {current.desc && <p className="d-desc"><b>התיאור המקורי:</b> {current.desc}</p>}
            <Player song={current} />
            {similar.length > 0 && (
              <div className="d-similar">
                <span className="cb-he">דומים בספרייה</span>
                {similar.map(({ s, n }) => (
                  <button key={s.id} type="button" className="press l-item" onClick={() => go('library', { id: s.id })}>
                    <strong>{s.title || 'בלי כותרת'}</strong>
                    <span className="l-tags"><i className="tag">{n === 1 ? 'בחירה משותפת אחת' : `${n} בחירות משותפות`}</i></span>
                    <span className="l-sum">{summary(s.sel)}</span>
                  </button>
                ))}
              </div>
            )}
            </div>
            <div className="d-texts">
            <CopyBlock testid="d-style" he="סגנון" suno="Style of Music" ltr rows={5} value={current.style} onChange={(v) => set({ style: v })} />
            {current.lyrics && <CopyBlock testid="d-lyrics" he="מילים" suno="Lyrics" rows={6} value={current.lyrics} onChange={(v) => set({ lyrics: v })} />}
            </div>
          </div>
          <footer className="o-actions">
            <button type="button" className="press btn go" onClick={() => go('create', { from: current.id })} title="פותח את מסך היצירה עם אותן בחירות, כדי לשנות דבר אחד ולנסות שוב">גרסה חדשה מזה</button>
            {confirm ? (
              <>
                <span className="c-why">למחוק את "{current.title || 'בלי כותרת'}" ואת קובץ השמע שלו?</span>
                <button type="button" className="press btn danger" onClick={() => { void removeSong(current.id); go('library'); }}>כן, מחיקה</button>
                <button type="button" className="press btn" onClick={() => setConfirm(false)}>ביטול</button>
              </>
            ) : <button type="button" className="press btn" onClick={() => setConfirm(true)}>מחיקה</button>}
            <span className="d-meta">נוצר ב-<span className="num">{day(current.createdAt)}</span> · {current.engine === 'local' ? 'מהבחירות' : 'ליטוש חכם'}</span>
          </footer>
        </section>
      )}
    </main>
  );
}
