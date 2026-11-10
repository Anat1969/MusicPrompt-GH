declare module '*/voice.js' {
  export function attachVoice(field: HTMLElement | null, opts?: { lang?: string }): void;
  export function voiceSupported(): boolean;
}
