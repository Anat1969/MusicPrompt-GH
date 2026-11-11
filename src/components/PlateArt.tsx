// הגרפיקה של לוח בבמה: ציור שנבנה מהשיר עצמו, עד שמעלים תמונה אמיתית.
// הפלטה היא האווירה, ומספר האלמנטים החוזרים הוא הקצב. מבנה: חזית של עמודים. מרחב: חדר בפרספקטיבה עם אור מחלון. בגד: קפלים נופלים.
import type { Kind } from '../logic/visual';

export default function PlateArt({ kind, colors, beats }: { kind: Kind; colors: [string, string, string]; beats: number }) {
  const [a, b, c] = colors;
  const id = `g-${kind}-${a.slice(1)}`;
  const idx = [...Array(beats).keys()];
  return (
    <svg className="plate-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id})`} />
      {kind === 'building' && (
        <>
          <circle cx="76" cy="24" r="9" fill={c} opacity=".55" />
          {idx.map((i) => { const w = 84 / beats, h = 26 + 30 * Math.abs(Math.sin(i * 1.7 + beats)); return <rect key={i} x={8 + i * w + w * 0.14} y={74 - h} width={w * 0.72} height={h} fill={i % 3 === 1 ? c : '#1A1A18'} opacity={i % 3 === 1 ? 0.95 : 0.82} />; })}
          <rect x="0" y="74" width="100" height="26" fill="#1A1A18" opacity=".9" />
          <rect x="0" y="74" width="100" height="1.2" fill={c} />
        </>
      )}
      {kind === 'space' && (
        <>
          <polygon points="0,0 28,22 28,66 0,100" fill="#1A1A18" opacity=".22" />
          <polygon points="100,0 72,22 72,66 100,100" fill="#1A1A18" opacity=".34" />
          <polygon points="0,100 28,66 72,66 100,100" fill="#1A1A18" opacity=".5" />
          <rect x="28" y="22" width="44" height="44" fill={a} opacity=".5" />
          <rect x="40" y="30" width="20" height="24" fill={c} opacity=".9" />
          <polygon points="40,54 60,54 78,96 26,96" fill={c} opacity=".28" />
          {idx.map((i) => { const t = (i + 1) / (beats + 1); return <line key={i} x1={28 + 44 * t} y1="66" x2={100 * t} y2="100" stroke="#fff" strokeWidth=".35" opacity=".35" />; })}
        </>
      )}
      {kind === 'garment' && (
        <>
          <ellipse cx="50" cy="15" rx="6" ry="7" fill="#1A1A18" opacity=".85" />
          <path d="M32 26 Q50 20 68 26 L80 96 L20 96 Z" fill="#1A1A18" opacity=".86" />
          {idx.map((i) => { const t = (i + 0.5) / beats, x0 = 34 + 32 * t, x1 = 22 + 56 * t, bend = 5 * Math.sin(i * 2.1); return <path key={i} d={`M${x0} 27 C${x0 + bend} 50 ${x1 - bend} 72 ${x1} 96`} fill="none" stroke={i % 2 ? c : a} strokeWidth=".7" opacity=".85" />; })}
          <path d="M32 26 Q50 33 68 26" fill="none" stroke={c} strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}
