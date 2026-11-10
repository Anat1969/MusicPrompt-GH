// כניסה לספרייה בענן. אימייל וסיסמה של החשבון הקיים, עם מילוי אוטומטי והצגת סיסמה. אין כאן הרשמה.
import { useEffect, useRef, useState } from 'react';
import { signIn } from '../logic/cloud';

export default function Login({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const err = await signIn(email, pw);
    setBusy(false);
    if (err) setError(err); else onClose();
  };
  return (
    <div className="login-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="login" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="login-t">
        <header><h2 id="login-t">הספרייה בכל מכשיר</h2><button type="button" className="press chip" onClick={onClose} aria-label="סגירה">×</button></header>
        <p>נכנסים פעם אחת, והפרומפטים והשירים זהים במחשב ובטלפון. מה ששמור במכשיר הזה עולה לענן בכניסה.</p>
        <label htmlFor="login-email">אימייל</label>
        <input ref={first} id="login-email" className="field" type="email" name="email" autoComplete="username" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="login-pw">סיסמה</label>
        <div className="pw">
          <input id="login-pw" className="field" type={show ? 'text' : 'password'} name="password" autoComplete="current-password" dir="ltr" required value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="press chip" aria-pressed={show} onClick={() => setShow((v) => !v)}>{show ? 'הסתרה' : 'הצגה'}</button>
        </div>
        {error && <p className="msg msg-problem" role="alert">{error}</p>}
        <button type="submit" className="press btn go" disabled={busy}>{busy ? 'נכנסת' : 'כניסה'}</button>
        <p className="src">זה אותו חשבון שבשאר האפליקציות שלך, באותו אימייל ובאותה סיסמה. כל שיר נגיש רק לחשבון שלך.</p>
      </form>
    </div>
  );
}
