import { createElement, useEffect, useRef, useState } from 'react';
import { go, useRoute } from './logic/route';
import { exportLibrary, importLibrary, useLibrary } from './logic/store';
import Home from './pages/Home';
import Create from './pages/Create';
import Library from './pages/Library';
import Login from './components/Login';
import { runSync, signOut, useCloud } from './logic/cloud';

const TABS = [{ id: 'create', he: 'יצירה' }, { id: 'library', he: 'ספרייה' }];
const CHAT = 'https://claude.ai/code/session_018qeN1ABV3XafhuVdkBY9hc';
type Menu = HTMLElement & { items?: unknown; status?: string };

export default function App() {
  const route = useRoute();
  const lib = useLibrary();
  const menu = useRef<Menu>(null);
  const file = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [login, setLogin] = useState(false);
  const cloud = useCloud();
  const page = ['create', 'library'].includes(route.page) ? route.page : 'home';

  // חיווי "נשמר": מופיע בסרגל ובתוך כפתור הלוגו, ונעלם לבד
  const saved = (msg: string) => { setStatus(msg); window.clearTimeout((saved as { t?: number }).t); (saved as { t?: number }).t = window.setTimeout(() => setStatus(''), 2200); };

  // המסך גדל עם החלון: היצירה והספרייה תוכננו ל-1366 על 800, ובחלון גדול יותר הכול מוגדל באותו יחס, כדי שלא יישאר שטח מת.
  useEffect(() => {
    const fit = () => document.documentElement.style.setProperty('--z', String(innerWidth <= 900 ? 1 : Math.max(1, Math.min(innerWidth / 1366, innerHeight / 800, 1.7))));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // פעולות המערכת נמצאות רק בתוך כפתור הלוגו
  useEffect(() => {
    const m = menu.current;
    if (!m) return;
    m.items = [
      ...(cloud.uid
        ? [{ label: 'סנכרון עם הענן עכשיו', onSelect: () => void runSync() }, { label: `יציאה מהענן (${cloud.email})`, onSelect: () => void signOut() }]
        : [{ label: 'כניסה לספרייה בענן', onSelect: () => setLogin(true) }]),
      { label: 'גיבוי הספרייה לקובץ', onSelect: () => exportLibrary() },
      { label: 'שחזור ספרייה מקובץ', onSelect: () => file.current?.click() },
    ];
    m.status = status || (cloud.uid ? (cloud.status === 'syncing' ? 'מסנכרן' : cloud.status === 'error' ? 'לא סונכרן' : 'שמור בענן') : '');
  }, [status, lib.length, cloud.uid, cloud.status, cloud.email]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('home'); }}><img src="/icon.svg" alt="" /><span>פרטיטורה</span></a>
          <nav className="tabs" aria-label="ניווט">
            {TABS.map((t) => <button key={t.id} type="button" className="tab" aria-current={page === t.id ? 'page' : undefined} onClick={() => go(t.id)}>{t.he}{t.id === 'library' && lib.length > 0 && <span className="num tab-n">{lib.length}</span>}</button>)}
          </nav>
          <span className="saved" aria-live="polite">{status || (cloud.uid ? (cloud.status === 'syncing' ? 'מסנכרן' : cloud.status === 'error' ? 'לא סונכרן' : 'שמור בענן') : '')}</span>
          {createElement('ai-menu', { ref: menu, chat: CHAT })}
        </div>
      </header>
      {page === 'home' && <Home />}
      {page === 'create' && <Create route={route} onSaved={saved} />}
      {page === 'library' && <Library route={route} onSaved={saved} onLogin={() => setLogin(true)} />}
      {login && <Login onClose={() => setLogin(false)} />}
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        try { const n = await importLibrary(f); saved(n ? `שוחזרו ${n} פרומפטים` : 'אין בקובץ פרומפטים חדשים'); go('library'); } catch { saved('הקובץ אינו גיבוי של פרטיטורה'); }
      }} />
    </div>
  );
}
