import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/home.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
