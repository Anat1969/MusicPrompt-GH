// דף הבית: סיפור בשלושה מסכים. פתיח (הכאב, הפתרון וסרטון), החמשה (הספרייה האמיתית כקווים), ומה בפנים (מפת התוכן ושכבת הידע).
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRESETS, STAFF, TOTAL_OPTIONS } from '../data/options';
import { staffPoints, summary } from '../logic/compose';
import { useLibrary } from '../logic/store';
import { taste } from '../logic/taste';
import { go } from '../logic/route';
import Staff, { type StaffLine } from '../components/Staff';
import { Rich } from '../components/ui';

// ההייקו מקוריים. אחד נבחר בכל כניסה.
const HAIKU: [string, string, string][] = [
  ['חמישה קווים,', 'בחירה אחת על כל קו:', 'שיר שעוד לא נשמע.'],
  ['מילה בעברית', 'עוברת דרך החמשה', 'וחוזרת כצליל.'],
  ['מה שאהבתי', 'משאיר קו עבה יותר', 'בפעם הבאה.'],
];

export default function Home() {
  const lib = useLibrary();
  const my = useMemo(() => taste(lib), [lib]);
  const own = lib.length > 0;
  const lines: StaffLine[] = useMemo(() => {
    const base: StaffLine[] = own
      ? lib.slice(0, 12).map((s) => ({ id: s.id, title: s.title || 'בלי כותרת', points: staffPoints(s.sel), kind: 'song' as const }))
      : PRESETS.map((p) => ({ id: p.id, title: p.title, points: staffPoints(p.sel), kind: 'preset' as const }));
    return my.loved ? [...base, { id: 'taste', title: 'הטעם שלי', points: staffPoints(my.sel), kind: 'taste' as const }] : base;
  }, [lib, own, my]);

  const [hover, setHover] = useState<string | null>(null);
  const [auto, setAuto] = useState(() => Math.floor(Math.random() * 6));
  const [haiku] = useState(() => HAIKU[Math.floor(Math.random() * HAIKU.length)]);
  useEffect(() => {
    if (hover || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setAuto((n) => n + 1), 3200);
    return () => clearInterval(t);
  }, [hover]);
  const active = hover ?? lines[auto % lines.length]?.id ?? null;
  const cur = lines.find((l) => l.id === active);
  const curSel = active === 'taste' ? my.sel : own ? lib.find((s) => s.id === active)?.sel : PRESETS.find((p) => p.id === active)?.sel;
  const pick = (id: string) => (id === 'taste' ? go('create', { taste: '1' }) : own ? go('library', { id }) : go('create', { preset: id }));

  const cards = [
    { n: '01', label: 'יצירה', title: 'פרומפט חדש', desc: 'תיאור חופשי, הקלטה או בחירה. אפשרויות לבחירה:', value: String(TOTAL_OPTIONS), on: () => go('create') },
    { n: '02', label: 'ספרייה', title: 'מה שעבד', desc: 'הפרומפט, הקישור והשיר עצמו. שמורים עכשיו:', value: String(lib.length), on: () => go('library') },
    { n: '03', label: 'הטעם שלי', title: 'מתחילים ממה שאהבתי', desc: my.loved ? 'הבחירות מתמלאות לבד. שירים אהובים:' : 'נפתח אחרי סימון ראשון בספרייה. שירים אהובים:', value: String(my.loved), on: () => (my.loved ? go('create', { taste: '1' }) : go('library')) },
  ];

  // שלושת המסכים של דף הבית, עם מחוון שמראה איפה אני
  const SCREENS = [{ id: 'open', he: 'פתיח' }, { id: 'staff', he: 'החמשה' }, { id: 'inside', he: 'מה בפנים' }];
  const root = useRef<HTMLElement>(null);
  const [screen, setScreen] = useState('open');
  useEffect(() => {
    const el = root.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setScreen((e.target as HTMLElement).dataset.screen ?? 'open'); }, { root: el, threshold: 0.55 });
    el.querySelectorAll('[data-screen]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  const to = (id: string) => root.current?.querySelector(`[data-screen="${id}"]`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

  return (
    <main className="app-main home" ref={root}>
      <nav className="h-dots" aria-label="מסכי דף הבית">
        {SCREENS.map((x, i) => <button key={x.id} type="button" className="press h-dot" aria-current={screen === x.id ? 'true' : undefined} onClick={() => to(x.id)}><span className="num">{i + 1}</span><span>{x.he}</span></button>)}
      </nav>

      <section className="h-screen h-open" data-screen="open" aria-label="פתיח">
        <div className="h-pitch">
          <p className="h-kicker">פרטיטורה · מוזיקה לפי הטעם שלך, בעזרת Suno</p>
          <h1 className="h-pain">המוזיקה כבר בראש.<br /><mark className="insight">המילים חסרות.</mark></h1>
          <ul className="h-pains" aria-label="הכאב">
            <li>Suno מבקש <strong>אנגלית של מפיקים</strong>, לא תיאור של הרגשה.</li>
            <li><strong>הטעם האישי</strong> הולך לאיבוד בתרגום.</li>
            <li>שיר שהצליח <strong>נשכח</strong>, והבא מתחיל מאפס.</li>
          </ul>
          <h2 className="h-fix">פרטיטורה מתרגמת טעם לפס קול.</h2>
          <ol className="h-fixes" aria-label="הפתרון">
            <li><span className="num">1</span><span><strong>עונים על שבע שאלות,</strong> או מתארים במילים ובקול.</span></li>
            <li><span className="num">2</span><span><strong>מקבלים פרומפט מוכן,</strong> בעברית ובאנגלית, ורואים איך הוא נבנה.</span></li>
            <li><span className="num">3</span><span><strong>שומרים את השיר,</strong> עם מבנה, מרחב ובגד באותה אווירה.</span></li>
          </ol>
          <div className="h-cta">
            <button type="button" className="btn press go" onClick={() => go('create')}>יצירת פרומפט</button>
            <button type="button" className="btn press" onClick={() => to('staff')}>להמשיך לחמשה</button>
          </div>
        </div>
        <figure className="h-film">
          <video controls preload="none" playsInline poster="/demo-poster.jpg" src="/demo.mp4" aria-label="סרטון: מרעיון לפס קול בדקה" />
          <figcaption><strong>מרעיון לפס קול, בדקה.</strong> הסרטון מצולם מתוך האפליקציה עצמה. <span className="src">מוזיקה: Bossa Antigua, קווין מקלאוד (Kevin MacLeod), incompetech.com, רישיון CC BY 4.0.</span></figcaption>
        </figure>
      </section>

      <section className="h-screen h-staffs" data-screen="staff" aria-label="החמשה">
        <div className="h-hero">
          <p className="h-kicker">החמשה · <span className="num">{lib.length}</span> בספרייה · <span className="num">{my.loved}</span> אהובים</p>
          <h2 className="h-title">טעם אישי הופך ל<mark className="insight">פס קול</mark>.</h2>
          <p className="h-explain"><Rich>{`כל שיר הוא **קו אחד** שחוצה חמש שאלות: סגנון, אווירה, קצב, קול וכלים. מתוך **${TOTAL_OPTIONS}** אפשרויות, הקו הוא החתימה של השיר.`}</Rich></p>
          <p className="h-insight"><span className="label">תובנה</span><span><mark className="insight">שיר שאהבת מלמד את הפרומפט הבא.</mark></span></p>
          <div className="h-cta">
            <button type="button" className="btn press go" onClick={() => go('create')}>יצירת פרומפט</button>
            <button type="button" className="btn press" onClick={() => go('library')}>לספרייה</button>
          </div>
        </div>
        <div className="h-stage">
          <div className="h-now" aria-live="polite">
            <strong>{cur?.title}</strong>
            <span>{curSel ? summary(curSel) : ''}</span>
          </div>
          <Staff lines={lines} active={active} onHover={setHover} onPick={pick}
            ariaLabel={own ? 'כל שיר בספרייה כקו על חמשת הפרמטרים' : 'שש דוגמאות לפתיחה כקווים על חמשת הפרמטרים'} />
          <div className="h-legend">
            <span className="h-legend-t">{own ? 'כל קו הוא שיר בספרייה. לחיצה פותחת אותו.' : 'שש דוגמאות לפתיחה. לחיצה פותחת אותה ביצירה.'} כל קו אופקי הוא שאלה: {STAFF.map((g) => g.he).join(', ')}.</span>
            {lines.map((l) => (
              <button key={l.id} type="button" className={`press chip lg${active === l.id ? ' is-on' : ''}${l.kind === 'taste' ? ' is-taste' : ''}`}
                onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(l.id)} onBlur={() => setHover(null)} onClick={() => pick(l.id)}>{l.title}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="h-screen h-inside" data-screen="inside" aria-label="מה בפנים">
        <h2 className="h-inside-t">שלושה מקומות, <mark className="insight">מסלול אחד</mark>.</h2>
        <nav className="h-cards" aria-label="מפת התוכן">
          {cards.map((c) => (
            <button key={c.n} type="button" className="h-card press" onClick={c.on}>
              <p className="label">{c.n} · {c.label}</p><strong>{c.title}</strong><span className="d">{c.desc}</span>
              <span className="num h-card-n">{c.value}</span>
            </button>
          ))}
        </nav>
        <div className="h-museum" aria-label="שכבת ידע">
          <figure className="h-quote"><span className="label">ציטוט</span><blockquote>"אני מכנה את האדריכלות מוזיקה שקפאה."</blockquote>
            <figcaption className="src">יוהאן וולפגנג פון גתה (Johann Wolfgang von Goethe), בשיחה עם אקרמן (Eckermann), 23.3.1829. תרגום חופשי.</figcaption></figure>
          <div className="h-haiku"><span className="label">הייקו</span>{haiku.map((l) => <p key={l}>{l}</p>)}</div>
          <div className="h-city"><span className="label">דוגמה מהעיר</span>
            <p><Rich>{'שדרה היא מקצב: עץ, עמוד תאורה, ספסל. הולך רגל צועד בערך **110** צעדים בדקה, ולכן "קצב הליכה" בבורר הוא **110** פעימות.'}</Rich> <span className="src">הערכה: קצב הליכה רגיל נע בין 100 ל-120 צעדים בדקה.</span></p></div>
        </div>
        <p className="h-foot">מקור ההשראה: הפרטיטורה הגרפית של Metastaseis, יאניס קסנאקיס (Iannis Xenakis), 1954. קווי הגליסנדו שלה הפכו לקירות ביתן פיליפס (Philips Pavilion), 1958.</p>
      </section>
    </main>
  );
}
