// החמשה: אלמנט הליבה של האפליקציה. חמישה קווים הם חמש השאלות, וכל פרומפט הוא קו שחוצה אותם.
// בהשראת קווי הגליסנדו בפרטיטורה של Metastaseis, יאניס קסנאקיס (Iannis Xenakis), 1954.
// SVG ב-direction: ltr, כי תוויות עבריות בתוך SVG בדף RTL נחתכות. האפשרויות מסודרות מימין לשמאל, כמו הבוררים.
// במסך היצירה החמשה היא גם כלי בחירה: גוררים את העיגול לאורך הקו, או לוחצים על נקודה.
import { useRef, useState } from 'react';
import { STAFF } from '../data/options';

export type StaffLine = { id: string; title: string; points: (number | null)[]; kind?: 'song' | 'taste' | 'preset' };

type Props = {
  lines: StaffLine[];
  active?: string | null;
  onHover?: (id: string | null) => void;
  onPick?: (id: string) => void;
  compact?: boolean;          // גרסה נמוכה לספרייה
  labels?: string[][];        // שמות הבחירות ליד התווים, לקו בודד
  focus?: number;             // הקו של השלב הנוכחי
  onSet?: (line: number, option: number) => void;   // גרירה או לחיצה בוחרות אפשרות
  ariaLabel: string;
};

export default function Staff({ lines, active, onHover, onPick, compact, labels, focus, onSet, ariaLabel }: Props) {
  const W = compact ? 520 : 640, H = compact ? 170 : onSet ? 270 : 340, gutter = 78, padL = 18, padT = compact ? 26 : 34;
  const gap = (H - padT * 2) / (STAFF.length - 1);
  const xR = W - gutter - 7, span = W - gutter - padL - 14;
  const x = (p: number) => xR - p * span;
  const y = (i: number) => padT + i * gap;
  const pathOf = (pts: (number | null)[]) =>
    pts.map((p, i) => (p == null ? null : `${x(p).toFixed(1)},${y(i).toFixed(1)}`)).filter(Boolean).map((s, i) => (i ? 'L' : 'M') + s).join(' ');

  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [near, setNear] = useState<{ line: number; opt: number } | null>(null);
  const locate = (e: React.PointerEvent, lock?: number) => {
    const el = svg.current, m = el?.getScreenCTM();
    if (!el || !m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const line = lock ?? Math.max(0, Math.min(STAFF.length - 1, Math.round((pt.y - padT) / gap)));
    if (lock == null && Math.abs(pt.y - y(line)) > gap * 0.48) return null;
    const n = STAFF[line].options.length;
    const opt = Math.max(0, Math.min(n - 1, Math.round(((xR - pt.x) / span) * (n - 1))));
    return { line, opt };
  };
  const handlers = onSet ? {
    onPointerDown: (e: React.PointerEvent) => { const h = locate(e); if (!h) return; (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(h.line); setNear(h); onSet(h.line, h.opt); },
    onPointerMove: (e: React.PointerEvent) => { const h = locate(e, drag ?? undefined); setNear(h); if (drag != null && h) onSet(h.line, h.opt); },
    onPointerUp: () => setDrag(null),
    onPointerCancel: () => setDrag(null),
    onPointerLeave: () => { if (drag == null) setNear(null); },
  } : {};
  const hint = near && STAFF[near.line].options[near.opt];

  return (
    <svg ref={svg} className={`staff obj${compact ? ' is-compact' : ''}${onSet ? ' is-live' : ''}${drag != null ? ' is-drag' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} style={{ direction: 'ltr' }} preserveAspectRatio="xMidYMid meet" {...handlers}>
      {STAFF.map((g, i) => (
        <g key={g.id} className={focus === i ? 'staff-row is-focus' : 'staff-row'}>
          {focus === i && <rect x={padL - 8} y={y(i) - gap * 0.42} width={W - padL} height={gap * 0.84} className="staff-band" />}
          <line x1={padL} x2={W - gutter} y1={y(i)} y2={y(i)} className="staff-rule" />
          {g.options.map((o, k) => <circle key={o.id} cx={x(k / (g.options.length - 1))} cy={y(i)} r={onSet ? 3 : 1.6} className="staff-tick" />)}
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
            {!onSet && <path d={d} className="staff-hit" />}
            <path d={d} className="staff-path" pathLength={1} />
            {l.points.map((p, i) => p == null ? null : (
              <circle key={i} cx={x(p)} cy={y(i)} r={onSet ? 9 : on || lines.length === 1 ? 6.5 : 4.5} fill={STAFF[i].color} className="staff-note" />
            ))}
          </g>
        );
      })}
      {labels && lines.length === 1 && lines[0].points.map((p, i) => p == null || !labels[i]?.length || (near?.line === i && drag == null && hint && !labels[i].includes(hint.he)) ? null : (
        <text key={i} x={x(p)} y={y(i) - (onSet ? 15 : 11)} textAnchor={p > 0.8 ? 'start' : p < 0.2 ? 'end' : 'middle'} className="staff-label">{labels[i].join(' + ')}</text>
      ))}
      {onSet && near && hint && drag == null && !labels?.[near.line]?.includes(hint.he) && (() => {
        const p = near.opt / (STAFF[near.line].options.length - 1);
        return <g className="staff-ghost"><circle cx={x(p)} cy={y(near.line)} r={9} stroke={STAFF[near.line].color} />
          <text x={x(p)} y={y(near.line) - 15} textAnchor={p > 0.8 ? 'start' : p < 0.2 ? 'end' : 'middle'} className="staff-label">{hint.he}</text></g>;
      })()}
    </svg>
  );
}
