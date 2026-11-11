// הספרייה: מה שעבד. רשימה מקובצת מימין, והשיר שנבחר נפתח במקום משמאל, כשהרשימה נשארת גלויה.
import { useEffect, useMemo, useRef, useState } from 'react';
import { group } from '../data/options';
import { staffPoints, summary, labelsOf, composeStyleHe } from '../logic/compose';
import { STAFF } from '../data/options';
import { loadAudio, saveAudio, dropAudio, loadImage, saveImage, dropImage, removeSong, updateSong, useLibrary, type Song } from '../logic/store';
import { KINDS, LAYER, composeVisual, haikuOf, reading, type Kind } from '../logic/visual';
import { polishVisual } from '../logic/ai';
import { useCloud } from '../logic/cloud';
import { go, type Route } from '../logic/route';
import Staff from '../components/Staff';
import { CopyBlock, copyText } from '../components/ui';

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
    if (song.audioName) loadAudio(song.id).then((b) => { if (live && b) { u = URL.createObjectURL(b); setUrl(u); } else if (live) setErr('הקובץ לא נמצא במכשיר הזה ולא בענן. אפשר להעלות אותו שוב.'); }).catch(() => live && setErr('לא הצלחתי לקרוא את הקובץ.'));
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [song.id, song.audioName]);
  const upload = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('audio/') && !f.type.startsWith('video/')) { setErr('זה לא קובץ שמע. ב-Suno בוחרים Download ואז MP3 Audio.'); return; }
    try { await saveAudio(song.id, f); } catch { setErr('אין מקום לשמור את הקובץ בדפדפן. אפשר לשמור במקומו את הקישור ל-Suno.'); }
  };
  return (
    <div className="player">
      <div className="cb-head">
        <span className="cb-he">השיר עצמו</span>
        <span className="cb-hint-in">{song.audioName ? song.audioName : 'מורידים מ-Suno כקובץ שמע, ומעלים לכאן'}</span>
        <button type="button" className="press chip" onClick={() => input.current?.click()}>{song.audioName ? 'החלפת קובץ' : 'העלאת קובץ שמע'}</button>
        {song.audioName && <button type="button" className="press chip" onClick={() => void dropAudio(song.id)}>הסרה</button>}
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

// לוח אחד על הבמה של השיר: שם המעטפת (מבחוץ, מבפנים, על הגוף), התמונה, וההייקו שמתמצת את האווירה שלה.
// מסגרת אחת בשלישיית ההשראה: גוררים אליה תמונה, מדביקים, או לוחצים להעלאה. מתחתיה כפתור שמעתיק את הפרומפט שלה.
function Frame({ song, kind, he, layer, haiku, selected, onSelect, onCopy, prompt }: { song: Song; kind: Kind; he: string; layer: string; haiku: string; selected: boolean; onSelect: () => void; onCopy: () => void; prompt: string }) {
  const [url, setUrl] = useState('');
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const name = song.imgs?.[kind] ?? '';
  useEffect(() => {
    let u = '', live = true;
    setUrl(''); setMsg('');
    if (name) loadImage(song.id, kind).then((b) => { if (live && b) { u = URL.createObjectURL(b); setUrl(u); } else if (live) setMsg('התמונה לא נמצאה במכשיר הזה.'); }).catch(() => {});
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [song.id, kind, name]);
  const take = async (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg('זה לא קובץ תמונה.'); return; }
    try { await saveImage(song.id, kind, f, f.name || 'תמונה מודבקת'); setMsg(''); } catch { setMsg('אין מקום לשמור את התמונה בדפדפן.'); }
  };
  // הדבקה: תמונה שהועתקה נכנסת למסגרת שנבחרה
  useEffect(() => {
    if (!selected) return;
    const on = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
      if (f) { e.preventDefault(); void take(f); }
    };
    window.addEventListener('paste', on);
    return () => window.removeEventListener('paste', on);
  }, [selected, song.id, kind]);
  const copy = async () => { onSelect(); onCopy(); if (await copyText(prompt)) { setDone(true); setTimeout(() => setDone(false), 1800); } };
  return (
    <figure className={`frame${selected ? ' is-sel' : ''}${over ? ' is-over' : ''}`} data-kind={kind}>
      <p className="frame-eye"><span>{layer}</span><strong>{he}</strong></p>
      <div className="frame-box" role="button" tabIndex={0} aria-label={`מסגרת ${he}. ${url ? 'יש תמונה. לחיצה מחליפה אותה' : 'ריקה. גוררים לכאן תמונה, מדביקים, או לוחצים להעלאה'}`}
        onClick={() => { onSelect(); input.current?.click(); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); input.current?.click(); } }}
        onFocus={onSelect} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onSelect(); void take(e.dataTransfer.files?.[0]); }}>
        {url ? <img src={url} alt={`${he} בהשראת ${song.title}`} /> : <span className="frame-empty"><strong>{over ? 'משחררים כאן' : 'מקום לתמונה'}</strong><span>גוררים, מדביקים או לוחצים</span></span>}
      </div>
      <blockquote className="frame-haiku" data-testid={`haiku-${kind}`}>{haiku.split('\n').map((l, i) => <span key={i}>{l}</span>)}</blockquote>
      <figcaption>
        <button type="button" className={`press chip${done ? ' is-done' : ''}`} onClick={copy} title="מעתיק את הפרומפט לתמונה הזו, בעברית">{done ? 'הועתק' : 'העתקת פרומפט'}</button>
        {url && <button type="button" className="press chip" onClick={() => void dropImage(song.id, kind)} aria-label={`הסרת התמונה ממסגרת ${he}`} title="הסרת התמונה">×</button>}
      </figcaption>
      {msg && <p className="msg msg-problem" role="alert">{msg}</p>}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ''; }} />
    </figure>
  );
}

export default function Library({ route, onSaved, onLogin }: { route: Route; onSaved: (m: string) => void; onLogin: () => void }) {
  const lib = useLibrary();
  const cloud = useCloud();
  const [sort, setSort] = useState<Sort>('date');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [tab, setTab] = useState<'prompt' | 'lyrics' | 'visual' | 'similar' | null>(null);   // המגירה שפתוחה מעל הבמה
  const [kind, setKind] = useState<Kind>('building');
  const [vbusy, setVbusy] = useState(false);
  const [vsecs, setVsecs] = useState(0);
  const [verr, setVerr] = useState('');
  useEffect(() => { if (!vbusy) return; setVsecs(0); const t = setInterval(() => setVsecs((n) => n + 1), 1000); return () => clearInterval(t); }, [vbusy]);

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
  useEffect(() => { setConfirm(false); setVerr(''); setTab(null); }, [current?.id]);
  const visual = useMemo(() => current?.visual ?? composeVisual(current?.sel ?? {}, current?.title ?? ''), [current?.visual, current?.sel, current?.title]);
  const enrich = async () => {
    if (!current) return;
    setVbusy(true); setVerr('');
    try { const v = await polishVisual({ title: current.title, desc: current.desc, style: current.style, styleHe: current.styleHe || composeStyleHe(current.sel), base: visual }); updateSong(current.id, { visual: v }); onSaved('נשמר'); }
    catch (e) { setVerr((e as Error).message); }
    setVbusy(false);
  };
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
          {cloud.uid
            ? <p className="src">{cloud.status === 'syncing' ? 'מסנכרן עם הענן' : 'מחוברת לענן, ואין בו עדיין שירים.'} <span dir="ltr">{cloud.email}</span></p>
            : <p className="src">יש כבר ספרייה במכשיר אחר? <button type="button" className="press chip" onClick={onLogin}>כניסה לספרייה בענן</button></p>}
        </div>
      </main>
    );
  }

  const issue = current ? lib.length - lib.findIndex((x) => x.id === current.id) : 0;
  const haiku = current ? haikuOf(visual, current.sel) : null;
  const TABS: { id: 'prompt' | 'lyrics' | 'visual' | 'similar'; he: string }[] = [
    { id: 'prompt', he: 'הפרומפט באנגלית' }, { id: 'lyrics', he: current?.lyrics ? 'מילים' : 'מילים: אין' },
    { id: 'visual', he: 'פרומפט לתמונה' }, { id: 'similar', he: `דומים בספרייה (${similar.length})` },
  ];

  return (
    <main className="app-main library">
      <section className="l-list" aria-label="התפריט: רשימת השירים">
        <header className="l-tools">
          <p className="menu-k">התפריט</p>
          <h1><span className="num">{lib.length}</span> שירים, <span className="num">{lib.filter((s) => s.loved).length}</span> אהובים</h1>
          <input className="field" type="search" placeholder="חיפוש בכותרת, בסגנון ובתיאור" aria-label="חיפוש בספרייה" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="row-chips" role="group" aria-label="סידור">{SORTS.map((s) => <button key={s.id} type="button" className="press chip" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>{s.he}</button>)}</div>
          <div className="row-chips" role="group" aria-label="סינון">{FILTERS.map((f) => <button key={f.id} type="button" className={`press chip${f.id === 'all' ? ' is-all' : ''}`} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.he}</button>)}</div>
          <p className="l-by">מסודר: {SORTS.find((s) => s.id === sort)!.by}.</p>
          {cloud.uid
            ? <p className={`l-cloud${cloud.status === 'error' ? ' is-err' : ''}`}>{cloud.status === 'syncing' ? 'מסנכרן עם הענן' : cloud.status === 'error' ? cloud.error : 'שמור בענן, וזמין בכל מכשיר.'} <span className="src" dir="ltr">{cloud.email}</span></p>
            : <p className="l-cloud is-local">שמור רק במכשיר הזה. <button type="button" className="press chip" onClick={onLogin}>כניסה לספרייה בענן</button></p>}
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

      {current && haiku && (
        <article className="l-detail stage" aria-label="הבמה של השיר שנבחר">
          <header className="st-head">
            <p className="st-kicker">במה מס' <span className="num">{String(issue).padStart(2, '0')}</span> · <span className="num">{day(current.createdAt)}</span> · {summary(current.sel) || 'בלי בחירות'}</p>
            <div className="d-head">
              <input className="field d-title" aria-label="כותרת השיר" value={current.title} placeholder="כותרת" onChange={(e) => set({ title: e.target.value })} />
              <button type="button" className="press btn love" aria-pressed={current.loved} onClick={() => set({ loved: !current.loved })} title="שירים אהובים מלמדים את הטעם שלי">{current.loved ? 'אהבתי' : 'סימון כאהוב'}</button>
            </div>
            <p className="st-deck" data-testid="d-distill"><mark className="insight">{visual.distill}</mark></p>
          </header>

          <div className="d-strip" aria-label="שלוש מעטפות של אותה אווירה">
            {KINDS.map((k) => (
              <Frame key={k.id} song={current} kind={k.id} he={k.he} layer={LAYER[k.id]} haiku={haiku[k.id]} selected={kind === k.id} onSelect={() => setKind(k.id)} onCopy={() => setTab('visual')} prompt={visual[k.id]} />
            ))}
          </div>

          <aside className="st-page" aria-label="מה יצרנו">
            <h2>מה יצרנו</h2>
            <p className="st-lead" data-testid="d-he">{current.styleHe || composeStyleHe(current.sel) || 'אין ניסוח בעברית לשיר הזה.'}</p>
            {current.desc && <p className="st-desc"><b>כך זה התחיל:</b> "{current.desc}"</p>}
            {current.note && <p className="st-desc" data-testid="d-note"><b>מה הליטוש עשה:</b> {current.note}</p>}
            <div className="st-key" aria-label="איך המוזיקה הפכה לתמונה">
              <p className="label">איך המוזיקה הפכה לתמונה</p>
              {reading(current.sel).map((r) => <p key={r.from}><b>{r.from}</b><i>הפכה ל{r.to}</i><span>{r.text}</span></p>)}
            </div>
            <div className="d-staff">
              <Staff compact ariaLabel={`החתימה של ${current.title}`} lines={[{ id: current.id, title: current.title, points: staffPoints(current.sel) }]} labels={STAFF.map((g) => labelsOf(current.sel, g.id))} />
            </div>
            <Player song={current} />
          </aside>

          {tab && (
            <div className="st-drawer" role="region" aria-label="מאחורי הקלעים">
              <button type="button" className="press chip st-close" onClick={() => setTab(null)} aria-label="סגירת המגירה">×</button>
              <div className="d-tab scroll-in">
                {tab === 'prompt' && <CopyBlock testid="d-style" he="באנגלית, מה ש-Suno קיבל" suno="Style of Music" ltr rows={5} value={current.style} onChange={(v) => set({ style: v })} hint="זה הטקסט שהועתק ל-Suno. הניסוח בעברית מופיע על הבמה, תחת מה יצרנו." />}
                {tab === 'lyrics' && (current.lyrics
                  ? <CopyBlock testid="d-lyrics" he="מילים" suno="Lyrics" rows={9} value={current.lyrics} onChange={(v) => set({ lyrics: v })} />
                  : <p className="o-note"><b>בלי מילים:</b> השיר הזה אינסטרומנטלי, או שהמילים נכתבו ב-Suno.</p>)}
                {tab === 'visual' && (
                  <>
                    <div className="row-chips" role="group" aria-label="איזו תמונה">
                      {KINDS.map((k) => <button key={k.id} type="button" className="press chip" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} title={k.hint}>{LAYER[k.id]}: {k.he}</button>)}
                      <button type="button" className="press chip rich" onClick={enrich} disabled={vbusy} title="מודל שפה כותב מחדש את שלושת הפרומפטים ואת שלושת ההייקו, כמוזיקאי, אדריכל ומעצב אופנה, לפי התיאור והפרומפט של השיר">{vbusy ? `מנסח, ${vsecs}` : 'ניסוח עשיר'}</button>
                      <span className={`tag e-${visual.engine}`}>{visual.engine === 'local' ? 'מהבחירות' : 'ניסוח עשיר · Gemini'}</span>
                    </div>
                    {verr && <p className="msg msg-problem" role="alert">{verr}</p>}
                    <CopyBlock testid="d-visual" he={`פרומפט לתמונה: ${KINDS.find((k) => k.id === kind)!.he}`} suno="Midjourney" rows={7} value={visual[kind]} onChange={(v) => set({ visual: { ...visual, [kind]: v } })}
                      hint="בעברית, בחמש שכבות: מתח, מקום, חומר, אור וקומפוזיציה. מעתיקים לכלי התמונות, ואת התוצאה גוררים למסגרת על הבמה." />
                  </>
                )}
                {tab === 'similar' && (similar.length ? (
                  <div className="d-similar">
                    {similar.map(({ s, n }) => (
                      <button key={s.id} type="button" className="press l-item" onClick={() => go('library', { id: s.id })}>
                        <strong>{s.title || 'בלי כותרת'}</strong>
                        <span className="l-tags"><i className="tag">{n === 1 ? 'בחירה משותפת אחת' : `${n} בחירות משותפות`}</i></span>
                        <span className="l-sum">{summary(s.sel)}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="o-note">אין עדיין שיר אחר בספרייה שחולק בחירות עם השיר הזה.</p>)}
              </div>
            </div>
          )}

          <footer className="o-actions st-foot">
            <div className="o-tabs" role="tablist" aria-label="מאחורי הקלעים">
              <span className="label">מאחורי הקלעים</span>
              {TABS.map((t) => <button key={t.id} type="button" role="tab" className="press chip" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(tab === t.id ? null : t.id)}>{t.he}</button>)}
            </div>
            <button type="button" className="press btn go" onClick={() => go('create', { from: current.id })} title="פותח את מסך היצירה עם אותן בחירות, כדי לשנות דבר אחד ולנסות שוב">גרסה חדשה מזה</button>
            {confirm ? (
              <>
                <span className="c-why">למחוק את "{current.title || 'בלי כותרת'}", את השיר ואת התמונות שלו?</span>
                <button type="button" className="press btn danger" onClick={() => { void removeSong(current.id); go('library'); }}>כן, מחיקה</button>
                <button type="button" className="press btn" onClick={() => setConfirm(false)}>ביטול</button>
              </>
            ) : <button type="button" className="press btn" onClick={() => setConfirm(true)}>מחיקה</button>}
          </footer>
        </article>
      )}
    </main>
  );
}
