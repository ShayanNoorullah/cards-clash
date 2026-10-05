/**
 * String table. English is the only language today; every other language adds
 * a table with the same keys (a test checks they match). UI code calls `t()`
 * instead of hard-coding text, so translations need no code changes.
 */
import { getSettings } from '../services/settings';

const en = {
  'common.back': 'Back',
  'common.close': 'Close',
  'common.play': 'Play',
  'common.on': 'On',
  'common.off': 'Off',

  'menu.play': 'PLAY',
  'menu.play.caption': 'Campaign, tutorial & quick battles',
  'menu.collection': 'Collection',
  'menu.collection.caption': 'Cards & crafting',
  'menu.decks': 'Decks',
  'menu.decks.caption': 'Build & share',
  'menu.shop': 'Shop',
  'menu.shop.caption': 'Packs (no real money)',
  'menu.quests': 'Quests',
  'menu.quests.caption': 'Daily & achievements',
  'menu.profile': 'Profile',
  'menu.profile.caption': 'Stats & cosmetics',
  'menu.settings': 'Settings',
  'menu.settings.caption': 'Audio, display & more',
  'menu.footer': 'No ads. No purchases. Just cards.',

  'settings.title': 'Settings',
  'settings.audio': 'Audio',
  'settings.music': 'Music',
  'settings.sfx': 'Sound effects',
  'settings.display': 'Display & motion',
  'settings.speed': 'Animation speed',
  'settings.speed.normal': 'Normal',
  'settings.speed.fast': 'Fast',
  'settings.speed.instant': 'Instant',
  'settings.reducedMotion': 'Reduced motion',
  'settings.reducedMotion.help': 'No screen shake, flashes or bouncing.',
  'settings.textSize': 'Text size',
  'settings.board': 'Battle board',
  'settings.board.3d': '3D arena',
  'settings.board.2d': '2D flat',
  'settings.access': 'Accessibility',
  'settings.colorblind': 'Landscape symbols',
  'settings.colorblind.help': 'Shows each landscape’s icon on the board, not just its colour.',
  'settings.language': 'Language',
  'settings.credits': 'Credits',
  'settings.tutorial': 'Replay tutorial',

  'profile.title': 'Profile',
  'profile.name': 'Name',
  'profile.rename': 'Rename',
  'profile.avatar': 'Avatar',
  'profile.cardBack': 'Card back',
  'profile.stats': 'Stats',
  'profile.locked': 'Locked',

  'tip.1': 'Creatures cannot attack the turn they are played, unless they have Rush.',
  'tip.2': 'An empty enemy lane lets your creature hit the Hero directly.',
  'tip.3': 'Flooping a creature uses its ability, but it will not attack this turn.',
  'tip.4': 'Pay 1 MP to draw an extra card once per turn.',
  'tip.5': 'Each landscape type has its own symbol as well as its colour.',
  'tip.6': 'Guard creatures protect their neighbours from attackers in empty lanes.',
  'tip.7': 'Tap any card on the board to read it in full.',
  'tip.8': 'Win campaign battles with their two goals to earn all three stars.',
  'tip.9': 'The Daily Dungeon changes every day, and everyone faces the same one.',
  'tip.10': 'Spare copies of a card level it up; scrapping extras gives Dust.',
} as const;

export type StringKey = keyof typeof en;
export type StringTable = Record<StringKey, string>;

export const LANGUAGES: { id: string; name: string; table: StringTable }[] = [
  { id: 'en', name: 'English', table: en },
];

export const TIP_KEYS: StringKey[] = Object.keys(en).filter((k) => k.startsWith('tip.')) as StringKey[];

/** Looks up a string in the current language (English fallback); `{name}` placeholders are filled from params. */
export function t(key: StringKey, params: Record<string, string | number> = {}): string {
  const lang = LANGUAGES.find((l) => l.id === getSettings().language) ?? LANGUAGES[0]!;
  const raw = lang.table[key] ?? en[key];
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
