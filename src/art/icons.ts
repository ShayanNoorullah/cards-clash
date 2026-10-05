/**
 * Procedural ability icons for keywords, statuses and triggers. Each icon has a
 * distinct silhouette (readable without color) and is baked into a texture
 * named `icon-<id>` during Preload.
 */
import type Phaser from 'phaser';
import { drawLandscapeIcon } from './landscapeIcons';
import { paintMotif } from './painters';

type G = Phaser.GameObjects.Graphics;

export const ICON_IDS = [
  // keywords
  'rush',
  'guard',
  'ranged',
  'lifesteal',
  'thorns',
  'counter',
  'shield',
  'poison',
  'regenerate',
  'swift',
  'stealth',
  // statuses
  'frozen',
  'flipped',
  // triggers / ability markers
  'onPlay',
  'onDestroy',
  'startOfTurn',
  'endOfTurn',
  'onAttack',
  'onDamaged',
  'floop',
  'aura',
  'spellPower',
] as const;
export type IconId = (typeof ICON_IDS)[number];

export const ICON_COLORS: Record<IconId, number> = {
  rush: 0xff7a2e,
  guard: 0x8fa6c9,
  ranged: 0x58c46a,
  lifesteal: 0xe84a6b,
  thorns: 0x7fbf4a,
  counter: 0xf2a33a,
  shield: 0x5cc8ff,
  poison: 0x9c5ce0,
  regenerate: 0x4fd18b,
  swift: 0x9fe3ff,
  stealth: 0x7a7f99,
  frozen: 0xaee4ff,
  flipped: 0xb0a48a,
  onPlay: 0xffd23f,
  onDestroy: 0xc9c9c9,
  startOfTurn: 0xffb347,
  endOfTurn: 0x8f9bff,
  onAttack: 0xff6b5b,
  onDamaged: 0xff9f7a,
  floop: 0xb884ff,
  aura: 0x7ae0c9,
  spellPower: 0xffe066,
};

export function isIconId(id: string): id is IconId {
  return (ICON_IDS as readonly string[]).includes(id);
}

function pts(g: G, points: [number, number][], fill: number, ink: number): void {
  const p = points.map(([x, y]) => ({ x, y }));
  g.fillStyle(fill, 1);
  g.fillPoints(p, true);
  g.lineStyle(3, ink, 1);
  g.strokePoints(p, true);
}

/** Draws icon `id` centered at (cx, cy) inside a `size` box. */
export function drawIcon(g: G, id: IconId, cx: number, cy: number, size: number, ink = 0x120c2b): void {
  const r = size / 2;
  const c = ICON_COLORS[id];
  // Round badge behind every icon
  g.fillStyle(ink, 1);
  g.fillCircle(cx, cy, r);
  g.fillStyle(0x2a2350, 1);
  g.fillCircle(cx, cy, r - 3);
  const k = r * 0.62;
  switch (id) {
    case 'rush':
      for (const dx of [-0.35, 0.25]) {
        pts(
          g,
          [
            [cx + (dx - 0.3) * k, cy - k * 0.8],
            [cx + (dx + 0.35) * k, cy],
            [cx + (dx - 0.3) * k, cy + k * 0.8],
            [cx + (dx - 0.05) * k, cy],
          ],
          c,
          ink,
        );
      }
      break;
    case 'guard':
      paintMotif(g, 'shield', cx, cy, k * 2, c, ink);
      g.lineStyle(4, ink, 1);
      g.lineBetween(cx, cy - k * 0.6, cx, cy + k * 0.6);
      break;
    case 'ranged':
      g.lineStyle(4, c, 1);
      g.lineBetween(cx - k * 0.8, cy + k * 0.8, cx + k * 0.6, cy - k * 0.6);
      pts(
        g,
        [
          [cx + k * 0.9, cy - k * 0.9],
          [cx + k * 0.25, cy - k * 0.65],
          [cx + k * 0.65, cy - k * 0.25],
        ],
        c,
        ink,
      );
      pts(
        g,
        [
          [cx - k * 0.8, cy + k * 0.8],
          [cx - k * 0.9, cy + k * 0.3],
          [cx - k * 0.5, cy + k * 0.5],
        ],
        0xffffff,
        ink,
      );
      break;
    case 'lifesteal':
      drawLandscapeIcon(g, 'heart', cx - k * 0.15, cy, k * 1.6, c, ink);
      drawLandscapeIcon(g, 'droplet', cx + k * 0.6, cy + k * 0.45, k * 0.8, 0xb3122e, ink);
      break;
    case 'thorns': {
      const p: [number, number][] = [];
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16;
        const rr = i % 2 === 0 ? k : k * 0.55;
        p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      pts(g, p, c, ink);
      break;
    }
    case 'counter':
      pts(
        g,
        [
          [cx - k, cy - k * 0.2],
          [cx - k * 0.3, cy - k * 0.8],
          [cx - k * 0.3, cy - k * 0.45],
          [cx + k * 0.8, cy - k * 0.45],
          [cx + k * 0.8, cy + k * 0.05],
          [cx - k * 0.3, cy + k * 0.05],
          [cx - k * 0.3, cy + k * 0.4],
        ],
        c,
        ink,
      );
      pts(
        g,
        [
          [cx + k, cy + k * 0.5],
          [cx + k * 0.3, cy + k],
          [cx + k * 0.3, cy + k * 0.75],
          [cx - k * 0.5, cy + k * 0.75],
          [cx - k * 0.5, cy + k * 0.3],
          [cx + k * 0.3, cy + k * 0.3],
          [cx + k * 0.3, cy + k * 0.05],
        ],
        0xffffff,
        ink,
      );
      break;
    case 'shield':
      paintMotif(g, 'shield', cx, cy, k * 2, c, ink);
      break;
    case 'poison':
      drawLandscapeIcon(g, 'droplet', cx, cy, k * 1.8, c, ink);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(cx - k * 0.2, cy + k * 0.2, k * 0.15);
      g.fillCircle(cx + k * 0.2, cy + k * 0.35, k * 0.1);
      break;
    case 'regenerate':
      g.lineStyle(5, c, 1);
      g.beginPath();
      g.arc(cx, cy, k * 0.8, -Math.PI * 0.3, Math.PI * 1.35);
      g.strokePath();
      pts(
        g,
        [
          [cx + k * 0.85, cy - k * 0.9],
          [cx + k * 0.95, cy - k * 0.2],
          [cx + k * 0.3, cy - k * 0.45],
        ],
        c,
        ink,
      );
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx - k * 0.1, cy - k * 0.4, k * 0.2, k * 0.8);
      g.fillRect(cx - k * 0.4, cy - k * 0.1, k * 0.8, k * 0.2);
      break;
    case 'swift':
      pts(
        g,
        [
          [cx - k * 0.2, cy - k * 0.7],
          [cx + k, cy],
          [cx - k * 0.2, cy + k * 0.7],
        ],
        c,
        ink,
      );
      g.lineStyle(4, c, 1);
      for (const dy of [-0.4, 0, 0.4]) g.lineBetween(cx - k, cy + dy * k, cx - k * 0.4, cy + dy * k);
      break;
    case 'stealth':
      g.fillStyle(c, 1);
      g.fillEllipse(cx, cy, k * 2, k * 1.1);
      g.lineStyle(3, ink, 1);
      g.strokeEllipse(cx, cy, k * 2, k * 1.1);
      g.fillStyle(ink, 1);
      g.fillCircle(cx, cy, k * 0.35);
      g.lineStyle(5, 0xffffff, 1);
      g.lineBetween(cx - k * 0.9, cy + k * 0.8, cx + k * 0.9, cy - k * 0.8);
      break;
    case 'frozen':
      drawLandscapeIcon(g, 'snowflake', cx, cy, k * 2, c, ink);
      break;
    case 'flipped':
      g.lineStyle(5, c, 1);
      g.beginPath();
      g.arc(cx, cy, k * 0.75, Math.PI * 0.15, Math.PI * 0.85);
      g.strokePath();
      g.beginPath();
      g.arc(cx, cy, k * 0.75, Math.PI * 1.15, Math.PI * 1.85);
      g.strokePath();
      pts(
        g,
        [
          [cx - k, cy + k * 0.1],
          [cx - k * 0.5, cy + k * 0.1],
          [cx - k * 0.75, cy + k * 0.55],
        ],
        c,
        ink,
      );
      pts(
        g,
        [
          [cx + k, cy - k * 0.1],
          [cx + k * 0.5, cy - k * 0.1],
          [cx + k * 0.75, cy - k * 0.55],
        ],
        c,
        ink,
      );
      break;
    case 'onPlay':
      paintMotif(g, 'star', cx, cy, k * 2, c, ink);
      break;
    case 'onDestroy':
      paintMotif(g, 'skull', cx, cy, k * 1.9, c, ink);
      break;
    case 'startOfTurn':
      g.fillStyle(c, 1);
      g.slice(cx, cy + k * 0.3, k * 0.7, Math.PI, 0, false);
      g.fillPath();
      g.lineStyle(3, c, 1);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (Math.PI * (i + 0.5)) / 5;
        g.lineBetween(
          cx + Math.cos(a) * k * 0.85,
          cy + k * 0.3 + Math.sin(a) * k * 0.85,
          cx + Math.cos(a) * k * 1.1,
          cy + k * 0.3 + Math.sin(a) * k * 1.1,
        );
      }
      g.lineBetween(cx - k, cy + k * 0.35, cx + k, cy + k * 0.35);
      break;
    case 'endOfTurn':
      g.fillStyle(c, 1);
      g.fillCircle(cx, cy, k * 0.85);
      g.fillStyle(0x2a2350, 1);
      g.fillCircle(cx + k * 0.4, cy - k * 0.25, k * 0.7);
      break;
    case 'onAttack':
      pts(
        g,
        [
          [cx - k * 0.85, cy + k * 0.85],
          [cx + k * 0.55, cy - k * 0.55],
          [cx + k * 0.85, cy - k * 0.85],
          [cx + k * 0.75, cy - k * 0.45],
          [cx - k * 0.65, cy + k * 0.95],
        ],
        c,
        ink,
      );
      g.lineStyle(5, ink, 1);
      g.lineBetween(cx - k * 0.6, cy + k * 0.2, cx - k * 0.2, cy + k * 0.6);
      break;
    case 'onDamaged':
      pts(
        g,
        [
          [cx - k * 0.9, cy - k * 0.2],
          [cx - k * 0.2, cy - k * 0.3],
          [cx - k * 0.1, cy - k],
          [cx + k * 0.3, cy - k * 0.2],
          [cx + k, cy - k * 0.1],
          [cx + k * 0.2, cy + k * 0.3],
          [cx + k * 0.3, cy + k],
          [cx - k * 0.2, cy + k * 0.3],
        ],
        c,
        ink,
      );
      break;
    case 'floop':
      paintMotif(g, 'swirl', cx, cy, k * 2, c, ink);
      break;
    case 'aura':
      g.lineStyle(4, c, 1);
      for (const rr of [0.35, 0.65, 0.95]) g.strokeCircle(cx, cy, k * rr);
      g.fillStyle(c, 1);
      g.fillCircle(cx, cy, k * 0.2);
      break;
    case 'spellPower':
      g.lineStyle(5, 0xb58b52, 1);
      g.lineBetween(cx - k * 0.8, cy + k * 0.8, cx + k * 0.2, cy - k * 0.2);
      paintMotif(g, 'star', cx + k * 0.35, cy - k * 0.35, k * 1.1, c, ink);
      break;
  }
}
