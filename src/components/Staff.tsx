// החמשה: אלמנט הליבה של האפליקציה. חמישה קווים הם חמשת הפרמטרים, וכל פרומפט הוא קו שחוצה אותם.
// בהשראת קווי הגליסנדו בפרטיטורה של Metastaseis, יאניס קסנאקיס (Iannis Xenakis), 1954.
// SVG ב-direction: ltr, כי תוויות עבריות בתוך SVG בדף RTL נחתכות.
import { STAFF } from '../data/options';

export type StaffLine = { id: string; title: string; points: (number | null)[]; kind?: 'song' | 'taste' | 'preset' };

type Props = {
  lines: StaffLine[];
  active?: string | null;
  onHover?: (id: string | null) => void;
  onPick?: (id: string) => void;
  compact?: boolean;          // גרסה נמוכה למסך היצירה ולספרייה
  labels?: string[][];        // שמות הבחירות ליד התווים, לקו בודד
  ariaLabel: string;
};

export default function Staff({ lines, active, onHover, onPick, compact, labels, ariaLabel }: Props) {
  const W = compact ? 520 : 640, H = compact ? 170 : 340, gutter = 78, padL = 18, padT = compact ? 26 : 34;
  const gap = (H - padT * 2) / (STAFF.length - 1);
  const x = (p: number) => padL + p * (W - gutter - padL - 14) + 7;
  const y = (i: number) => padT + i * gap;
  const pathOf = (pts: (number | null)[]) =>
    pts.map((p, i) => (p == null ? null : `${x(p).toFixed(1)},${y(i).toFixed(1)}`)).filter(Boolean).map((s, i) => (i ? 'L' : 'M') + s).join(' ');

  return (
    <svg className={`staff obj${compact ? ' is-compact' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ direction: 'ltr' }} preserveAspectRatio="xMidYMid meet">
      {STAFF.map((g, i) => (
        <g key={g.id}>
          <line x1={padL} x2={W - gutter} y1={y(i)} y2={y(i)} className="staff-rule" />
          {g.options.map((o, k) => <circle key={o.id} cx={x(k / (g.options.length - 1))} cy={y(i)} r={1.6} className="staff-tick" />)}
          <rect x={W - gutter + 8} y={y(i) - 5} width={10} height={10} fill={g.color} />
          <text x={W - gutter + 24} y={y(i) + 4.5} className="staff-name">{g.he}</text>
        </g>
      ))}
      {lines.map((l) => {
        const d = pathOf(l.points);
        if (!d) return null;
        const on = active === l.id, dim = active != null && !on;
        return (
          <g key={l.id} className={`staff-line k-${l.kind ?? 'song'}${on ? ' is-on' : ''}${dim ? ' is-dim' : ''}`}
            onMouseEnter={() => onHover?.(l.id)} onMouseLeave={() => onHover?.(null)} onClick={() => onPick?.(l.id)}>
            <path d={d} className="staff-hit" />
            <path d={d} className="staff-path" pathLength={1} />
            {l.points.map((p, i) => p == null ? null : (
              <circle key={i} cx={x(p)} cy={y(i)} r={on || lines.length === 1 ? 6.5 : 4.5} fill={STAFF[i].color} className="staff-note" />
            ))}
          </g>
        );
      })}
      {labels && lines.length === 1 && lines[0].points.map((p, i) => p == null || !labels[i]?.length ? null : (
        <text key={i} x={x(p)} y={y(i) - 11} textAnchor={p > 0.8 ? 'end' : p < 0.2 ? 'start' : 'middle'} className="staff-label">{labels[i].join(' + ')}</text>
      ))}
    </svg>
  );
}
