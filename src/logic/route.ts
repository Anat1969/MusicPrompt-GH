import { useEffect, useState } from 'react';

// ניתוב hash: הכתובת נושאת את הדף ואת הבחירה, כך שהעתקת קישור שומרת את המצב.
export type Route = { page: string; params: Record<string, string> };
const parse = (): Route => {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return { page: path || 'home', params: Object.fromEntries(new URLSearchParams(query)) };
};

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (page: string, params?: Record<string, string>) => {
  const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  window.location.hash = page === 'home' ? '' : `/${page}${q}`;
};
