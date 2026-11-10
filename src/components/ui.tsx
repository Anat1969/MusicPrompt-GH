// רכיבים חוזרים: טקסט עשיר, שדה כתיבה עם הקלטה, בלוק להעתקה, ושורת בוררים. כולם מקבלים נתונים מבחוץ.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { attachVoice } from '../logic/voice.js';
import type { Group } from '../data/options';

// **מודגש** ו-==תובנה==
export function Rich({ children }: { children: string }) {
  const parts = children.split(/(\*\*[^*]+\*\*|==[^=]+==)/g);
  return <>{parts.map((p, i) => p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith('==') ? <mark key={i} className="insight">{p.slice(2, -2)}</mark> : p)}</>;
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* נופלים לשיטה הישנה */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

// שדה כתיבה חופשי. בכל מקום שכותבים אפשר גם לדבר: כפתור ההקלטה נוסף מתחת לשדה.
export function VoiceArea({ value, onValue, label, placeholder, rows = 3, id }: { value: string; onValue: (v: string) => void; label: string; placeholder?: string; rows?: number; id: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const cb = useRef(onValue);
  cb.current = onValue;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    attachVoice(el);
    // התמלול כותב ישירות לשדה, ולכן מאזינים לאירוע המקורי ולא רק ל-onChange של React
    const on = () => cb.current(el.value);
    el.addEventListener('input', on);
    return () => el.removeEventListener('input', on);
  }, []);
  return (
    <div className="vfield">
      <label className="vfield-l" htmlFor={id}>{label}</label>
      <textarea id={id} ref={ref} className="field" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onValue(e.target.value)} />
    </div>
  );
}

// בלוק פלט: שם השדה ב-Suno, טקסט שאפשר לערוך, וכפתור העתקה שמאשר שהועתק.
export function CopyBlock({ he, suno, value, onChange, rows, ltr, hint, limit, testid }: { he: string; suno: string; value: string; onChange: (v: string) => void; rows: number; ltr?: boolean; hint?: ReactNode; limit?: number; testid: string }) {
  const [done, setDone] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const typing = useRef(false);
  const first = useRef(true);
  // כשהטקסט השתנה מבחוץ (בחירה או ליטוש), השדה מהבהב פעם אחת כדי שהעין תראה מה השתנה. בהקלדה לא.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (typing.current) { typing.current = false; return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    box.current?.animate([{ background: '#FFE45C' }, { background: '#fff' }], { duration: 700, easing: 'ease-out' });
  }, [value]);
  const copy = async () => { if (await copyText(value)) { setDone(true); setTimeout(() => setDone(false), 1800); } };
  const over = limit != null && value.length > limit;
  return (
    <div className="cb" data-testid={testid}>
      <div className="cb-head">
        <span className="cb-he">{he}</span>
        <span className="cb-suno" dir="ltr" title="שם השדה ב-Suno">{suno}</span>
        {limit != null && <span className={`cb-count num${over ? ' is-over' : ''}`} title="תווים מתוך המגבלה המשוערת של השדה">{value.length}/{limit}</span>}
        <button type="button" className={`press chip cb-copy${done ? ' is-done' : ''}`} onClick={copy} disabled={!value}>{done ? 'הועתק' : 'העתקה'}</button>
      </div>
      <textarea ref={box} className="field cb-text" dir={ltr ? 'ltr' : 'auto'} rows={rows} value={value} onChange={(e) => { typing.current = true; onChange(e.target.value); }} aria-label={`${he} (${suno})`} spellCheck={false} />
      {hint && <p className="cb-hint">{hint}</p>}
    </div>
  );
}

// שורת בוררים לקבוצה אחת. הריבוע הצבעוני הוא אותו סימן שמופיע בחמשה.
export function ChipRow({ g, picked, onToggle, extra }: { g: Group; picked: string[]; onToggle: (id: string) => void; extra?: ReactNode }) {
  return (
    <div className="row" role="group" aria-label={g.he}>
      <span className="row-name" title={`${g.ask}. עד ${g.max} בחירות`}><i className="sw" style={{ background: g.color }} />{g.he}</span>
      <div className="row-chips">
        {g.options.map((o) => (
          <button key={o.id} type="button" className="press chip" aria-pressed={picked.includes(o.id)} onClick={() => onToggle(o.id)} title={o.en}>{o.he}</button>
        ))}
        {extra}
      </div>
    </div>
  );
}
