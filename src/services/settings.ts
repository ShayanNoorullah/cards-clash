/**
 * Player settings persisted in local storage (best effort: private browsing or
 * blocked storage just falls back to defaults). The Settings screen UI arrives
 * in M10; M4 already honours animation speed and reduced motion.
 */
import { logger } from './logger';

export type AnimationSpeed = 1 | 2 | 'instant';

export interface Settings {
  animationSpeed: AnimationSpeed;
  reducedMotion: boolean;
  musicVolume: number;
  sfxVolume: number;
  textScale: number;
  colorblindIcons: boolean;
  /** Flat top-down board or a tilted perspective board. */
  boardView: '2d' | '3d';
  /** Language id from src/i18n/strings.ts. */
  language: string;
}

export const DEFAULT_SETTINGS: Settings = {
  animationSpeed: 1,
  reducedMotion: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  textScale: 1,
  colorblindIcons: true,
  boardView: '3d',
  language: 'en',
};

const STORAGE_KEY = 'cards-clash.settings.v1';
const log = logger.child('Settings');

function readStorage(): Partial<Settings> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch (err) {
    log.warn('Could not read settings; using defaults', err);
    return {};
  }
}

/** Keeps only known keys with valid values. */
export function sanitizeSettings(input: Partial<Settings>): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if (input.animationSpeed === 1 || input.animationSpeed === 2 || input.animationSpeed === 'instant') {
    s.animationSpeed = input.animationSpeed;
  }
  if (typeof input.reducedMotion === 'boolean') s.reducedMotion = input.reducedMotion;
  if (typeof input.colorblindIcons === 'boolean') s.colorblindIcons = input.colorblindIcons;
  if (input.boardView === '2d' || input.boardView === '3d') s.boardView = input.boardView;
  if (typeof input.language === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(input.language))
    s.language = input.language;
  for (const k of ['musicVolume', 'sfxVolume'] as const) {
    const v = input[k];
    if (typeof v === 'number' && v >= 0 && v <= 1) s[k] = v;
  }
  if (typeof input.textScale === 'number' && input.textScale >= 0.8 && input.textScale <= 1.3)
    s.textScale = input.textScale;
  return s;
}

let current: Settings = sanitizeSettings(readStorage());
const listeners = new Set<(s: Settings) => void>();

export function getSettings(): Readonly<Settings> {
  return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = sanitizeSettings({ ...current, ...patch });
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    log.warn('Could not save settings', err);
  }
  for (const l of listeners) l(current);
  return current;
}

export function onSettingsChange(listener: (s: Settings) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Duration multiplier for tweens: 1 at 1×, 0.5 at 2×, 0 when instant. */
export function durationScale(s: Readonly<Settings> = current): number {
  if (s.animationSpeed === 'instant') return 0;
  return s.animationSpeed === 2 ? 0.5 : 1;
}
