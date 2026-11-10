// דף הבית: חזון, מטרה וכלי במבט אחד. האובייקט הוא החמשה, והקווים עליה הם הספרייה האמיתית.
import { useEffect, useMemo, useState } from 'react';
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

  return (
    <main className="app-main home">
      <section className="h-hero">
        <p className="h-kicker">פרטיטורה · <span className="num">{lib.length}</span> בספרייה · <span className="num">{my.loved}</span> אהובים</p>
        <h1 className="h-title">טעם אישי הופך ל<mark className="insight">פס קול</mark>.</h1>
        <p className="h-explain"><Rich>{`**מתארים** במילים או **בוחרים** מתוך **${TOTAL_OPTIONS}** אפשרויות, מקבלים פרומפט מוכן ל-Suno, ושומרים את מה שעבד.`}</Rich></p>
        <div className="h-tones">
          <p className="h-tone t-problem"><b>בעיה</b><span>Suno מבין אנגלית של מפיקים, לא תיאור של טעם.</span></p>
          <p className="h-tone t-solution"><b>פתרון</b><span>כל בחירה מתורגמת למונח מוזיקלי, ונכנסת לשדה הנכון.</span></p>
          <p className="h-tone t-insight"><b>תובנה</b><span><mark className="insight">שיר שאהבת מלמד את הפרומפט הבא.</mark></span></p>
        </div>
        <div className="h-cta">
          <button type="button" className="btn press go" onClick={() => go('create')}>יצירת פרומפט</button>
          <button type="button" className="btn press" onClick={() => go('library')}>לספרייה</button>
        </div>
      </section>

      <section className="h-stage" aria-label="החמשה">
        <div className="h-now" aria-live="polite">
          <strong>{cur?.title}</strong>
          <span>{curSel ? summary(curSel) : ''}</span>
        </div>
        <Staff lines={lines} active={active} onHover={setHover} onPick={pick}
          ariaLabel={own ? 'כל שיר בספרייה כקו על חמשת הפרמטרים' : 'שש דוגמאות לפתיחה כקווים על חמשת הפרמטרים'} />
        <div className="h-legend">
          <span className="h-legend-t">{own ? 'כל קו הוא שיר בספרייה. לחיצה פותחת אותו.' : 'שש דוגמאות לפתיחה. לחיצה פותחת אותה ביצירה.'} כל קו אופקי הוא פרמטר: {STAFF.map((g) => g.he).join(', ')}.</span>
          {lines.map((l) => (
            <button key={l.id} type="button" className={`press chip lg${active === l.id ? ' is-on' : ''}${l.kind === 'taste' ? ' is-taste' : ''}`}
              onMouseEnter={() => setHover(l.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(l.id)} onBlur={() => setHover(null)} onClick={() => pick(l.id)}>{l.title}</button>
          ))}
        </div>
      </section>

      <nav className="h-cards" aria-label="מפת התוכן">
        {cards.map((c) => (
          <button key={c.n} type="button" className="h-card press" onClick={c.on}>
            <p className="label">{c.n} · {c.label}</p><strong>{c.title}</strong><span className="d">{c.desc}</span>
            <span className="num h-card-n">{c.value}</span>
          </button>
        ))}
      </nav>

      <section className="h-museum" aria-label="שכבת ידע">
        <figure className="h-quote"><span className="label">ציטוט</span><blockquote>"אני מכנה את האדריכלות מוזיקה שקפאה."</blockquote>
          <figcaption className="src">יוהאן וולפגנג פון גתה (Johann Wolfgang von Goethe), בשיחה עם אקרמן (Eckermann), 23.3.1829. תרגום חופשי.</figcaption></figure>
        <div className="h-haiku"><span className="label">הייקו</span>{haiku.map((l) => <p key={l}>{l}</p>)}</div>
        <div className="h-city"><span className="label">דוגמה מהעיר</span>
          <p><Rich>{'שדרה היא מקצב: עץ, עמוד תאורה, ספסל. הולך רגל צועד בערך **110** צעדים בדקה, ולכן "קצב הליכה" בבורר הוא **110** פעימות.'}</Rich> <span className="src">הערכה: קצב הליכה רגיל נע בין 100 ל-120 צעדים בדקה.</span></p></div>
      </section>
      <p className="h-foot">מקור ההשראה: הפרטיטורה הגרפית של Metastaseis, יאניס קסנאקיס (Iannis Xenakis), 1954. קווי הגליסנדו שלה הפכו לקירות ביתן פיליפס (Philips Pavilion), 1958.</p>
    </main>
  );
}
