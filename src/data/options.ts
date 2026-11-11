// מקור הנתונים היחיד של האפליקציה. כל תצוגה (בוררים, חמשה, פרומפט, מקרא, טביעת טעם) נגזרת מכאן.
// he: מה שרואים בממשק. en: מה שנכנס לפרומפט של Suno, שמבין אנגלית טוב יותר.

export type GroupId = 'genre' | 'mood' | 'tempo' | 'voice' | 'inst' | 'use' | 'lang';
export type Option = { id: string; he: string; en: string; bpm?: number; minor?: boolean; gloss?: string };
export type Group = {
  id: GroupId;
  he: string;        // שם השורה
  ask: string;       // השאלה שהשורה עונה עליה
  how: string;       // מה הבחירה משנה בפרומפט
  color: string;     // צבע הנושא: אותו צבע בבורר, בחמשה ובמקרא
  max: number;       // כמה אפשר לבחור
  staff: boolean;    // האם השורה היא קו בחמשה
  options: Option[];
};

export const GROUPS: Group[] = [
  {
    id: 'genre', he: 'סגנון', ask: 'מאיזה עולם המוזיקה', how: 'הסגנון נכנס ראשון לפרומפט, וקובע את כל השאר. שתי בחירות יוצרות שילוב בין שני עולמות.', color: '#6F68B5', max: 2, staff: true,
    options: [
      { id: 'classical', he: 'קלאסי', en: 'classical orchestral' },
      { id: 'cinematic', he: 'קולנועי', en: 'cinematic film score' },
      { id: 'ambient', he: 'אמביינט', en: 'ambient' },
      { id: 'jazz', he: "ג'אז", en: 'jazz' },
      { id: 'bossa', he: 'בוסה נובה', en: 'bossa nova' },
      { id: 'folk', he: 'פולק', en: 'acoustic folk' },
      { id: 'med', he: 'ים תיכוני', en: 'Mediterranean, Middle Eastern scales' },
      { id: 'pop', he: 'פופ', en: 'pop' },
      { id: 'lofi', he: 'לו־פיי', en: 'lo-fi' },
      { id: 'electronic', he: 'אלקטרוני', en: 'electronic' },
      { id: 'rock', he: 'רוק', en: 'rock' },
    ],
  },
  {
    id: 'mood', he: 'אווירה', ask: 'מה מרגישים', how: 'האווירה מוסיפה לפרומפט את הרגש. היא משנה את ההרמוניה ואת אופי הנגינה, לא את הכלים.', color: '#CC7B5E', max: 2, staff: true,
    options: [
      { id: 'calm', he: 'רגוע', en: 'calm, peaceful' },
      { id: 'intimate', he: 'אינטימי', en: 'intimate, warm' },
      { id: 'dreamy', he: 'חולמני', en: 'dreamy, ethereal' },
      { id: 'melancholic', he: 'מלנכולי', en: 'melancholic, bittersweet', minor: true },
      { id: 'nostalgic', he: 'נוסטלגי', en: 'nostalgic', minor: true },
      { id: 'mysterious', he: 'מסתורי', en: 'mysterious', minor: true },
      { id: 'inspiring', he: 'מעורר השראה', en: 'inspiring, hopeful' },
      { id: 'uplifting', he: 'שמח', en: 'uplifting, joyful' },
      { id: 'dramatic', he: 'דרמטי', en: 'dramatic, epic', minor: true },
      { id: 'energetic', he: 'אנרגטי', en: 'energetic, driving' },
    ],
  },
  {
    id: 'tempo', he: 'קצב', ask: 'כמה מהר', how: 'הקצב נכנס לפרומפט כמספר פעימות בדקה. אפשר לשמוע אותו לפני שבוחרים.', color: '#B58D4E', max: 1, staff: true,
    options: [
      { id: 't60', he: 'איטי מאוד', en: 'very slow tempo, 60 BPM', bpm: 60 },
      { id: 't80', he: 'איטי', en: 'slow tempo, 80 BPM', bpm: 80 },
      { id: 't100', he: 'בינוני', en: 'mid-tempo, 100 BPM', bpm: 100 },
      { id: 't110', he: 'קצב הליכה', en: 'steady walking pace, 110 BPM', bpm: 110 },
      { id: 't126', he: 'מהיר', en: 'upbeat, 126 BPM', bpm: 126 },
      { id: 't150', he: 'מהיר מאוד', en: 'fast, 150 BPM', bpm: 150 },
    ],
  },
  {
    id: 'voice', he: 'קול', ask: 'מי שר, אם בכלל', how: 'הקול קובע אם יש שירה ומי שר. "בלי מילים" מוסיף לפרומפט הוראה מפורשת בלי שירה, ושדה המילים נשאר ריק.', color: '#6699CC', max: 1, staff: true,
    options: [
      { id: 'instrumental', he: 'בלי מילים', en: 'instrumental, no vocals' },
      { id: 'female', he: 'זמרת', en: 'female vocals' },
      { id: 'male', he: 'זמר', en: 'male vocals' },
      { id: 'duet', he: 'דואט', en: 'male and female duet vocals' },
      { id: 'band', he: 'להקה', en: 'band with layered vocal harmonies' },
      { id: 'choir', he: 'מקהלה', en: 'choir' },
    ],
  },
  {
    id: 'inst', he: 'כלים', ask: 'מה מנגן', how: 'הכלים נכנסים לפרומפט כרשימה של כלים מובילים. עד 4, כדי ש-Suno לא יתפזר.', color: '#559C86', max: 4, staff: true,
    options: [
      { id: 'piano', he: 'פסנתר', en: 'piano' },
      { id: 'strings', he: 'כלי קשת', en: 'string section' },
      { id: 'cello', he: "צ'לו", en: 'cello' },
      { id: 'violin', he: 'כינור', en: 'violin' },
      { id: 'harp', he: 'נבל', en: 'harp' },
      { id: 'flute', he: 'חליל', en: 'flute' },
      { id: 'acoustic', he: 'גיטרה', en: 'acoustic guitar' },
      { id: 'oud', he: 'עוד', en: 'oud' },
      { id: 'sax', he: 'סקסופון', en: 'saxophone' },
      { id: 'synth', he: 'סינתי', en: 'analog synth pads' },
      { id: 'electric', he: 'גיטרה חשמלית', en: 'electric guitar' },
      { id: 'drums', he: 'תופים', en: 'drums' },
    ],
  },
  {
    id: 'use', he: 'פס קול ל', ask: 'מתי מקשיבים', how: 'השימוש מוסיף לפרומפט הוראות מבנה: יציב לרקע, בנייה הדרגתית לסרטון, מרווח למנוחה.', color: '#1A1A18', max: 1, staff: false,
    options: [
      { id: 'work', gloss: 'מוזיקת רקע יציבה, בלי שינויים פתאומיים', he: 'עבודה וריכוז', en: 'unobtrusive background music, steady, no sudden changes' },
      { id: 'walk', gloss: 'מקצב יציב להליכה', he: 'הליכה', en: 'steady groove for walking' },
      { id: 'video', gloss: 'פתיחה ברורה, בנייה הדרגתית וסיום נקי', he: 'סרטון או מצגת', en: 'clear intro, gradual build, clean ending' },
      { id: 'rest', gloss: 'מתפתח לאט, מינימלי ומרווח', he: 'מנוחה', en: 'slowly evolving, minimal, spacious' },
      { id: 'evening', gloss: 'מקצב חם, בעוצמה של שיחה', he: 'ערב עם אנשים', en: 'warm groove, conversational volume' },
    ],
  },
  {
    id: 'lang', he: 'שפת המילים', ask: 'באיזו שפה שרים', how: 'השפה מצטרפת לקול בפרומפט, וקובעת באיזו שפה ייכתבו המילים.', color: '#1A1A18', max: 1, staff: false,
    options: [
      { id: 'he', he: 'עברית', en: 'Hebrew' },
      { id: 'en', he: 'אנגלית', en: 'English' },
      { id: 'fr', he: 'צרפתית', en: 'French' },
      { id: 'es', he: 'ספרדית', en: 'Spanish' },
      { id: 'it', he: 'איטלקית', en: 'Italian' },
      { id: 'pt', he: 'פורטוגזית', en: 'Portuguese' },
    ],
  },
];

export const STAFF = GROUPS.filter((g) => g.staff);
export const group = (id: GroupId) => GROUPS.find((g) => g.id === id)!;
export const TOTAL_OPTIONS = GROUPS.reduce((n, g) => n + g.options.length, 0);

export type Selection = Partial<Record<GroupId, string[]>>;

// נקודות פתיחה. מסומנות בממשק כ"דוגמה", ולא מתחזות לספרייה של המשתמשת.
export type Preset = { id: string; title: string; sel: Selection };
export const PRESETS: Preset[] = [
  { id: 'p-morning', title: 'בוקר שקט', sel: { genre: ['ambient', 'classical'], mood: ['calm'], tempo: ['t60'], voice: ['instrumental'], inst: ['piano', 'strings'], use: ['work'] } },
  { id: 'p-film', title: 'סצנת פתיחה', sel: { genre: ['cinematic'], mood: ['dramatic', 'inspiring'], tempo: ['t100'], voice: ['choir'], inst: ['strings', 'drums'], use: ['video'] } },
  { id: 'p-walk', title: 'הליכה על הטיילת', sel: { genre: ['med', 'folk'], mood: ['uplifting'], tempo: ['t110'], voice: ['female'], inst: ['oud', 'acoustic'], use: ['walk'], lang: ['he'] } },
  { id: 'p-night', title: 'מועדון קטן בלילה', sel: { genre: ['jazz'], mood: ['intimate', 'nostalgic'], tempo: ['t80'], voice: ['male'], inst: ['sax', 'piano'], use: ['evening'], lang: ['en'] } },
  { id: 'p-rio', title: 'אחר צהריים בריו', sel: { genre: ['bossa'], mood: ['dreamy'], tempo: ['t100'], voice: ['duet'], inst: ['acoustic', 'flute'], use: ['evening'], lang: ['pt'] } },
  { id: 'p-drive', title: 'נסיעה מהירה', sel: { genre: ['electronic', 'pop'], mood: ['energetic'], tempo: ['t126'], voice: ['band'], inst: ['synth', 'drums'], lang: ['en'] } },
];

// הצעות: מה בדרך כלל מתאים לסגנון שנבחר. אלה נקודות פתיחה, לא כללים, ולכן הן רק מסומנות ולא נבחרות לבד.
export const SUGGEST: Record<string, Partial<Record<GroupId, string[]>>> = {
  classical: { mood: ['calm', 'dramatic', 'inspiring'], tempo: ['t60', 't80'], voice: ['instrumental', 'choir'], inst: ['piano', 'strings', 'cello', 'violin'], use: ['work', 'rest'] },
  cinematic: { mood: ['dramatic', 'inspiring', 'mysterious'], tempo: ['t80', 't100'], voice: ['instrumental', 'choir'], inst: ['strings', 'piano', 'drums'], use: ['video'] },
  ambient: { mood: ['calm', 'dreamy', 'mysterious'], tempo: ['t60'], voice: ['instrumental'], inst: ['synth', 'piano', 'harp'], use: ['rest', 'work'] },
  jazz: { mood: ['intimate', 'nostalgic', 'melancholic'], tempo: ['t80', 't100'], voice: ['female', 'male', 'instrumental'], inst: ['sax', 'piano', 'drums'], use: ['evening'] },
  bossa: { mood: ['dreamy', 'intimate', 'uplifting'], tempo: ['t100'], voice: ['female', 'duet'], inst: ['acoustic', 'flute', 'piano'], use: ['evening'] },
  folk: { mood: ['intimate', 'nostalgic', 'inspiring'], tempo: ['t80', 't100'], voice: ['female', 'male', 'duet'], inst: ['acoustic', 'violin', 'flute'], use: ['walk', 'evening'] },
  med: { mood: ['uplifting', 'nostalgic', 'energetic'], tempo: ['t110', 't126'], voice: ['female', 'male', 'band'], inst: ['oud', 'acoustic', 'violin', 'drums'], use: ['walk', 'evening'] },
  pop: { mood: ['uplifting', 'energetic', 'inspiring'], tempo: ['t110', 't126'], voice: ['female', 'male', 'band'], inst: ['synth', 'acoustic', 'drums'], use: ['walk'] },
  lofi: { mood: ['calm', 'nostalgic', 'dreamy'], tempo: ['t80'], voice: ['instrumental'], inst: ['piano', 'synth', 'drums'], use: ['work'] },
  electronic: { mood: ['energetic', 'mysterious', 'dreamy'], tempo: ['t126', 't150'], voice: ['instrumental', 'female'], inst: ['synth', 'drums'], use: ['walk'] },
  rock: { mood: ['energetic', 'dramatic'], tempo: ['t126', 't150'], voice: ['male', 'band'], inst: ['electric', 'drums'], use: ['walk'] },
};
export function suggested(sel: Selection, gid: GroupId): string[] {
  const out: string[] = [];
  for (const g of sel.genre ?? []) for (const id of SUGGEST[g]?.[gid] ?? []) if (!out.includes(id)) out.push(id);
  return out;
}
