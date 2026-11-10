// מסך היצירה: מתארים או בוחרים מימין, והפרומפט נכתב משמאל תוך כדי.
import { useEffect, useMemo, useState } from 'react';
import { GROUPS, PRESETS, STAFF, group, type GroupId, type Selection } from '../data/options';
import { STYLE_LIMIT, bpmOf, compose, countPicks, hasVoice, isInstrumental, isMinor, labelsOf, staffPoints, type Prompt } from '../logic/compose';
import { EMPTY_DRAFT, addSong, getLibrary, setDraft, useDraft, useLibrary } from '../logic/store';
import { taste } from '../logic/taste';
import { polish } from '../logic/ai';
import { playPulse } from '../logic/pulse';
import { go, type Route } from '../logic/route';
import Staff from '../components/Staff';
import { ChipRow, CopyBlock, VoiceArea, copyText } from '../components/ui';

const SUNO = 'https://suno.com/create';
const sig = (sel: Selection, desc: string, words: string) => JSON.stringify([sel, desc.trim(), words.trim()]);

export default function Create({ route, onSaved }: { route: Route; onSaved: (msg: string) => void }) {
  const draft = useDraft();
  const lib = useLibrary();
  const my = useMemo(() => taste(lib), [lib]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [polishedSig, setPolishedSig] = useState('');
  const [saved, setSaved] = useState('');
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { sel, desc, words } = draft;

  // כניסה מקישור: דוגמה, שיר מהספרייה, או הטעם שלי
  useEffect(() => {
    const { preset, from, taste: t } = route.params;
    if (preset) { const p = PRESETS.find((x) => x.id === preset); if (p) setDraft({ ...EMPTY_DRAFT, sel: p.sel }); }
    else if (from) { const s = getLibrary().find((x) => x.id === from); if (s) setDraft({ ...EMPTY_DRAFT, sel: s.sel, desc: s.desc }); }
    else if (t) setDraft({ ...EMPTY_DRAFT, sel: taste(getLibrary()).sel });
    if (preset || from || t) go('create');
  }, [route.params.preset, route.params.from, route.params.taste]);

  const base = useMemo(() => compose(sel, desc, words), [sel, desc, words]);
  const out: Prompt = draft.out ?? base;
  const now = sig(sel, desc, words);
  const stale = !!draft.out && draft.engine !== 'local' && polishedSig !== '' && polishedSig !== now;
  const empty = countPicks(sel) === 0 && !desc.trim() && !draft.out;
  const voice = hasVoice(sel), instrumental = isInstrumental(sel);
  const bpm = bpmOf(sel);

  const toggle = (gid: GroupId, id: string) => {
    const g = group(gid), cur = sel[gid] ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : g.max === 1 ? [id] : cur.length >= g.max ? [...cur.slice(1), id] : [...cur, id];
    const nextSel: Selection = { ...sel, [gid]: next };
    if (gid === 'voice' && next[0] === 'instrumental') delete nextSel.lang;
    setDraft({ sel: nextSel, ...(draft.engine === 'local' ? { out: null } : {}) });
    setSaved('');
  };
  const edit = (k: keyof Prompt, v: string) => setDraft({ out: { ...out, [k]: v } });
  const backToLocal = () => { setDraft({ out: null, note: '', engine: 'local' }); setPolishedSig(''); setError(''); };

  const runPolish = async () => {
    setBusy(true); setError('');
    try {
      const r = await polish({ desc, words, base, sel, instrumental, lang: labelsOf(sel, 'lang')[0] ?? '', taste: my.top.map((t) => t.he).join(', ') });
      setDraft({ out: { title: r.title || base.title, style: r.style || base.style, lyrics: instrumental ? '' : r.lyrics, exclude: r.exclude ?? base.exclude }, note: r.note, engine: r.engine });
      setPolishedSig(now);
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const copyAndOpen = async () => {
    const ok = await copyText(out.style);
    setCopied(ok);
    window.open(SUNO, '_blank', 'noopener');
    setTimeout(() => setCopied(false), 4000);
  };
  const save = () => {
    const s = addSong({ ...out, desc, sel, engine: draft.engine });
    setSaved(s.id);
    onSaved('נשמר בספרייה');
  };
  const pulse = () => { if (!bpm) return; setPlaying(true); setTimeout(() => setPlaying(false), playPulse(bpm, isMinor(sel)) || 0); };

  const labels = STAFF.map((g) => labelsOf(sel, g.id));
  const rows = GROUPS.filter((g) => g.id !== 'lang' || voice);

  return (
    <main className="app-main create">
      <section className="c-in" aria-label="תיאור ובחירה">
        <header className="c-head">
          <h1>מה רוצים לשמוע</h1>
          <p>מתארים במילים, בוחרים בשורות, או שניהם. <strong>הפרומפט נכתב משמאל תוך כדי.</strong></p>
        </header>

        <VoiceArea id="desc" label="תיאור חופשי או מקור השראה" rows={2} value={desc} onValue={(v) => { setDraft({ desc: v }); setSaved(''); }}
          placeholder="למשל: בוקר שבת שקט, כמו פסקול של סרט צרפתי ישן, עם אקורדיון רחוק" />

        <div className="rows">
          {rows.map((g) => (
            <ChipRow key={g.id} g={g} picked={sel[g.id] ?? []} onToggle={(id) => toggle(g.id, id)}
              extra={g.id === 'tempo' ? <button type="button" className="press chip play" onClick={pulse} disabled={!bpm || playing} title="שתי תיבות של פעימות, כדי לשמוע את הקצב שנבחר. זו לא המוזיקה עצמה.">{playing ? 'מתנגן' : 'השמעת הקצב'}</button> : undefined} />
          ))}
        </div>

        {voice && (
          <VoiceArea id="words" label="על מה השיר, או המילים עצמן" rows={2} value={words} onValue={(v) => setDraft({ words: v })}
            placeholder="למשל: שיר על הים של אשדוד בחורף. אפשר גם להדביק מילים מוכנות" />
        )}

        <div className="c-actions">
          <button type="button" className="press btn go" onClick={runPolish} disabled={busy || (!desc.trim() && countPicks(sel) === 0)}
            title="מודל שפה מתרגם את התיאור החופשי למונחים ש-Suno מבין, וכותב מילים אם ביקשת קול">{busy ? 'מלטש' : 'ליטוש חכם'}</button>
          <button type="button" className="press btn" onClick={() => { setDraft({ ...EMPTY_DRAFT, sel: my.sel }); setSaved(''); }} disabled={my.loved === 0}
            title={my.loved ? `ממלא את הבחירות לפי ${my.loved} שירים שסומנו אהבתי` : 'אין עדיין שירים שסומנו אהבתי בספרייה'}>הטעם שלי</button>
          <button type="button" className="press btn" onClick={() => { setDraft(EMPTY_DRAFT); backToLocal(); setSaved(''); }} disabled={empty}>ניקוי</button>
          <span className="c-why">{desc.trim() ? 'יש תיאור חופשי: הליטוש החכם מתרגם אותו לאנגלית של Suno.' : my.loved === 0 ? 'הטעם שלי נפתח אחרי שמסמנים שיר אחד כאהוב בספרייה.' : `הטעם שלי מחושב מ-${my.loved} שירים אהובים.`}</span>
        </div>
        {error && <p className="msg msg-problem" role="alert">{error}</p>}
      </section>

      <section className="c-out" aria-label="הפרומפט ל-Suno">
        <header className="o-head">
          <h2>הפרומפט ל-Suno</h2>
          <span className={`tag e-${draft.engine}`}>{draft.engine === 'local' ? 'מהבחירות' : `ליטוש חכם · ${draft.engine === 'gemini' ? 'Gemini' : 'Claude'}`}</span>
        </header>

        <div className="o-staff">
          <Staff compact ariaLabel="הבחירות הנוכחיות על חמשת הקווים" lines={[{ id: 'now', title: 'עכשיו', points: staffPoints(sel) }]} labels={labels} />
        </div>

        {empty ? (
          <div className="empty">
            <strong>עוד אין פרומפט.</strong>
            <p>בחירה אחת או משפט אחד מספיקים כדי להתחיל.</p>
            <p>אפשר גם לפתוח מדוגמה:</p>
            <div className="row-chips">{PRESETS.slice(0, 4).map((p) => <button key={p.id} type="button" className="press chip" onClick={() => setDraft({ ...EMPTY_DRAFT, sel: p.sel })}>{p.title}</button>)}</div>
          </div>
        ) : (
          <div className="o-blocks scroll-in">
            {stale && (
              <p className="msg msg-insight">הבחירות השתנו מאז הליטוש.
                <button type="button" className="press chip" onClick={runPolish} disabled={busy}>ליטוש מחדש</button>
                <button type="button" className="press chip" onClick={backToLocal}>חזרה לפרומפט מהבחירות</button>
              </p>
            )}
            {draft.note && draft.engine !== 'local' && <p className="msg msg-solution"><b>מה הליטוש עשה:</b> {draft.note}</p>}
            <CopyBlock testid="style" he="סגנון" suno="Style of Music" ltr rows={4} value={out.style} onChange={(v) => edit('style', v)} limit={STYLE_LIMIT}
              hint={desc.trim() && draft.engine === 'local' ? 'התיאור החופשי עוד לא בפנים. ליטוש חכם מתרגם אותו לכאן.' : undefined} />
            {instrumental ? (
              <p className="o-note"><b>בלי מילים:</b> ב-Suno מסמנים <span dir="ltr" className="cb-suno">Instrumental</span>, ושדה המילים נשאר ריק.</p>
            ) : voice ? (
              <CopyBlock testid="lyrics" he="מילים" suno="Lyrics" rows={5} value={out.lyrics} onChange={(v) => edit('lyrics', v)}
                hint={draft.engine === 'local' ? 'זה שלד עם סימוני מבנה. ליטוש חכם כותב מילים מלאות, או שכותבים כאן.' : undefined} />
            ) : (
              <p className="o-note"><b>קול:</b> עוד לא נבחר. בלי בחירה, Suno מחליט לבד אם יש שירה.</p>
            )}
            <div className="o-two">
              <CopyBlock testid="title" he="כותרת" suno="Title" rows={1} value={out.title} onChange={(v) => edit('title', v)} />
              <CopyBlock testid="exclude" he="בלי" suno="Exclude Styles" ltr rows={1} value={out.exclude} onChange={(v) => edit('exclude', v)} />
            </div>
          </div>
        )}

        <footer className="o-actions">
          <button type="button" className="press btn go" onClick={copyAndOpen} disabled={empty || !out.style} title="מעתיק את שדה הסגנון ופותח את Suno בלשונית חדשה. את המילים והכותרת מעתיקים משם בחזרה לכאן.">{copied ? 'הועתק. Suno נפתח' : 'העתקת הסגנון ופתיחת Suno'}</button>
          <button type="button" className="press btn" onClick={save} disabled={empty || !!saved}>{saved ? 'נשמר' : 'שמירה בספרייה'}</button>
          {saved && <button type="button" className="press btn" onClick={() => go('library', { id: saved })}>מעבר לספרייה</button>}
        </footer>
      </section>
    </main>
  );
}
