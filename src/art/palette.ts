/**
 * Pure palette data for art generation (no Phaser). Landscape colors come from
 * src/data/landscapes.json; neutral and rarity colors are defined here.
 */
import landscapeData from '../data/landscapes.json';
import type { CardLandscape, Rarity } from '../engine/types';
import { hexToInt } from './color';

export type IconShape = 'snowflake' | 'sun' | 'droplet' | 'triangle' | 'heart' | 'flame' | 'compass';

export interface PaletteEntry {
  id: CardLandscape;
  name: string;
  color: number;
  dark: number;
  light: number;
  /** Card banner colour (muted, readable under white text). */
  ink: number;
  icon: IconShape;
}

const NEUTRAL: PaletteEntry = {
  id: 'neutral',
  name: 'Rainbow',
  color: 0x9aa3b8,
  dark: 0x4d5468,
  light: 0xdfe4ef,
  ink: 0x5e6475,
  icon: 'compass',
};

export const PALETTE: Readonly<Record<CardLandscape, PaletteEntry>> = Object.freeze(
  Object.fromEntries([
    ...landscapeData.landscapes.map((l) => [
      l.id,
      {
        id: l.id as CardLandscape,
        name: l.name,
        color: hexToInt(l.color),
        dark: hexToInt(l.dark),
        light: hexToInt(l.light),
        ink: hexToInt(l.ink),
        icon: l.icon as IconShape,
      },
    ]),
    ['neutral', NEUTRAL],
  ]) as Record<CardLandscape, PaletteEntry>,
);

export const RARITY_COLORS: Readonly<Record<Rarity, number>> = {
  common: 0xd9dde6,
  uncommon: 0x57d163,
  rare: 0x3fa9ff,
  epic: 0xb65cff,
  legendary: 0xffb22e,
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

/** Rarity gem shapes differ too, so rarity is readable without color. */
export const RARITY_SHAPE: Readonly<Record<Rarity, 'circle' | 'diamond' | 'square' | 'pentagon' | 'star'>> = {
  common: 'circle',
  uncommon: 'diamond',
  rare: 'square',
  epic: 'pentagon',
  legendary: 'star',
};
