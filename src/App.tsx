import { createElement, useEffect, useRef, useState } from 'react';
import { go, useRoute } from './logic/route';
import { exportLibrary, importLibrary, useLibrary } from './logic/store';
import Home from './pages/Home';
import Create from './pages/Create';
import Library from './pages/Library';

const TABS = [{ id: 'create', he: 'יצירה' }, { id: 'library', he: 'ספרייה' }];
const CHAT = 'https://claude.ai/code/session_018qeN1ABV3XafhuVdkBY9hc';
type Menu = HTMLElement & { items?: unknown; status?: string };

export default function App() {
  const route = useRoute();
  const lib = useLibrary();
  const menu = useRef<Menu>(null);
  const file = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const page = ['create', 'library'].includes(route.page) ? route.page : 'home';

  // חיווי "נשמר": מופיע בסרגל ובתוך כפתור הלוגו, ונעלם לבד
  const saved = (msg: string) => { setStatus(msg); window.clearTimeout((saved as { t?: number }).t); (saved as { t?: number }).t = window.setTimeout(() => setStatus(''), 2200); };

  // פעולות המערכת נמצאות רק בתוך כפתור הלוגו
  useEffect(() => {
    const m = menu.current;
    if (!m) return;
    m.items = [
      { label: 'גיבוי הספרייה לקובץ', onSelect: () => exportLibrary() },
      { label: 'שחזור ספרייה מקובץ', onSelect: () => file.current?.click() },
    ];
    m.status = status;
  }, [status, lib.length]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('home'); }}><img src="/icon.svg" alt="" /><span>פרטיטורה</span></a>
          <nav className="tabs" aria-label="ניווט">
            {TABS.map((t) => <button key={t.id} type="button" className="tab" aria-current={page === t.id ? 'page' : undefined} onClick={() => go(t.id)}>{t.he}{t.id === 'library' && lib.length > 0 && <span className="num tab-n">{lib.length}</span>}</button>)}
          </nav>
          <span className="saved" aria-live="polite">{status}</span>
          {createElement('ai-menu', { ref: menu, chat: CHAT })}
        </div>
      </header>
      {page === 'home' && <Home />}
      {page === 'create' && <Create route={route} onSaved={saved} />}
      {page === 'library' && <Library route={route} onSaved={saved} />}
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = '';
        if (!f) return;
        try { const n = await importLibrary(f); saved(n ? `שוחזרו ${n} פרומפטים` : 'אין בקובץ פרומפטים חדשים'); go('library'); } catch { saved('הקובץ אינו גיבוי של פרטיטורה'); }
      }} />
    </div>
  );
}
