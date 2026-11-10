// השמעת הקצב: שתי תיבות של פעימות ואקורד, כדי לשמוע את הבחירה לפני שהולכים ל-Suno.
// זו לא המוזיקה עצמה, רק הקצב והגוון (מז'ור או מינור). Web Audio, בלי קבצים.
let ctx: AudioContext | null = null;
let stopAt = 0;

export function playPulse(bpm: number, minor: boolean): number {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return 0;
  ctx = ctx ?? new AC();
  void ctx.resume();
  const beat = 60 / bpm, beats = 8, t0 = ctx.currentTime + 0.05;
  const root = 220, third = root * (minor ? 6 / 5 : 5 / 4), fifth = root * 1.5;
  for (let i = 0; i < beats; i++) {
    const t = t0 + i * beat, strong = i % 4 === 0;
    for (const f of strong ? [root, third, fifth] : [fifth * 2]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = strong ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(strong ? 0.16 : 0.07, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(beat * 0.9, strong ? 0.9 : 0.25));
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + beat);
    }
  }
  stopAt = t0 + beats * beat;
  return Math.round(beats * beat * 1000);
}
export const pulsePlaying = () => !!ctx && ctx.currentTime < stopAt;
