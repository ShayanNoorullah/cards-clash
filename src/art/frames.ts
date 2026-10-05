/**
 * Baked card-face parts: frames (one per landscape), stat and cost badges,
 * requirement pips, foil, gems,
 * rarity gems, stat badges, landscape tiles and card backs. All drawn in code.
 */
import type Phaser from 'phaser';
import { Rng } from '../engine/rng';
import { LANDSCAPE_TYPES, RARITIES, type CardLandscape, type Rarity } from '../engine/types';
import {
  ART,
  ART_FADE_H,
  ATK_BADGE,
  BANNER,
  CARD_H,
  CARD_RADIUS,
  CARD_W,
  COST_BADGE,
  DEF_BADGE,
  FOOTER,
  INNER,
  PIP,
  TEXT_BOX,
  TEXTURE_SCALE as K,
  TILE,
  TYPE_STRIP,
} from './cardLayout';
import { darken, lighten, mix } from './color';
import { drawIcon, ICON_IDS } from './icons';
import { drawLandscapeIcon, type LandscapeIcon } from './landscapeIcons';
import { paintBackdrop, paintMotif } from './painters';
import { PALETTE, RARITY_COLORS, RARITY_SHAPE } from './palette';

type G = Phaser.GameObjects.Graphics;
const INK = 0x120c2b;

export const CARD_LANDSCAPES: readonly CardLandscape[] = [...LANDSCAPE_TYPES, 'neutral'];
export const CARD_BACK_STYLES = ['classic', 'starry', 'checker'] as const;
export type CardBackStyle = (typeof CARD_BACK_STYLES)[number];

export const ART_KEYS = {
  frame: (l: CardLandscape) => `frame-${l}`,
  frameTop: 'frame-top',
  cardAtk: 'card-atk',
  cardDef: (l: CardLandscape) => `card-def-${l}`,
  cardCost: 'card-cost',
  cardPip: 'card-pip',
  cardFoil: 'card-foil',
  landIcon: (l: CardLandscape) => `land-${l}`,
  costGem: 'gem-cost',
  rarityGem: (r: Rarity) => `gem-${r}`,
  atkBadge: 'badge-atk',
  defBadge: 'badge-def',
  tile: (l: CardLandscape) => `tile-${l}`,
  tileFlipped: 'tile-flipped',
  cardBack: (s: CardBackStyle) => `card-back-${s}`,
  icon: (id: string) => `icon-${id}`,
  hero: (id: string) => `hero-${id}`,
  art: (artKey: string) => `art-${artKey}`,
  figure: (artKey: string) => `fig-${artKey}`,
} as const;

export function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, Math.ceil(w), Math.ceil(h));
  g.destroy();
}

/**
 * Bakes drawing done in local coordinates (x0..x1, y0..y1) into a texture and
 * returns an image placed so it lines up with those coordinates. Static
 * Graphics cost CPU every frame in WebGL (they are re-tessellated); a baked
 * image costs one quad. The texture is reused while `key` stays the same.
 */
export function bakeRegion(
  scene: Phaser.Scene,
  key: string,
  bounds: { x0: number; y0: number; x1: number; y1: number },
  draw: (g: G) => void,
  target?: Phaser.GameObjects.Image,
): Phaser.GameObjects.Image {
  const x0 = Math.floor(bounds.x0);
  const y0 = Math.floor(bounds.y0);
  const w = Math.max(1, Math.ceil(bounds.x1) - x0);
  const h = Math.max(1, Math.ceil(bounds.y1) - y0);
  if (!scene.textures.exists(key)) {
    bake(scene, key, w, h, (g) => {
      g.translateCanvas(-x0, -y0);
      draw(g);
    });
  }
  const img = target ?? scene.add.image(0, 0, key);
  return img.setTexture(key).setOrigin(0, 0).setPosition(x0, y0);
}

const FRAME_DARK = 0x0c0c0e;
const CARD_CREAM = 0xf1e4c3;
const STRIP_DARK = 0x2a2320;
const FOOTER_DARK = 0x141416;
const BADGE_CREAM = 0xf4ecdd;
const GOLD = 0xf2a900;

/** Vertical gradient as thin bands (works on both the WebGL and Canvas renderers). */
function vGradient(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  top: number,
  bottom: number,
  steps = 24,
): void {
  for (let i = 0; i < steps; i++) {
    const y0 = y + (h * i) / steps;
    const y1 = y + (h * (i + 1)) / steps;
    g.fillStyle(mix(top, bottom, i / (steps - 1)), 1);
    g.fillRect(x, y0, w, y1 - y0 + 0.5);
  }
}

/** Diagonal pinstripes clipped to a rectangle. */
function diagonalStripes(g: G, x: number, y: number, w: number, h: number, step: number): void {
  for (let t = 0; t < w + h; t += step) {
    let sx = x + t;
    let sy = y;
    let ex = x + t - h;
    let ey = y + h;
    if (sx > x + w) {
      sy += sx - (x + w);
      sx = x + w;
    }
    if (ex < x) {
      ey -= x - ex;
      ex = x;
    }
    if (sy < ey) g.lineBetween(sx, sy, ex, ey);
  }
}

/** Hexagon (pointy top) centred at cx, cy. `inset` shrinks it evenly. */
function hexPoints(cx: number, cy: number, w: number, h: number): Phaser.Types.Math.Vector2Like[] {
  return [
    { x: cx, y: cy - h / 2 },
    { x: cx + w * 0.43, y: cy - h / 4 },
    { x: cx + w * 0.43, y: cy + h / 4 },
    { x: cx, y: cy + h / 2 },
    { x: cx - w * 0.43, y: cy + h / 4 },
    { x: cx - w * 0.43, y: cy - h / 4 },
  ];
}

/** Shield: flat top, sides down to 62%, point at the bottom. */
function shieldPoints(x: number, y: number, w: number, h: number): Phaser.Types.Math.Vector2Like[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h * 0.62 },
    { x: x + w / 2, y: y + h },
    { x, y: y + h * 0.62 },
  ];
}

/** Everything except the artwork, which CardView draws on top of the art window. */
function drawFrame(g: G, l: CardLandscape): void {
  const pal = PALETTE[l];
  const W = CARD_W * K;
  const H = CARD_H * K;
  g.fillStyle(FRAME_DARK, 1);
  g.fillRoundedRect(0, 0, W, H, CARD_RADIUS * K);
  g.fillStyle(CARD_CREAM, 1);
  g.fillRoundedRect(INNER.x * K, INNER.y * K, INNER.w * K, INNER.h * K, INNER.r * K);

  // Name banner with pinstripes.
  g.fillStyle(pal.ink, 1);
  g.fillRect(BANNER.x * K, BANNER.y * K, BANNER.w * K, BANNER.h * K);
  g.lineStyle(1 * K, 0xffffff, 0.07);
  diagonalStripes(g, BANNER.x * K, BANNER.y * K, BANNER.w * K, BANNER.h * K, 7 * K);

  // Type strip.
  g.fillStyle(STRIP_DARK, 1);
  g.fillRect(TYPE_STRIP.x * K, TYPE_STRIP.y * K, TYPE_STRIP.w * K, TYPE_STRIP.h * K);
  g.fillStyle(pal.ink, 1);
  g.fillRoundedRect((TYPE_STRIP.x + 8) * K, (TYPE_STRIP.y + 3) * K, 14 * K, 14 * K, 3 * K);

  // Rules box: warm parchment gradient.
  vGradient(g, TEXT_BOX.x * K, TEXT_BOX.y * K, TEXT_BOX.w * K, TEXT_BOX.h * K, 0xf4e9cc, 0xead9af);

  // Footer (rounded only at the bottom, like the inner card).
  g.fillStyle(FOOTER_DARK, 1);
  g.fillRoundedRect(FOOTER.x * K, FOOTER.y * K, FOOTER.w * K, FOOTER.h * K, {
    tl: 0,
    tr: 0,
    bl: INNER.r * K,
    br: INNER.r * K,
  });
}

/** Drawn over the artwork: rounded top corners and a soft shadow fading into the banner. */
function drawFrameTop(g: G): void {
  const r = INNER.r * K;
  const x0 = ART.x * K;
  const x1 = (ART.x + ART.w) * K;
  const y0 = ART.y * K;
  g.fillStyle(FRAME_DARK, 1);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0 + r, y0);
  g.arc(x0 + r, y0 + r, r, -Math.PI / 2, Math.PI, true);
  g.closePath();
  g.fillPath();
  g.beginPath();
  g.moveTo(x1, y0);
  g.lineTo(x1, y0 + r);
  g.arc(x1 - r, y0 + r, r, 0, -Math.PI / 2, true);
  g.closePath();
  g.fillPath();
  const fadeTop = (ART.y + ART.h - ART_FADE_H) * K;
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    g.fillStyle(0x000000, (0.35 * (i + 1)) / steps);
    g.fillRect(x0, fadeTop + (ART_FADE_H * K * i) / steps, ART.w * K, (ART_FADE_H * K) / steps + 0.5);
  }
}

function drawCardAtk(g: G): void {
  const s = (ATK_BADGE.r + 3) * 2 * K;
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(s / 2, s / 2 + 2 * K, ATK_BADGE.r * K);
  g.fillStyle(STRIP_DARK, 1);
  g.fillCircle(s / 2, s / 2, ATK_BADGE.r * K);
  g.fillStyle(BADGE_CREAM, 1);
  g.fillCircle(s / 2, s / 2, (ATK_BADGE.r - 2) * K);
}

function drawCardDef(g: G, l: CardLandscape): void {
  const w = DEF_BADGE.w * K;
  const h = DEF_BADGE.h * K;
  const pad = 2 * K;
  g.fillStyle(0x000000, 0.35);
  g.fillPoints(shieldPoints(pad, pad + 2 * K, w, h), true);
  g.fillStyle(STRIP_DARK, 1);
  g.fillPoints(shieldPoints(pad, pad, w, h), true);
  const i = 2.5 * K;
  g.fillStyle(PALETTE[l].ink, 1);
  g.fillPoints(shieldPoints(pad + i, pad + i, w - i * 2, h - i * 2.2), true);
}

function drawCardCost(g: G): void {
  const s = COST_BADGE.size * K;
  const c = s / 2 + 2 * K;
  g.fillStyle(0x000000, 0.45);
  g.fillPoints(hexPoints(c, c + 2 * K, s, s), true);
  g.fillStyle(GOLD, 1);
  g.fillPoints(hexPoints(c, c, s, s), true);
  g.fillStyle(FOOTER_DARK, 1);
  g.fillPoints(hexPoints(c, c, s - 9 * K, s - 9 * K), true);
}

/** Landscape-requirement pip: dark hexagon with a gold diamond. */
function drawCardPip(g: G): void {
  const w = PIP.w * K;
  const h = PIP.h * K;
  g.fillStyle(STRIP_DARK, 1);
  g.fillPoints(hexPoints(w / 2, h / 2, w / 0.86, h), true);
  const d = 4 * K;
  g.fillStyle(GOLD, 1);
  g.fillPoints(
    [
      { x: w / 2, y: h / 2 - d },
      { x: w / 2 + d, y: h / 2 },
      { x: w / 2, y: h / 2 + d },
      { x: w / 2 - d, y: h / 2 },
    ],
    true,
  );
}

/** Foil sheen for Epic and Legendary cards (drawn with the SCREEN blend mode). */
function drawCardFoil(g: G): void {
  const W = INNER.w * K;
  const H = INNER.h * K;
  const band = (from: number, to: number, color: number, alpha: number) => {
    g.fillStyle(color, alpha);
    g.fillPoints(
      [
        { x: W * from, y: 0 },
        { x: W * to, y: 0 },
        { x: W * to - H * 0.47, y: H },
        { x: W * from - H * 0.47, y: H },
      ],
      true,
    );
  };
  band(0.55, 0.75, 0xffffff, 0.18);
  band(0.62, 0.7, 0xffffff, 0.24);
  band(0.75, 0.9, 0xffecaa, 0.18);
}

function drawGem(
  g: G,
  shape: (typeof RARITY_SHAPE)[Rarity],
  cx: number,
  cy: number,
  r: number,
  color: number,
): void {
  const p: { x: number; y: number }[] = [];
  const poly = (n: number, rot: number, inner = 1) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (Math.PI * 2 * i) / n;
      const rr = inner !== 1 && i % 2 === 1 ? r * inner : r;
      p.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
  };
  switch (shape) {
    case 'circle':
      poly(20, 0);
      break;
    case 'diamond':
      poly(4, -Math.PI / 2);
      break;
    case 'square':
      poly(4, Math.PI / 4);
      break;
    case 'pentagon':
      poly(5, -Math.PI / 2);
      break;
    case 'star':
      poly(10, -Math.PI / 2, 0.5);
      break;
  }
  g.fillStyle(INK, 1);
  g.fillCircle(cx, cy, r + 3 * K);
  g.fillStyle(color, 1);
  g.fillPoints(p, true);
  g.lineStyle(2 * K, darken(color, 0.3), 1);
  g.strokePoints(p, true);
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(cx - r * 0.25, cy - r * 0.3, r * 0.22);
}

function drawCostGem(g: G): void {
  const r = 27 * K;
  const c = r + 3 * K;
  g.fillStyle(INK, 1);
  g.fillCircle(c, c, r + 3 * K);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (Math.PI * 2 * i) / 8;
    pts.push({ x: c + Math.cos(a) * r, y: c + Math.sin(a) * r });
  }
  g.fillStyle(0x3f7cf0, 1);
  g.fillPoints(pts, true);
  g.fillStyle(0x76a8ff, 1);
  g.fillCircle(c, c, r * 0.72);
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(c - r * 0.2, c - r * 0.35, r * 0.8, r * 0.35);
}

function drawAtkBadge(g: G): void {
  const r = 30 * K;
  const c = r + 4 * K;
  g.fillStyle(INK, 1);
  g.fillCircle(c, c, r + 4 * K);
  g.fillStyle(0xe0413a, 1);
  g.fillCircle(c, c, r);
  // Crossed-blade notch marks (shape cue besides color)
  g.fillStyle(0xffffff, 0.22);
  g.fillTriangle(c - r * 0.9, c - r * 0.2, c - r * 0.5, c - r * 0.9, c - r * 0.35, c - r * 0.35);
  g.fillTriangle(c + r * 0.9, c - r * 0.2, c + r * 0.5, c - r * 0.9, c + r * 0.35, c - r * 0.35);
}

function drawDefBadge(g: G): void {
  const r = 30 * K;
  const c = r + 4 * K;
  const shield = (rr: number) => [
    { x: c - rr * 0.9, y: c - rr * 0.85 },
    { x: c + rr * 0.9, y: c - rr * 0.85 },
    { x: c + rr * 0.85, y: c + rr * 0.15 },
    { x: c, y: c + rr * 1.02 },
    { x: c - rr * 0.85, y: c + rr * 0.15 },
  ];
  g.fillStyle(INK, 1);
  g.fillPoints(shield(r + 5 * K), true);
  g.fillStyle(0x3f8fe0, 1);
  g.fillPoints(shield(r), true);
  g.fillStyle(0xffffff, 0.2);
  g.fillRect(c - r * 0.7, c - r * 0.7, r * 1.4, r * 0.3);
}

function drawLandBadge(g: G, l: CardLandscape): void {
  const pal = PALETTE[l];
  const r = 23 * K;
  const c = r + 3 * K;
  g.fillStyle(INK, 1);
  g.fillCircle(c, c, r + 3 * K);
  g.fillStyle(pal.dark, 1);
  g.fillCircle(c, c, r);
  drawLandscapeIcon(g, pal.icon as LandscapeIcon, c, c, r * 1.3, pal.light, INK);
}

function drawTile(g: G, l: CardLandscape): void {
  const w = TILE.w * K;
  const h = TILE.h * K;
  paintBackdrop(g, w, h, l, 1000 + CARD_LANDSCAPES.indexOf(l));
  const pal = PALETTE[l];
  g.fillStyle(INK, 0.35);
  g.fillCircle(w / 2, h * 0.42, 34 * K);
  drawLandscapeIcon(g, pal.icon as LandscapeIcon, w / 2, h * 0.42, 48 * K, pal.light, INK);
  g.lineStyle(6 * K, INK, 1);
  g.strokeRect(3 * K, 3 * K, w - 6 * K, h - 6 * K);
}

function drawFlippedTile(g: G): void {
  const w = TILE.w * K;
  const h = TILE.h * K;
  g.fillStyle(0x6b6358, 1);
  g.fillRect(0, 0, w, h);
  const rng = new Rng('flipped-tile');
  for (let i = 0; i < 26; i++) {
    g.fillStyle(rng.pick([0x5b544a, 0x7d7466, 0x8a8172]), 1);
    g.fillRoundedRect(
      rng.int(0, Math.floor(w - 40 * K)),
      rng.int(0, Math.floor(h - 20 * K)),
      rng.int(20, 50) * K,
      rng.int(10, 20) * K,
      4 * K,
    );
  }
  drawIcon(g, 'flipped', w / 2, h / 2, 56 * K, INK);
  g.lineStyle(6 * K, INK, 1);
  g.strokeRect(3 * K, 3 * K, w - 6 * K, h - 6 * K);
}

function drawCardBack(g: G, style: CardBackStyle): void {
  const W = CARD_W * K;
  const H = CARD_H * K;
  const R = CARD_RADIUS * K;
  g.fillStyle(INK, 1);
  g.fillRoundedRect(0, 0, W, H, R);
  const base = style === 'classic' ? 0x2f2766 : style === 'starry' ? 0x14204a : 0x5a2b54;
  g.fillStyle(base, 1);
  g.fillRoundedRect(8 * K, 8 * K, W - 16 * K, H - 16 * K, R - 6 * K);
  const cx = W / 2;
  const cy = H / 2;
  if (style === 'starry') {
    const rng = new Rng('back-starry');
    for (let i = 0; i < 60; i++) {
      g.fillStyle(0xffffff, rng.next() * 0.7 + 0.3);
      g.fillCircle(rng.int(16, Math.floor(W - 16)), rng.int(16, Math.floor(H - 16)), rng.int(1, 3) * K);
    }
  } else if (style === 'checker') {
    const sz = 30 * K;
    for (let y = 8 * K; y < H - 8 * K; y += sz) {
      for (let x = 8 * K; x < W - 8 * K; x += sz) {
        if ((Math.round(x / sz) + Math.round(y / sz)) % 2 === 0) {
          g.fillStyle(lighten(base, 0.08), 1);
          g.fillRect(x, y, Math.min(sz, W - 8 * K - x), Math.min(sz, H - 8 * K - y));
        }
      }
    }
  }
  // Six landscape wedges around a gold core
  LANDSCAPE_TYPES.forEach((l, i) => {
    const a0 = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const a1 = (Math.PI * 2 * (i + 1)) / 6 - Math.PI / 2;
    g.fillStyle(PALETTE[l].color, 1);
    g.slice(cx, cy, 110 * K, a0, a1, false);
    g.fillPath();
  });
  g.fillStyle(INK, 1);
  g.fillCircle(cx, cy, 62 * K);
  g.fillStyle(0xffc93c, 1);
  g.fillCircle(cx, cy, 52 * K);
  paintMotif(g, 'star', cx, cy, 70 * K, 0xfff3a0, INK);
  g.lineStyle(6 * K, 0xffc93c, 1);
  g.strokeRoundedRect(22 * K, 22 * K, W - 44 * K, H - 44 * K, 14 * K);
}

export interface BakeTask {
  key: string;
  build: (scene: Phaser.Scene) => void;
}

/** Every static card-part texture, baked once during Preload. */
export function cardPartTasks(): BakeTask[] {
  const tasks: BakeTask[] = [];
  for (const l of CARD_LANDSCAPES) {
    tasks.push({
      key: ART_KEYS.frame(l),
      build: (s) => bake(s, ART_KEYS.frame(l), CARD_W * K, CARD_H * K, (g) => drawFrame(g, l)),
    });
    tasks.push({
      key: ART_KEYS.landIcon(l),
      build: (s) => bake(s, ART_KEYS.landIcon(l), 52 * K, 52 * K, (g) => drawLandBadge(g, l)),
    });
    tasks.push({
      key: ART_KEYS.tile(l),
      build: (s) => bake(s, ART_KEYS.tile(l), TILE.w * K, TILE.h * K, (g) => drawTile(g, l)),
    });
  }
  tasks.push({
    key: ART_KEYS.tileFlipped,
    build: (s) => bake(s, ART_KEYS.tileFlipped, TILE.w * K, TILE.h * K, drawFlippedTile),
  });
  for (const l of CARD_LANDSCAPES) {
    tasks.push({
      key: ART_KEYS.cardDef(l),
      build: (s) =>
        bake(s, ART_KEYS.cardDef(l), (DEF_BADGE.w + 4) * K, (DEF_BADGE.h + 6) * K, (g) => drawCardDef(g, l)),
    });
  }
  tasks.push({
    key: ART_KEYS.frameTop,
    build: (s) => bake(s, ART_KEYS.frameTop, CARD_W * K, CARD_H * K, drawFrameTop),
  });
  tasks.push({
    key: ART_KEYS.cardAtk,
    build: (s) =>
      bake(s, ART_KEYS.cardAtk, (ATK_BADGE.r + 3) * 2 * K, (ATK_BADGE.r + 4) * 2 * K, drawCardAtk),
  });
  tasks.push({
    key: ART_KEYS.cardCost,
    build: (s) =>
      bake(s, ART_KEYS.cardCost, (COST_BADGE.size + 4) * K, (COST_BADGE.size + 6) * K, drawCardCost),
  });
  tasks.push({
    key: ART_KEYS.cardPip,
    build: (s) => bake(s, ART_KEYS.cardPip, PIP.w * K, PIP.h * K, drawCardPip),
  });
  tasks.push({
    key: ART_KEYS.cardFoil,
    build: (s) => bake(s, ART_KEYS.cardFoil, INNER.w * K, INNER.h * K, drawCardFoil),
  });
  tasks.push({ key: ART_KEYS.costGem, build: (s) => bake(s, ART_KEYS.costGem, 60 * K, 60 * K, drawCostGem) });
  tasks.push({
    key: ART_KEYS.atkBadge,
    build: (s) => bake(s, ART_KEYS.atkBadge, 68 * K, 68 * K, drawAtkBadge),
  });
  tasks.push({
    key: ART_KEYS.defBadge,
    build: (s) => bake(s, ART_KEYS.defBadge, 68 * K, 72 * K, drawDefBadge),
  });
  for (const r of RARITIES) {
    tasks.push({
      key: ART_KEYS.rarityGem(r),
      build: (s) =>
        bake(s, ART_KEYS.rarityGem(r), 30 * K, 30 * K, (g) =>
          drawGem(g, RARITY_SHAPE[r], 15 * K, 15 * K, 11 * K, RARITY_COLORS[r]),
        ),
    });
  }
  for (const id of ICON_IDS) {
    tasks.push({
      key: ART_KEYS.icon(id),
      build: (s) =>
        bake(s, ART_KEYS.icon(id), 48 * K, 48 * K, (g) => drawIcon(g, id, 24 * K, 24 * K, 46 * K)),
    });
  }
  for (const style of CARD_BACK_STYLES) {
    tasks.push({
      key: ART_KEYS.cardBack(style),
      build: (s) => bake(s, ART_KEYS.cardBack(style), CARD_W * K, CARD_H * K, (g) => drawCardBack(g, style)),
    });
  }
  return tasks;
}
