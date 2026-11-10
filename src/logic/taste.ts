// טביעת הטעם: מה חוזר בשירים שסומנו "אהבתי". כלל החישוב גלוי בממשק.
// ציון לכל בחירה = מספר השירים האהובים שבהם היא מופיעה. בכל שורה נבחרות המובילות, עד מספר הבחירות שהשורה מרשה.
// מגבלה: מתחת ל-3 שירים אהובים זו רק נטייה ראשונית, וכך זה גם כתוב.
import { GROUPS, type GroupId, type Selection } from '../data/options';
import type { Song } from './store';

export type Taste = { loved: number; sel: Selection; top: { group: GroupId; he: string; count: number }[] };

export function taste(lib: Song[]): Taste {
  const loved = lib.filter((s) => s.loved);
  const sel: Selection = {};
  const top: Taste['top'] = [];
  for (const g of GROUPS) {
    const counts = new Map<string, number>();
    for (const s of loved) for (const id of s.sel[g.id] ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) continue;
    const keep = ranked.filter(([, c]) => c === ranked[0][1] || c >= 2).slice(0, Math.min(g.max, 2));
    sel[g.id] = keep.map(([id]) => id);
    const o = g.options.find((x) => x.id === ranked[0][0]);
    if (o && g.staff) top.push({ group: g.id, he: o.he, count: ranked[0][1] });
  }
  return { loved: loved.length, sel, top };
}
