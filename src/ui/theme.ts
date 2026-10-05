import type Phaser from 'phaser';
import { FONT_FAMILY, HEADING_FONT } from '../config/display';
import { getSettings } from '../services/settings';

/** Shared UI palette: dark fantasy (night blues, gold trim, jewel-tone actions). */
export const COLORS = {
  bgTop: 0x070a16,
  bgBottom: 0x141a33,
  panel: 0x10152a,
  panelLight: 0x1c2342,
  outline: 0x04060d,
  text: 0xf4efe3,
  textDim: 0xa9b1cc,
  accent: 0xe6b04b,
  accentDark: 0x7d5713,
  primary: 0x2a9d63,
  primaryDark: 0x0f4a2c,
  secondary: 0x3864b8,
  secondaryDark: 0x172d5e,
  danger: 0xb3323b,
  dangerDark: 0x561016,
} as const;

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function parseHexColor(value: string): number {
  const cleaned = value.replace('#', '');
  const n = Number.parseInt(cleaned, 16);
  if (cleaned.length !== 6 || Number.isNaN(n)) throw new Error(`Invalid hex color: ${value}`);
  return n;
}

export type TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

/** Size for long-form text (descriptions, dialogs, logs), scaled by the Text size setting. */
export function bodySize(px: number): number {
  return Math.round(px * getSettings().textScale);
}

/**
 * Standard text: condensed body font, or the heading font for large sizes.
 * Thin outline plus a soft drop shadow (readable on art, without a cartoon look).
 */
export function textStyle(size: number, overrides: TextStyle = {}): TextStyle {
  const heading = size >= 56;
  return {
    fontFamily: heading ? HEADING_FONT : FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: heading ? '700' : '600',
    color: hex(COLORS.text),
    stroke: hex(COLORS.outline),
    strokeThickness: Math.max(2, Math.round(size / 16)),
    align: 'center',
    shadow: {
      offsetX: 0,
      offsetY: Math.max(2, size / 18),
      color: '#000000',
      blur: Math.max(2, size / 10),
      fill: true,
      stroke: true,
    },
    resolution: 2,
    ...overrides,
  };
}
