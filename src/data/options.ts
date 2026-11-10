// מקור הנתונים היחיד של האפליקציה. כל תצוגה (בוררים, חמשה, פרומפט, מקרא, טביעת טעם) נגזרת מכאן.
// he: מה שרואים בממשק. en: מה שנכנס לפרומפט של Suno, שמבין אנגלית טוב יותר.

export type GroupId = 'genre' | 'mood' | 'tempo' | 'voice' | 'inst' | 'use' | 'lang';
export type Option = { id: string; he: string; en: string; bpm?: number; minor?: boolean };
export type Group = {
  id: GroupId;
  he: string;        // שם השורה
  ask: string;       // השאלה שהשורה עונה עליה
  color: string;     // צבע הנושא: אותו צבע בבורר, בחמשה ובמקרא
  max: number;       // כמה אפשר לבחור
  staff: boolean;    // האם השורה היא קו בחמשה
  options: Option[];
};

export const GROUPS: Group[] = [
  {
    id: 'genre', he: 'סגנון', ask: 'מאיזה עולם המוזיקה', color: '#534AB7', max: 2, staff: true,
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
    id: 'mood', he: 'אווירה', ask: 'מה מרגישים', color: '#D85A30', max: 2, staff: true,
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
    id: 'tempo', he: 'קצב', ask: 'כמה מהר', color: '#BA7517', max: 1, staff: true,
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
    id: 'voice', he: 'קול', ask: 'מי שר, אם בכלל', color: '#378ADD', max: 1, staff: true,
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
    id: 'inst', he: 'כלים', ask: 'מה מנגן', color: '#1D9E75', max: 4, staff: true,
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
    id: 'use', he: 'פס קול ל', ask: 'מתי מקשיבים', color: '#1A1A18', max: 1, staff: false,
    options: [
      { id: 'work', he: 'עבודה וריכוז', en: 'unobtrusive background music, steady, no sudden changes' },
      { id: 'walk', he: 'הליכה', en: 'steady groove for walking' },
      { id: 'video', he: 'סרטון או מצגת', en: 'clear intro, gradual build, clean ending' },
      { id: 'rest', he: 'מנוחה', en: 'slowly evolving, minimal, spacious' },
      { id: 'evening', he: 'ערב עם אנשים', en: 'warm groove, conversational volume' },
    ],
  },
  {
    id: 'lang', he: 'שפת המילים', ask: 'באיזו שפה שרים', color: '#1A1A18', max: 1, staff: false,
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
