/**
 * Client display constants. The game is authored at a fixed portrait resolution
 * and scaled by Phaser (Scale.FIT) to any phone or desktop window.
 */
export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

/** UI body text (condensed, modern). */
export const FONT_FAMILY = '"Barlow Condensed", "Arial Narrow", "Segoe UI", sans-serif';
/** Titles and big labels. */
export const HEADING_FONT = '"Oswald", "Arial Narrow", "Segoe UI", sans-serif';
/** Card faces: Oswald for names and numbers, Barlow Condensed for rules text. */
export const CARD_TITLE_FONT = '"Oswald", "Arial Narrow", "Segoe UI", sans-serif';
export const CARD_BODY_FONT = '"Barlow Condensed", "Arial Narrow", "Segoe UI", sans-serif';

export const SCENE_KEYS = {
  Boot: 'Boot',
  Preload: 'Preload',
  Title: 'Title',
  MainMenu: 'MainMenu',
  Credits: 'Credits',
  Gallery: 'Gallery',
  MatchSetup: 'MatchSetup',
  Match: 'Match',
  Collection: 'Collection',
  Decks: 'Decks',
  DeckBuilder: 'DeckBuilder',
  Shop: 'Shop',
  Quests: 'Quests',
  Play: 'Play',
  Campaign: 'Campaign',
  Daily: 'Daily',
  Gauntlet: 'Gauntlet',
  Draft: 'Draft',
  Settings: 'Settings',
  Profile: 'Profile',
  Online: 'Online',
  Account: 'Account',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];
