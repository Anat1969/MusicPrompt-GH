// מסך היצירה: שאלה אחת בכל שלב מימין, והפרומפט נבנה משמאל, שורה לכל שלב, בעברית ובאנגלית.
import { useEffect, useMemo, useState } from 'react';
import { GROUPS, PRESETS, STAFF, group, suggested, type Group, type GroupId, type Selection } from '../data/options';
import { STYLE_LIMIT, bpmOf, compose, composeParts, composeStyleHe, countPicks, hasVoice, isInstrumental, isMinor, labelsOf, staffPoints, type Prompt } from '../logic/compose';
import { EMPTY_DRAFT, addSong, getLibrary, setDraft, useDraft, useLibrary } from '../logic/store';
import { taste } from '../logic/taste';
import { polish } from '../logic/ai';
import { playPulse } from '../logic/pulse';
import { go, type Route } from '../logic/route';
import Staff from '../components/Staff';
import { ChipRow, CopyBlock, VoiceArea, copyText } from '../components/ui';

const SUNO = 'https://suno.com/create';
const sig = (sel: Selection, desc: string, words: string) => JSON.stringify([sel, desc.trim(), words.trim()]);

// סדר השלבים. "תיאור" ראשון, ואחריו השאלות לפי הסדר שבו הן נכנסות לפרומפט.
type StepId = 'desc' | GroupId;
const STEPS: { id: StepId; he: string }[] = [{ id: 'desc', he: 'תיאור' }, ...(['genre', 'mood', 'tempo', 'voice', 'inst', 'use'] as GroupId[]).map((id) => ({ id, he: group(id).he.replace('פס קול ל', 'שימוש') }))];
const ROWS: GroupId[] = ['genre', 'mood', 'tempo', 'voice', 'inst', 'use'];

export default function Create({ route, onSaved }: { route: Route; onSaved: (msg: string) => void }) {
  const draft = useDraft();
  const lib = useLibrary();
  const my = useMemo(() => taste(lib), [lib]);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  // שעון המתנה לליטוש: בלי חיווי, המתנה של חצי דקה נראית כמו תקלה
  useEffect(() => {
    if (!busy) return;
    setSecs(0);
    const t = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);
  const [error, setError] = useState('');
  const [polishedSig, setPolishedSig] = useState('');
  const [saved, setSaved] = useState('');
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<'style' | 'lyrics' | 'meta'>('style');
  const { sel, desc, words } = draft;

  const all = route.params.v === 'all';
  const step = Math.max(0, Math.min(STEPS.length - 1, Number(route.params.s ?? 0) || 0));
  const cur = STEPS[step];
  const goStep = (n: number) => go('create', { s: String(Math.max(0, Math.min(STEPS.length - 1, n))) });

  // כניסה מקישור: דוגמה, שיר מהספרייה, או הטעם שלי. אחרי הטעינה עוברים לשלב הראשון של הבחירות.
  useEffect(() => {
    const { preset, from, taste: t } = route.params;
    if (preset) { const p = PRESETS.find((x) => x.id === preset); if (p) setDraft({ ...EMPTY_DRAFT, sel: p.sel }); }
    else if (from) { const s = getLibrary().find((x) => x.id === from); if (s) setDraft({ ...EMPTY_DRAFT, sel: s.sel, desc: s.desc }); }
    else if (t) setDraft({ ...EMPTY_DRAFT, sel: taste(getLibrary()).sel });
    if (preset || from || t) go('create', { s: '1' });
  }, [route.params.preset, route.params.from, route.params.taste]);

  const base = useMemo(() => compose(sel, desc, words), [sel, desc, words]);
  const parts = useMemo(() => composeParts(sel), [sel]);
  const out: Prompt = draft.out ?? base;
  const now = sig(sel, desc, words);
  const polished = draft.engine !== 'local' && !!draft.out;
  const stale = polished && polishedSig !== '' && polishedSig !== now;
  const empty = countPicks(sel) === 0 && !desc.trim() && !draft.out;
  const voice = hasVoice(sel), instrumental = isInstrumental(sel);
  const bpm = bpmOf(sel);
  const styleHe = polished ? draft.styleHe : composeStyleHe(sel);

  const setSel = (nextSel: Selection) => { setDraft({ sel: nextSel, ...(draft.engine === 'local' ? { out: null } : {}) }); setSaved(''); };
  const toggle = (gid: GroupId, id: string) => {
    const g = group(gid), c = sel[gid] ?? [];
    const next = c.includes(id) ? c.filter((x) => x !== id) : g.max === 1 ? [id] : c.length >= g.max ? [...c.slice(1), id] : [...c, id];
    const nextSel: Selection = { ...sel, [gid]: next };
    if (gid === 'voice' && next[0] === 'instrumental') delete nextSel.lang;
    setSel(nextSel);
  };
  // גרירה על החמשה: האפשרות שמתחת ליד מחליפה את הבחירה בקו הזה
  const dragSet = (line: number, opt: number) => {
    const g = STAFF[line], id = g.options[opt].id;
    if ((sel[g.id] ?? []).length === 1 && sel[g.id]![0] === id) return;
    const nextSel: Selection = { ...sel, [g.id]: [id] };
    if (g.id === 'voice' && id === 'instrumental') delete nextSel.lang;
    setSel(nextSel);
    const n = STEPS.findIndex((s) => s.id === g.id);
    if (!all && n !== step) goStep(n);
  };
  const edit = (k: keyof Prompt, v: string) => setDraft({ out: { ...out, [k]: v } });
  const backToLocal = () => { setDraft({ out: null, note: '', styleHe: '', engine: 'local' }); setPolishedSig(''); setError(''); };

  const runPolish = async () => {
    setBusy(true); setError('');
    try {
      const r = await polish({ desc, words, base, sel, instrumental, lang: labelsOf(sel, 'lang')[0] ?? '', taste: my.top.map((t) => t.he).join(', ') });
      setDraft({ out: { title: r.title || base.title, style: r.style || base.style, lyrics: instrumental ? '' : r.lyrics, exclude: r.exclude ?? base.exclude }, note: r.note, styleHe: r.styleHe ?? '', engine: r.engine });
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
  const save = () => { const s = addSong({ ...out, desc, sel, engine: draft.engine, styleHe, note: polished ? draft.note : '' }); setSaved(s.id); onSaved('נשמר בספרייה'); };
  const pulse = () => { if (!bpm) return; setPlaying(true); setTimeout(() => setPlaying(false), playPulse(bpm, isMinor(sel)) || 0); };
  const clear = () => { setDraft(EMPTY_DRAFT); setPolishedSig(''); setError(''); setSaved(''); goStep(0); };

  const labels = STAFF.map((g) => labelsOf(sel, g.id));
  const valueOf = (id: StepId) => id === 'desc' ? (desc.trim() ? 'נכתב' : '') : labelsOf(sel, id).join(' + ');
  const playBtn = <button type="button" className="press chip play" onClick={pulse} disabled={!bpm || playing} title="שתי תיבות של פעימות, כדי לשמוע את הקצב שנבחר. זו לא המוזיקה עצמה.">{playing ? 'מתנגן' : 'השמעת הקצב'}</button>;

  // שלב של שאלה אחת: השאלה, מה היא משנה בפרומפט, הצעות, והאפשרויות עם המונח באנגלית
  const question = (g: Group) => {
    const sug = g.id === 'genre' ? [] : suggested(sel, g.id);
    const picked = sel[g.id] ?? [];
    const lang = group('lang');
    return (
      <>
        <p className="q-kicker"><i className="sw" style={{ background: g.color }} />שלב <span className="num">{step + 1}</span> מתוך <span className="num">{STEPS.length}</span> · {g.he.replace('פס קול ל', 'שימוש')} · {g.max === 1 ? 'בחירה אחת' : `עד ${g.max} בחירות`}</p>
        <h1>{g.ask}?</h1>
        <p className="q-how"><b>מה זה משנה בפרומפט:</b> {g.how}</p>
        {sug.length > 0 && <p className="q-sug"><mark className="insight">מוצע</mark> לסגנון {labelsOf(sel, 'genre').join(' + ')}: {sug.map((id) => g.options.find((o) => o.id === id)?.he).join(', ')}. <span className="src">מסומנות בקו צהוב, ולא נבחרות לבד.</span></p>}
        <div className="opts" role="group" aria-label={g.he}>
          {g.options.map((o) => (
            <button key={o.id} type="button" className={`press opt${sug.includes(o.id) ? ' is-sug' : ''}`} aria-pressed={picked.includes(o.id)} onClick={() => toggle(g.id, o.id)}>
              <strong>{o.he}</strong><span dir="ltr">{o.en}</span>
            </button>
          ))}
          {g.id === 'tempo' && playBtn}
        </div>
        {g.id === 'voice' && voice && (
          <div className="q-sub">
            <ChipRow g={lang} picked={sel.lang ?? []} onToggle={(id) => toggle('lang', id)} />
            <VoiceArea id="words" label="על מה השיר, או המילים עצמן" rows={2} value={words} onValue={(v) => setDraft({ words: v })} placeholder="למשל: שיר על הים של אשדוד בחורף. אפשר גם להדביק מילים מוכנות" />
          </div>
        )}
        <p className="q-skip">אפשר לדלג. שלב שלא נבחר בו דבר פשוט לא נכנס לפרומפט.</p>
      </>
    );
  };

  return (
    <main className="app-main create">
      <nav className="steps" aria-label="שלבי היצירה">
        <div className="steps-list">
          {STEPS.map((s, i) => {
            const v = valueOf(s.id), g = s.id === 'desc' ? null : group(s.id);
            return (
              <button key={s.id} type="button" className={`press step${v ? ' is-done' : ''}`} aria-current={!all && i === step ? 'step' : undefined} onClick={() => goStep(i)}>
                <span className="step-n num" style={g ? { background: g.color } : undefined}>{i + 1}</span>
                <span className="step-t">{s.he}</span>
                <span className="step-v">{v || 'לא נבחר'}</span>
              </button>
            );
          })}
        </div>
        <div className="steps-tools">
          <div className="row-chips" role="group" aria-label="תצוגה">
            <button type="button" className="press chip" aria-pressed={!all} onClick={() => goStep(step)} title="שאלה אחת בכל פעם, עם הסבר והצעות">שלב אחד</button>
            <button type="button" className="press chip is-all" aria-pressed={all} onClick={() => go('create', { v: 'all' })} title="כל השאלות יחד, בלי הסברים. למי שכבר מכיר">הכול</button>
          </div>
          <button type="button" className="press btn nav" onClick={() => goStep(step - 1)} disabled={all || step === 0}>הקודם</button>
          <button type="button" className="press btn nav go" onClick={() => goStep(step + 1)} disabled={all || step === STEPS.length - 1}>הבא</button>
        </div>
      </nav>

      <section className="c-in" aria-label="השאלה הנוכחית">
        <div className="q">
          {all ? (
            <>
              <VoiceArea id="desc" label="תיאור חופשי או מקור השראה" rows={2} value={desc} onValue={(v) => { setDraft({ desc: v }); setSaved(''); }} placeholder="למשל: בוקר שבת שקט, כמו פסקול של סרט צרפתי ישן, עם אקורדיון רחוק" />
              <div className="rows">
                {GROUPS.filter((g) => g.id !== 'lang' || voice).map((g) => <ChipRow key={g.id} g={g} picked={sel[g.id] ?? []} onToggle={(id) => toggle(g.id, id)} extra={g.id === 'tempo' ? playBtn : undefined} />)}
              </div>
              {voice && <VoiceArea id="words" label="על מה השיר, או המילים עצמן" rows={2} value={words} onValue={(v) => setDraft({ words: v })} placeholder="למשל: שיר על הים של אשדוד בחורף" />}
            </>
          ) : cur.id === 'desc' ? (
            <>
              <p className="q-kicker">שלב <span className="num">1</span> מתוך <span className="num">{STEPS.length}</span> · תיאור · לא חובה</p>
              <h1>מה רוצים לשמוע?</h1>
              <p className="q-how"><b>מה זה משנה בפרומפט:</b> התיאור לא נכנס כמו שהוא, כי Suno מבין אנגלית מוזיקלית. <strong>ליטוש חכם</strong> מתרגם אותו למונחים, ומוסיף אותם לבחירות מהשלבים הבאים.</p>
              <VoiceArea id="desc" label="תיאור חופשי או מקור השראה" rows={3} value={desc} onValue={(v) => { setDraft({ desc: v }); setSaved(''); }} placeholder="למשל: בוקר שבת שקט, כמו פסקול של סרט צרפתי ישן, עם אקורדיון רחוק" />
              <div className="q-start">
                <span className="cb-he">או להתחיל ממשהו מוכן:</span>
                {PRESETS.map((p) => <button key={p.id} type="button" className="press chip" onClick={() => { setDraft({ ...EMPTY_DRAFT, sel: p.sel }); goStep(1); }}>{p.title}</button>)}
                <button type="button" className="press chip taste" onClick={() => { setDraft({ ...EMPTY_DRAFT, sel: my.sel }); goStep(1); }} disabled={my.loved === 0}
                  title={my.loved ? `ממלא את הבחירות לפי ${my.loved} שירים שסומנו אהבתי` : 'נפתח אחרי שמסמנים שיר אחד כאהוב בספרייה'}>הטעם שלי</button>
              </div>
              <p className="q-skip">אפשר לדלג על התיאור, ולבחור שלב אחרי שלב בעזרת "הבא".</p>
            </>
          ) : question(group(cur.id))}
        </div>

        <div className="c-staff">
          <p className="staff-how"><b>איך הדיאגרמה עובדת:</b> כל קו הוא שאלה, וכל נקודה עליו היא תשובה אפשרית, מהעדין מימין אל החזק משמאל. <strong>העיגול הצבעוני הוא הבחירה שלך.</strong> גוררים אותו לאורך הקו, או לוחצים על נקודה, והפרומפט משתנה מיד.</p>
          <Staff ariaLabel="הבחירות על חמשת הקווים. גרירה משנה בחירה" lines={[{ id: 'now', title: 'עכשיו', points: staffPoints(sel) }]} labels={labels}
            focus={all || cur.id === 'desc' ? undefined : STAFF.findIndex((g) => g.id === cur.id)} onSet={dragSet} />
        </div>
      </section>

      <section className="c-out" aria-label="הפרומפט ל-Suno">
        <header className="o-head">
          <h2>כך הפרומפט נבנה</h2>
          <button type="button" className="press chip" onClick={clear} disabled={empty} title="מוחק את התיאור ואת כל הבחירות, ומתחיל מהשלב הראשון">ניקוי</button>
          <span className={`tag e-${draft.engine}`}>{draft.engine === 'local' ? 'מהבחירות' : `ליטוש חכם · ${draft.engine === 'gemini' ? 'Gemini' : 'Claude'}`}</span>
        </header>

        <table className="build">
          <thead><tr><th>שלב</th><th>בעברית</th><th>באנגלית, מה ש-Suno מקבל</th></tr></thead>
          <tbody>
            {ROWS.map((gid) => {
              const g = group(gid), part = parts.find((x) => x.group === gid), n = STEPS.findIndex((s) => s.id === gid);
              return (
                <tr key={gid} className={`${part ? '' : 'is-off'}${!all && n === step ? ' is-now' : ''}`} onClick={() => goStep(n)} title="לחיצה עוברת לשלב הזה">
                  <th><i className="sw" style={{ background: g.color }} />{STEPS[n].he}</th>
                  <td>{part ? part.he : 'לא נבחר'}</td>
                  <td dir="ltr">{part ? part.en : ''}</td>
                </tr>
              );
            })}
            <tr className={`${desc.trim() ? '' : 'is-off'}${!all && step === 0 ? ' is-now' : ''}`} onClick={() => goStep(0)} title="לחיצה עוברת לשלב הזה">
              <th><i className="sw sw-desc" />תיאור</th>
              <td colSpan={2}>{!desc.trim() ? 'לא נכתב' : polished && !stale ? 'תורגם ונוסף לפרומפט' : 'נכתב, ועוד לא בפרומפט. ליטוש חכם מוסיף אותו.'}</td>
            </tr>
          </tbody>
        </table>

        {empty ? (
          <div className="empty">
            <strong>עוד אין פרומפט.</strong>
            <p>כל שלב שעונים עליו מוסיף שורה לטבלה, ומהשורות נבנה הפרומפט.</p>
          </div>
        ) : (
          <div className="o-blocks scroll-in">
            {stale && (
              <p className="msg msg-insight">הבחירות השתנו מאז הליטוש.
                <button type="button" className="press chip" onClick={runPolish} disabled={busy}>ליטוש מחדש</button>
                <button type="button" className="press chip" onClick={backToLocal}>חזרה לפרומפט מהבחירות</button>
              </p>
            )}
            {busy && <p className="msg msg-insight" role="status" data-testid="waiting"><b>הליטוש בעבודה, <span className="num">{secs}</span> שניות.</b> בדרך כלל עד 15 שניות, ולפעמים עד דקה כשהמודל החינמי עמוס. הפרומפט מהבחירות נשאר כאן בינתיים.</p>}
            {draft.note && polished && !busy && <p className="msg msg-solution"><b>מה הליטוש עשה:</b> {draft.note}</p>}
            {error && <p className="msg msg-problem" role="alert">{error}</p>}
            <div className="o-tabs" role="tablist" aria-label="שדות להעתקה ל-Suno">
              {([['style', 'הפרומפט המלא'], ['lyrics', instrumental ? 'מילים: אין' : 'מילים'], ['meta', 'כותרת ובלי']] as const).map(([id, he], i) => (
                <button key={id} type="button" role="tab" className="press chip" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}><span className="num">{i + 1}</span> {he}</button>
              ))}
              <span className="c-why">שלושה שדות, כמו ב-Suno. מעתיקים כל אחד למקומו.</span>
            </div>
            {tab === 'style' && (
              <>
                <CopyBlock testid="style" he="הפרומפט המלא" suno="Style of Music" ltr rows={4} value={out.style} onChange={(v) => edit('style', v)} limit={STYLE_LIMIT} />
                <p className="he-read" data-testid="style-he"><b>ובעברית:</b> {styleHe || 'אין תרגום. ליטוש מחדש יוסיף אותו.'}{draft.engine === 'local' && draft.out && draft.out.style !== base.style ? ' (האנגלית נערכה ביד, והעברית מתארת את הבחירות.)' : ''}</p>
              </>
            )}
            {tab === 'lyrics' && (instrumental ? (
              <p className="o-note"><b>בלי מילים:</b> ב-Suno מסמנים <span dir="ltr" className="cb-suno">Instrumental</span>, ושדה המילים נשאר ריק.</p>
            ) : voice ? (
              <CopyBlock testid="lyrics" he="מילים" suno="Lyrics" rows={7} value={out.lyrics} onChange={(v) => edit('lyrics', v)}
                hint={draft.engine === 'local' ? 'זה שלד עם סימוני מבנה. ליטוש חכם כותב מילים מלאות, או שכותבים כאן.' : undefined} />
            ) : (
              <p className="o-note"><b>קול:</b> עוד לא נבחר. בלי בחירה, Suno מחליט לבד אם יש שירה. <button type="button" className="press chip" onClick={() => goStep(4)}>לשלב הקול</button></p>
            ))}
            {tab === 'meta' && (
              <>
                <CopyBlock testid="title" he="כותרת" suno="Title" rows={1} value={out.title} onChange={(v) => edit('title', v)} />
                <CopyBlock testid="exclude" he="בלי" suno="Exclude Styles" ltr rows={2} value={out.exclude} onChange={(v) => edit('exclude', v)} hint="מה ש-Suno לא יכניס לשיר. מתמלא לבד לפי הבחירות." />
              </>
            )}
          </div>
        )}

        <footer className="o-actions">
          <button type="button" className="press btn" onClick={runPolish} disabled={busy || empty}
            title="מודל שפה מתרגם את התיאור החופשי למונחים ש-Suno מבין, מעשיר את הפרומפט, וכותב מילים אם ביקשת קול">{busy ? `מלטש, ${secs}` : 'ליטוש חכם'}</button>
          <button type="button" className="press btn go" onClick={copyAndOpen} disabled={empty || !out.style} title="מעתיק את הפרומפט המלא ופותח את Suno בלשונית חדשה. את המילים והכותרת מעתיקים מכאן אחר כך.">{copied ? 'הועתק. Suno נפתח' : 'העתקה ופתיחת Suno'}</button>
          <button type="button" className="press btn" onClick={save} disabled={empty || !!saved}>{saved ? 'נשמר' : 'שמירה בספרייה'}</button>
          {saved && <button type="button" className="press btn" onClick={() => go('library', { id: saved })}>מעבר לספרייה</button>}
        </footer>
      </section>
    </main>
  );
}
