/**
 * Painters turn art genomes into vector drawings on a Phaser Graphics object.
 * Everything is drawn from simple shapes; nothing here loads external files.
 * Coordinates are local to a (w × h) art window starting at (0, 0).
 */
import type Phaser from 'phaser';
import { Rng } from '../engine/rng';
import type { CardLandscape } from '../engine/types';
import { darken, lighten, mix } from './color';
import type { BuildingGenome, CreatureGenome, HeroGenome, SpellGenome } from './genome';
import { drawLandscapeIcon, type LandscapeIcon } from './landscapeIcons';
import { PALETTE } from './palette';

type G = Phaser.GameObjects.Graphics;
type Pt = Phaser.Types.Math.Vector2Like;

const OUTLINE_W = 4;

function poly(g: G, pts: Pt[], fill: number, outline?: number, alpha = 1): void {
  g.fillStyle(fill, alpha);
  g.fillPoints(pts, true);
  if (outline !== undefined) {
    g.lineStyle(OUTLINE_W, outline, 1);
    g.strokePoints(pts, true);
  }
}

function circle(g: G, x: number, y: number, r: number, fill: number, outline?: number, alpha = 1): void {
  g.fillStyle(fill, alpha);
  g.fillCircle(x, y, r);
  if (outline !== undefined) {
    g.lineStyle(OUTLINE_W, outline, 1);
    g.strokeCircle(x, y, r);
  }
}

function ellipse(g: G, x: number, y: number, w: number, h: number, fill: number, outline?: number): void {
  g.fillStyle(fill, 1);
  g.fillEllipse(x, y, w, h);
  if (outline !== undefined) {
    g.lineStyle(OUTLINE_W, outline, 1);
    g.strokeEllipse(x, y, w, h);
  }
}

function rrect(
  g: G,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  outline?: number,
): void {
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, r);
  if (outline !== undefined) {
    g.lineStyle(OUTLINE_W, outline, 1);
    g.strokeRoundedRect(x, y, w, h, r);
  }
}

// ---------------------------------------------------------------------------
// Backdrops
// ---------------------------------------------------------------------------

/** Landscape-themed background: banded sky, rolling ground and seeded decor. */
export function paintBackdrop(
  g: G,
  w: number,
  h: number,
  landscape: CardLandscape,
  seed: number,
  dim = 0,
): void {
  const pal = PALETTE[landscape];
  const rng = new Rng(seed);
  const skyTop = darken(mix(pal.light, pal.color, 0.2), dim);
  const skyBottom = darken(lighten(pal.light, 0.08), dim);
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    g.fillStyle(mix(skyTop, skyBottom, i / (bands - 1)), 1);
    g.fillRect(0, (h * 0.8 * i) / bands, w, (h * 0.8) / bands + 1);
  }

  // Sky decor
  switch (landscape) {
    case 'golden':
    case 'dune':
      circle(g, w * 0.82, h * 0.2, h * 0.12, lighten(pal.color, 0.25), undefined, 0.9);
      break;
    case 'ember':
      for (let i = 0; i < 14; i++)
        circle(g, rng.int(0, w), rng.int(0, Math.floor(h * 0.6)), rng.int(1, 3), 0xffc24a, undefined, 0.8);
      break;
    case 'azure':
      for (let i = 0; i < 16; i++)
        circle(g, rng.int(0, w), rng.int(0, Math.floor(h * 0.7)), rng.int(1, 3), 0xffffff, undefined, 0.85);
      break;
    case 'candy':
      for (let i = 0; i < 6; i++)
        ellipse(
          g,
          rng.int(0, w),
          rng.int(5, Math.floor(h * 0.35)),
          rng.int(30, 60),
          rng.int(12, 20),
          0xffffff,
        );
      break;
    case 'murk':
      for (let i = 0; i < 5; i++)
        circle(
          g,
          rng.int(0, w),
          rng.int(0, Math.floor(h * 0.5)),
          rng.int(8, 18),
          darken(pal.light, 0.05),
          undefined,
          0.35,
        );
      break;
    case 'neutral':
      for (let i = 0; i < 3; i++)
        ellipse(g, rng.int(0, w), rng.int(10, 50), rng.int(40, 80), rng.int(14, 22), 0xffffff);
      break;
  }

  // Ground: two layers of rolling hills
  const layers: [number, number, number][] = [
    [h * 0.62, darken(pal.color, 0.05 + dim), 10],
    [h * 0.78, darken(pal.dark, dim - 0.05), 7],
  ];
  for (const [baseY, color, amp] of layers) {
    const pts: Pt[] = [{ x: 0, y: h }];
    const freq = 1 + rng.next() * 1.5;
    const phase = rng.next() * Math.PI * 2;
    for (let x = 0; x <= w; x += 8)
      pts.push({ x, y: baseY + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp });
    pts.push({ x: w, y: h });
    poly(g, pts, color);
  }

  // Ground decor
  for (let i = 0; i < 10; i++) {
    const x = rng.int(4, w - 4);
    const y = rng.int(Math.floor(h * 0.8), h - 4);
    switch (landscape) {
      case 'golden':
        g.lineStyle(2, 0xf7e27a, 1);
        g.lineBetween(x, y, x + rng.int(-3, 3), y - 14);
        ellipse(g, x, y - 16, 4, 9, 0xf7e27a);
        break;
      case 'murk':
        circle(g, x, y, rng.int(2, 5), lighten(pal.color, 0.2), undefined, 0.7);
        break;
      case 'candy':
        g.fillStyle(rng.pick([0xff6fb5, 0x6fd3ff, 0xfff06f, 0x9dff8a, 0xffffff]), 1);
        g.fillRect(x, y, 6, 3);
        break;
      case 'ember':
        g.lineStyle(2, 0xff8a2a, 0.9);
        g.lineBetween(x, y, x + rng.int(-10, 10), y + rng.int(-4, 4));
        break;
      case 'azure':
        circle(g, x, y, 2, 0xffffff, undefined, 0.9);
        break;
      case 'dune':
        g.lineStyle(2, lighten(pal.color, 0.15), 0.8);
        g.lineBetween(x, y, x + 12, y - 2);
        break;
      case 'neutral':
        circle(g, x, y, 2, pal.light, undefined, 0.6);
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Creatures
// ---------------------------------------------------------------------------

interface Head {
  x: number;
  y: number;
  r: number;
  facing: 1 | -1;
}

function paintEyes(g: G, head: Head, gn: CreatureGenome | HeroGenome, ink: number, skin: number): void {
  const count = gn.kind === 'creature' ? gn.eyes : 2;
  const er = Math.max(4, head.r * 0.22);
  const spread = head.r * 0.42;
  const xs = count === 1 ? [0] : count === 2 ? [-spread, spread] : [-spread, 0, spread];
  const ey = head.y - head.r * 0.1;
  for (const dx of xs) {
    const ex = head.x + dx + head.facing * head.r * 0.15;
    circle(g, ex, ey, er, 0xffffff, ink);
    circle(g, ex + head.facing * er * 0.3, ey + er * 0.1, er * 0.5, ink);
    circle(g, ex + head.facing * er * 0.1 - er * 0.2, ey - er * 0.3, er * 0.18, 0xffffff);
    if (gn.eyeStyle === 'sleepy') {
      g.fillStyle(skin, 1);
      g.fillRect(ex - er - 1, ey - er - 1, er * 2 + 2, er + 1);
      g.lineStyle(3, ink, 1);
      g.lineBetween(ex - er, ey, ex + er, ey);
    } else if (gn.eyeStyle === 'angry') {
      g.lineStyle(4, ink, 1);
      const inner = dx === 0 ? 0 : Math.sign(dx);
      g.lineBetween(
        ex - er * 1.1,
        ey - er * (1.3 + 0.4 * inner),
        ex + er * 1.1,
        ey - er * (1.3 - 0.4 * inner),
      );
    }
  }
}

function paintMouth(g: G, head: Head, mouth: CreatureGenome['mouth'], ink: number): void {
  const mx = head.x + head.facing * head.r * 0.15;
  const my = head.y + head.r * 0.45;
  const mw = head.r * 0.45;
  g.lineStyle(4, ink, 1);
  switch (mouth) {
    case 'smile':
      g.beginPath();
      g.arc(mx, my - mw * 0.4, mw, 0.25 * Math.PI, 0.75 * Math.PI);
      g.strokePath();
      break;
    case 'frown':
      g.beginPath();
      g.arc(mx, my + mw * 0.7, mw * 0.8, 1.2 * Math.PI, 1.8 * Math.PI);
      g.strokePath();
      break;
    case 'fangs':
      g.lineBetween(mx - mw, my, mx + mw, my);
      poly(
        g,
        [
          { x: mx - mw * 0.6, y: my },
          { x: mx - mw * 0.35, y: my + 8 },
          { x: mx - mw * 0.1, y: my },
        ],
        0xffffff,
        ink,
      );
      poly(
        g,
        [
          { x: mx + mw * 0.1, y: my },
          { x: mx + mw * 0.35, y: my + 8 },
          { x: mx + mw * 0.6, y: my },
        ],
        0xffffff,
        ink,
      );
      break;
    case 'beak':
      poly(
        g,
        [
          { x: head.x + head.facing * head.r * 0.7, y: head.y },
          { x: head.x + head.facing * head.r * 1.45, y: head.y + head.r * 0.2 },
          { x: head.x + head.facing * head.r * 0.7, y: head.y + head.r * 0.4 },
        ],
        0xffa928,
        ink,
      );
      break;
    case 'none':
      break;
  }
}

function paintHeadGear(g: G, head: Head, gn: CreatureGenome): void {
  const { x, y, r } = head;
  const ink = gn.outline;
  switch (gn.headGear) {
    case 'horns':
      for (const s of [-1, 1])
        poly(
          g,
          [
            { x: x + s * r * 0.35, y: y - r * 0.75 },
            { x: x + s * r * 0.95, y: y - r * 1.55 },
            { x: x + s * r * 0.75, y: y - r * 0.55 },
          ],
          0xf4ecd6,
          ink,
        );
      break;
    case 'ears':
      for (const s of [-1, 1])
        poly(
          g,
          [
            { x: x + s * r * 0.25, y: y - r * 0.8 },
            { x: x + s * r * 0.8, y: y - r * 1.4 },
            { x: x + s * r * 0.9, y: y - r * 0.45 },
          ],
          gn.bodyColor,
          ink,
        );
      break;
    case 'antennae':
      g.lineStyle(3, ink, 1);
      for (const s of [-1, 1]) {
        g.lineBetween(x + s * r * 0.3, y - r * 0.85, x + s * r * 0.7, y - r * 1.6);
        circle(g, x + s * r * 0.7, y - r * 1.6, 5, gn.accentColor, ink);
      }
      break;
    case 'spikes':
      for (let i = -2; i <= 2; i++) {
        const bx = x + i * r * 0.32;
        poly(
          g,
          [
            { x: bx - r * 0.14, y: y - r * 0.85 },
            { x: bx, y: y - r * 1.35 },
            { x: bx + r * 0.14, y: y - r * 0.85 },
          ],
          gn.accentColor,
          ink,
        );
      }
      break;
    case 'crown': {
      const cy = y - r * 0.95;
      const pts: Pt[] = [{ x: x - r * 0.6, y: cy + 8 }];
      for (let i = 0; i <= 4; i++) {
        pts.push({ x: x - r * 0.6 + (i * r * 1.2) / 4, y: i % 2 === 0 ? cy - r * 0.55 : cy - r * 0.2 });
      }
      pts.push({ x: x + r * 0.6, y: cy + 8 });
      poly(g, pts, 0xffcf3a, ink);
      circle(g, x, cy - r * 0.1, 4, 0xff4f6d);
      break;
    }
    case 'leaf':
      g.lineStyle(3, ink, 1);
      g.lineBetween(x, y - r * 0.9, x + r * 0.1, y - r * 1.3);
      ellipse(g, x + r * 0.35, y - r * 1.35, r * 0.6, r * 0.3, 0x6fcf4f, ink);
      break;
    case 'none':
      break;
  }
}

function paintPattern(g: G, cx: number, cy: number, w: number, h: number, gn: CreatureGenome): void {
  const rng = new Rng(gn.decorSeed);
  switch (gn.pattern) {
    case 'spots':
      for (let i = 0; i < 5; i++) {
        circle(
          g,
          cx + rng.int(Math.floor(-w * 0.3), Math.floor(w * 0.3)),
          cy + rng.int(Math.floor(-h * 0.25), Math.floor(h * 0.25)),
          rng.int(3, 7),
          darken(gn.bodyColor, 0.12),
          undefined,
          0.9,
        );
      }
      break;
    case 'stripes':
      g.lineStyle(4, darken(gn.bodyColor, 0.14), 0.9);
      for (let i = -1; i <= 1; i++)
        g.lineBetween(cx + i * w * 0.2, cy - h * 0.35, cx + i * w * 0.2 + 6, cy + h * 0.25);
      break;
    case 'belly':
      ellipse(g, cx, cy + h * 0.12, w * 0.55, h * 0.5, gn.bellyColor);
      break;
    case 'none':
      break;
  }
}

/** Paints a creature scene; `backdrop: false` paints just the creature (board figures). */
export function paintCreature(g: G, w: number, h: number, gn: CreatureGenome, backdrop = true): void {
  if (backdrop) paintBackdrop(g, w, h, gn.landscape, gn.decorSeed);
  const s = gn.size * (h / 170);
  const cx = w / 2;
  const ground = h * 0.9;
  const ink = gn.outline;
  const body = gn.bodyColor;

  if (gn.glow) {
    for (let i = 4; i > 0; i--)
      circle(g, cx, ground - 65 * s, 30 * s + i * 14 * s, lighten(gn.accentColor, 0.2), undefined, 0.1);
  }
  // Shadow
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(cx, ground, 150 * s, 18 * s);

  let head: Head;
  switch (gn.body) {
    case 'blob': {
      const bw = 130 * s;
      const bh = 100 * s;
      const by = ground - bh / 2;
      if (gn.tail) circle(g, cx - bw * 0.52, ground - 10 * s, 12 * s, body, ink);
      ellipse(g, cx, by, bw, bh, body, ink);
      paintPattern(g, cx, by, bw, bh, gn);
      head = { x: cx, y: by - bh * 0.05, r: bh * 0.42, facing: 1 };
      break;
    }
    case 'beast': {
      const bw = 130 * s;
      const bh = 70 * s;
      const by = ground - 30 * s - bh / 2;
      g.lineStyle(OUTLINE_W, ink, 1);
      for (const lx of [-0.32, -0.12, 0.14, 0.32])
        rrect(g, cx + lx * bw - 9 * s, by + bh * 0.2, 18 * s, 40 * s, 6 * s, darken(body, 0.08), ink);
      if (gn.tail) {
        g.lineStyle(10 * s, ink, 1);
        g.lineBetween(cx - bw * 0.45, by, cx - bw * 0.7, by - 30 * s);
        g.lineStyle(6 * s, body, 1);
        g.lineBetween(cx - bw * 0.45, by, cx - bw * 0.7, by - 30 * s);
      }
      ellipse(g, cx, by, bw, bh, body, ink);
      paintPattern(g, cx, by, bw, bh, gn);
      head = { x: cx + bw * 0.42, y: by - bh * 0.45, r: 34 * s, facing: 1 };
      circle(g, head.x, head.y, head.r, body, ink);
      break;
    }
    case 'bird': {
      const r = 50 * s;
      const by = ground - 22 * s - r;
      g.lineStyle(4, ink, 1);
      g.lineBetween(cx - 12 * s, by + r * 0.8, cx - 14 * s, ground);
      g.lineBetween(cx + 12 * s, by + r * 0.8, cx + 14 * s, ground);
      for (const sgn of [-1, 1]) {
        poly(
          g,
          [
            { x: cx + sgn * r * 0.6, y: by - r * 0.2 },
            { x: cx + sgn * r * 1.8, y: by - r * 0.9 },
            { x: cx + sgn * r * 1.5, y: by + r * 0.3 },
            { x: cx + sgn * r * 0.8, y: by + r * 0.4 },
          ],
          darken(body, 0.08),
          ink,
        );
      }
      circle(g, cx, by, r, body, ink);
      paintPattern(g, cx, by, r * 2, r * 2, gn);
      head = { x: cx, y: by - r * 0.1, r: r * 0.75, facing: 1 };
      break;
    }
    case 'biped': {
      const tw = 62 * s;
      const th = 78 * s;
      const ty = ground - 36 * s - th;
      rrect(g, cx - tw * 0.4, ground - 40 * s, 16 * s, 40 * s, 6 * s, darken(body, 0.15), ink);
      rrect(g, cx + tw * 0.4 - 16 * s, ground - 40 * s, 16 * s, 40 * s, 6 * s, darken(body, 0.15), ink);
      rrect(g, cx - tw / 2 - 16 * s, ty + 10 * s, 14 * s, 50 * s, 6 * s, body, ink);
      rrect(g, cx + tw / 2 + 2 * s, ty + 10 * s, 14 * s, 50 * s, 6 * s, body, ink);
      // Held item in accent color (staff / blade)
      g.lineStyle(6 * s, ink, 1);
      g.lineBetween(cx + tw / 2 + 10 * s, ty + 60 * s, cx + tw / 2 + 24 * s, ty - 20 * s);
      circle(g, cx + tw / 2 + 24 * s, ty - 22 * s, 8 * s, gn.accentColor, ink);
      rrect(g, cx - tw / 2, ty, tw, th, 18 * s, body, ink);
      paintPattern(g, cx, ty + th / 2, tw, th, gn);
      head = { x: cx, y: ty - 26 * s, r: 32 * s, facing: 1 };
      circle(g, head.x, head.y, head.r, lighten(body, 0.05), ink);
      break;
    }
    case 'serpent': {
      const segs = 7;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        const x = cx - 80 * s + t * 150 * s;
        const y = ground - 22 * s - Math.sin(t * Math.PI * 1.6) * 22 * s - t * 40 * s;
        circle(g, x, y, (16 + t * 12) * s, i % 2 === 0 ? body : darken(body, 0.06), ink);
      }
      head = { x: cx + 76 * s, y: ground - 96 * s, r: 34 * s, facing: 1 };
      circle(g, head.x, head.y, head.r, body, ink);
      break;
    }
    case 'golem': {
      const bw = 112 * s;
      const bh = 96 * s;
      const by = ground - bh - 18 * s;
      rrect(g, cx - bw * 0.35, ground - 30 * s, 26 * s, 30 * s, 4 * s, darken(body, 0.15), ink);
      rrect(g, cx + bw * 0.35 - 26 * s, ground - 30 * s, 26 * s, 30 * s, 4 * s, darken(body, 0.15), ink);
      rrect(g, cx - bw / 2 - 28 * s, by + 10 * s, 30 * s, 70 * s, 8 * s, darken(body, 0.05), ink);
      rrect(g, cx + bw / 2 - 2 * s, by + 10 * s, 30 * s, 70 * s, 8 * s, darken(body, 0.05), ink);
      rrect(g, cx - bw / 2, by, bw, bh, 12 * s, body, ink);
      // Cracks / runes
      g.lineStyle(3, lighten(gn.accentColor, 0.1), 0.9);
      g.lineBetween(cx - 20 * s, by + 30 * s, cx, by + 50 * s);
      g.lineBetween(cx, by + 50 * s, cx + 18 * s, by + 38 * s);
      head = { x: cx, y: by - 16 * s, r: 30 * s, facing: 1 };
      rrect(
        g,
        head.x - head.r,
        head.y - head.r * 0.8,
        head.r * 2,
        head.r * 1.6,
        8 * s,
        lighten(body, 0.05),
        ink,
      );
      break;
    }
  }

  if (gn.wings && gn.body !== 'bird') {
    // Keep wing tips inside the art window even when the head sits near an edge.
    const clampX = (x: number) => Math.max(8, Math.min(w - 8, x));
    for (const sgn of [-1, 1]) {
      poly(
        g,
        [
          { x: clampX(head.x + sgn * head.r * 0.8), y: head.y + head.r * 1.2 },
          { x: clampX(head.x + sgn * head.r * 2.4), y: head.y - head.r * 0.6 },
          { x: clampX(head.x + sgn * head.r * 1.6), y: head.y + head.r * 1.8 },
        ],
        mix(gn.accentColor, 0xffffff, 0.4),
        ink,
      );
    }
  }
  paintHeadGear(g, head, gn);
  paintEyes(g, head, gn, ink, gn.body === 'golem' ? lighten(body, 0.05) : body);
  paintMouth(g, head, gn.mouth, ink);
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

/** Draws a spell motif centered on (cx, cy) inside a box of `size`. Shared with icons. */
export function paintMotif(
  g: G,
  motif: SpellGenome['motif'],
  cx: number,
  cy: number,
  size: number,
  color: number,
  ink: number,
): void {
  const r = size / 2;
  const iconMap: Partial<Record<SpellGenome['motif'], LandscapeIcon>> = {
    flame: 'flame',
    heart: 'heart',
    snowflake: 'snowflake',
  };
  const icon = iconMap[motif];
  if (icon) {
    drawLandscapeIcon(g, icon, cx, cy, size, color, ink);
    return;
  }
  switch (motif) {
    case 'arrow':
      poly(
        g,
        [
          { x: cx, y: cy - r },
          { x: cx + r * 0.8, y: cy },
          { x: cx + r * 0.3, y: cy },
          { x: cx + r * 0.3, y: cy + r },
          { x: cx - r * 0.3, y: cy + r },
          { x: cx - r * 0.3, y: cy },
          { x: cx - r * 0.8, y: cy },
        ],
        color,
        ink,
      );
      break;
    case 'cards':
      for (let i = 0; i < 3; i++) {
        rrect(
          g,
          cx - r * 0.55 + i * r * 0.18,
          cy - r * 0.8 + i * r * 0.12,
          r * 0.9,
          r * 1.3,
          r * 0.12,
          i === 2 ? color : lighten(color, 0.2),
          ink,
        );
      }
      break;
    case 'skull':
      circle(g, cx, cy - r * 0.15, r * 0.75, color, ink);
      rrect(g, cx - r * 0.4, cy + r * 0.35, r * 0.8, r * 0.45, r * 0.1, color, ink);
      circle(g, cx - r * 0.28, cy - r * 0.15, r * 0.2, ink);
      circle(g, cx + r * 0.28, cy - r * 0.15, r * 0.2, ink);
      break;
    case 'sprout':
      g.lineStyle(Math.max(3, r * 0.14), ink, 1);
      g.lineBetween(cx, cy + r, cx, cy - r * 0.2);
      ellipse(g, cx - r * 0.35, cy - r * 0.3, r * 0.8, r * 0.4, color, ink);
      ellipse(g, cx + r * 0.35, cy - r * 0.55, r * 0.8, r * 0.4, color, ink);
      break;
    case 'swirl':
      g.lineStyle(Math.max(3, r * 0.18), color, 1);
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(cx, cy, r * (0.3 + i * 0.25), i * 1.2, i * 1.2 + Math.PI * 1.3);
        g.strokePath();
      }
      break;
    case 'shield':
      poly(
        g,
        [
          { x: cx - r * 0.75, y: cy - r * 0.8 },
          { x: cx + r * 0.75, y: cy - r * 0.8 },
          { x: cx + r * 0.7, y: cy + r * 0.1 },
          { x: cx, y: cy + r },
          { x: cx - r * 0.7, y: cy + r * 0.1 },
        ],
        color,
        ink,
      );
      break;
    case 'quake':
      g.lineStyle(Math.max(4, r * 0.2), color, 1);
      g.strokePoints(
        [
          { x: cx - r, y: cy },
          { x: cx - r * 0.4, y: cy - r * 0.5 },
          { x: cx, y: cy + r * 0.4 },
          { x: cx + r * 0.4, y: cy - r * 0.4 },
          { x: cx + r, y: cy + r * 0.2 },
        ],
        false,
      );
      break;
    case 'gem':
      poly(
        g,
        [
          { x: cx, y: cy - r },
          { x: cx + r * 0.75, y: cy - r * 0.2 },
          { x: cx, y: cy + r },
          { x: cx - r * 0.75, y: cy - r * 0.2 },
        ],
        color,
        ink,
      );
      g.lineStyle(2, ink, 0.6);
      g.lineBetween(cx - r * 0.75, cy - r * 0.2, cx + r * 0.75, cy - r * 0.2);
      break;
    case 'star':
    default: {
      const pts: Pt[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 5;
        const rr = i % 2 === 0 ? r : r * 0.45;
        pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
      }
      poly(g, pts, color, ink);
    }
  }
}

export function paintSpell(g: G, w: number, h: number, gn: SpellGenome): void {
  paintBackdrop(g, w, h, gn.landscape, gn.decorSeed, 0.22);
  const cx = w / 2;
  const cy = h * 0.5;
  const R = Math.min(w, h) * 0.46;
  for (let i = 0; i < gn.rays; i++) {
    const a = gn.rotation + (Math.PI * 2 * i) / gn.rays;
    const b = a + Math.PI / gn.rays / 1.6;
    poly(
      g,
      [
        { x: cx, y: cy },
        { x: cx + Math.cos(a) * R * 1.3, y: cy + Math.sin(a) * R * 1.3 },
        { x: cx + Math.cos(b) * R * 1.3, y: cy + Math.sin(b) * R * 1.3 },
      ],
      gn.glowColor,
      undefined,
      0.35,
    );
  }
  for (let i = 5; i > 0; i--) circle(g, cx, cy, R * 0.25 + i * R * 0.1, gn.glowColor, undefined, 0.12);
  circle(g, cx, cy, R * 0.62, gn.secondary, darken(gn.primary, 0.3));
  paintMotif(g, gn.motif, cx, cy, R * 0.9, gn.primary, darken(gn.primary, 0.35));
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export function paintBuilding(g: G, w: number, h: number, gn: BuildingGenome): void {
  paintBackdrop(g, w, h, gn.landscape, gn.decorSeed, 0.05);
  const cx = w / 2;
  const ground = h * 0.9;
  const ink = darken(gn.trimColor, 0.2);
  const s = h / 170;
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(cx, ground, 170 * s, 16 * s);

  const windowAt = (x: number, y: number) =>
    rrect(g, x - 7 * s, y - 9 * s, 14 * s, 18 * s, 6 * s, 0xffe98a, ink);
  const flagAt = (x: number, y: number) => {
    g.lineStyle(3, ink, 1);
    g.lineBetween(x, y, x, y - 34 * s);
    poly(
      g,
      [
        { x, y: y - 34 * s },
        { x: x + 26 * s, y: y - 27 * s },
        { x, y: y - 20 * s },
      ],
      gn.roofColor,
      ink,
    );
  };

  switch (gn.structure) {
    case 'tower': {
      const tw = 56 * s;
      const th = 100 * s;
      rrect(g, cx - tw / 2, ground - th, tw, th, 4 * s, gn.wallColor, ink);
      poly(
        g,
        [
          { x: cx - tw * 0.7, y: ground - th },
          { x: cx, y: ground - th - 50 * s },
          { x: cx + tw * 0.7, y: ground - th },
        ],
        gn.roofColor,
        ink,
      );
      for (let i = 0; i < gn.windows; i++) windowAt(cx, ground - th + 24 * s + i * 26 * s);
      if (gn.flag) flagAt(cx, ground - th - 48 * s);
      break;
    }
    case 'wall': {
      const ww = 190 * s;
      const wh = 60 * s;
      rrect(g, cx - ww / 2, ground - wh, ww, wh, 4 * s, gn.wallColor, ink);
      for (let i = 0; i < 6; i++)
        rrect(
          g,
          cx - ww / 2 + i * (ww / 6) + 4 * s,
          ground - wh - 16 * s,
          ww / 6 - 8 * s,
          18 * s,
          2 * s,
          gn.wallColor,
          ink,
        );
      g.lineStyle(2, ink, 0.5);
      for (let i = 1; i < 3; i++)
        g.lineBetween(cx - ww / 2, ground - (wh * i) / 3, cx + ww / 2, ground - (wh * i) / 3);
      break;
    }
    case 'castle': {
      for (const dx of [-60, 60]) {
        rrect(g, cx + dx * s - 22 * s, ground - 90 * s, 44 * s, 90 * s, 4 * s, gn.wallColor, ink);
        poly(
          g,
          [
            { x: cx + dx * s - 30 * s, y: ground - 90 * s },
            { x: cx + dx * s, y: ground - 130 * s },
            { x: cx + dx * s + 30 * s, y: ground - 90 * s },
          ],
          gn.roofColor,
          ink,
        );
      }
      rrect(g, cx - 42 * s, ground - 70 * s, 84 * s, 70 * s, 4 * s, gn.wallColor, ink);
      rrect(g, cx - 14 * s, ground - 36 * s, 28 * s, 36 * s, 12 * s, darken(gn.roofColor, 0.2), ink);
      if (gn.flag) flagAt(cx - 60 * s, ground - 128 * s);
      break;
    }
    case 'pit': {
      ellipse(g, cx, ground - 20 * s, 170 * s, 56 * s, gn.wallColor, ink);
      ellipse(g, cx, ground - 20 * s, 130 * s, 36 * s, darken(gn.roofColor, 0.35));
      for (let i = 0; i < 4; i++)
        circle(
          g,
          cx - 40 * s + i * 26 * s,
          ground - 28 * s - (i % 2) * 8 * s,
          6 * s,
          lighten(gn.roofColor, 0.2),
          undefined,
          0.9,
        );
      break;
    }
    case 'altar': {
      rrect(g, cx - 80 * s, ground - 24 * s, 160 * s, 24 * s, 4 * s, gn.wallColor, ink);
      rrect(g, cx - 56 * s, ground - 48 * s, 112 * s, 26 * s, 4 * s, gn.wallColor, ink);
      poly(
        g,
        [
          { x: cx - 40 * s, y: ground - 48 * s },
          { x: cx + 40 * s, y: ground - 48 * s },
          { x: cx + 26 * s, y: ground - 80 * s },
          { x: cx - 26 * s, y: ground - 80 * s },
        ],
        darken(gn.roofColor, 0.1),
        ink,
      );
      drawLandscapeIcon(g, 'flame', cx, ground - 108 * s, 60 * s, 0xffa32e, ink);
      break;
    }
    case 'banner': {
      g.lineStyle(6 * s, ink, 1);
      g.lineBetween(cx - 30 * s, ground, cx - 30 * s, ground - 150 * s);
      poly(
        g,
        [
          { x: cx - 30 * s, y: ground - 146 * s },
          { x: cx + 50 * s, y: ground - 146 * s },
          { x: cx + 50 * s, y: ground - 60 * s },
          { x: cx + 10 * s, y: ground - 76 * s },
          { x: cx - 30 * s, y: ground - 60 * s },
        ],
        gn.roofColor,
        ink,
      );
      circle(g, cx + 10 * s, ground - 112 * s, 16 * s, gn.wallColor, ink);
      break;
    }
    case 'windmill': {
      poly(
        g,
        [
          { x: cx - 34 * s, y: ground },
          { x: cx - 20 * s, y: ground - 100 * s },
          { x: cx + 20 * s, y: ground - 100 * s },
          { x: cx + 34 * s, y: ground },
        ],
        gn.wallColor,
        ink,
      );
      poly(
        g,
        [
          { x: cx - 26 * s, y: ground - 100 * s },
          { x: cx, y: ground - 126 * s },
          { x: cx + 26 * s, y: ground - 100 * s },
        ],
        gn.roofColor,
        ink,
      );
      const hub = { x: cx, y: ground - 100 * s };
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const px = Math.cos(a + Math.PI / 2) * 9 * s;
        const py = Math.sin(a + Math.PI / 2) * 9 * s;
        const ex = hub.x + Math.cos(a) * 70 * s;
        const ey = hub.y + Math.sin(a) * 70 * s;
        poly(
          g,
          [
            { x: hub.x, y: hub.y },
            { x: ex + px, y: ey + py },
            { x: ex - px, y: ey - py },
          ],
          lighten(gn.wallColor, 0.1),
          ink,
        );
      }
      circle(g, hub.x, hub.y, 8 * s, gn.roofColor, ink);
      windowAt(cx, ground - 50 * s);
      break;
    }
    case 'house': {
      rrect(g, cx - 60 * s, ground - 70 * s, 120 * s, 70 * s, 4 * s, gn.wallColor, ink);
      poly(
        g,
        [
          { x: cx - 74 * s, y: ground - 70 * s },
          { x: cx, y: ground - 120 * s },
          { x: cx + 74 * s, y: ground - 70 * s },
        ],
        gn.roofColor,
        ink,
      );
      rrect(g, cx + 30 * s, ground - 120 * s, 16 * s, 34 * s, 2 * s, darken(gn.wallColor, 0.2), ink);
      rrect(g, cx - 12 * s, ground - 40 * s, 24 * s, 40 * s, 10 * s, darken(gn.roofColor, 0.25), ink);
      for (let i = 0; i < gn.windows && i < 2; i++) windowAt(cx + (i === 0 ? -36 : 36) * s, ground - 40 * s);
      break;
    }
    case 'obelisk': {
      poly(
        g,
        [
          { x: cx - 26 * s, y: ground },
          { x: cx - 16 * s, y: ground - 130 * s },
          { x: cx + 16 * s, y: ground - 130 * s },
          { x: cx + 26 * s, y: ground },
        ],
        gn.wallColor,
        ink,
      );
      poly(
        g,
        [
          { x: cx - 16 * s, y: ground - 130 * s },
          { x: cx, y: ground - 152 * s },
          { x: cx + 16 * s, y: ground - 130 * s },
        ],
        0xffd24a,
        ink,
      );
      g.lineStyle(3, gn.roofColor, 1);
      for (let i = 0; i < 3; i++)
        g.lineBetween(cx - 8 * s, ground - 40 * s - i * 26 * s, cx + 8 * s, ground - 40 * s - i * 26 * s);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------

export function paintHero(g: G, size: number, gn: HeroGenome): void {
  const pal = PALETTE[gn.landscape];
  const c = size / 2;
  const ink = darken(pal.dark, 0.25);
  for (let i = 8; i > 0; i--) circle(g, c, c, (c * i) / 8, mix(pal.dark, pal.light, 1 - i / 8));
  const s = size / 200;
  // Shoulders
  ellipse(g, c, size * 0.98, 150 * s, 110 * s, gn.outfit, ink);
  poly(
    g,
    [
      { x: c - 22 * s, y: size * 0.78 },
      { x: c, y: size * 0.9 },
      { x: c + 22 * s, y: size * 0.78 },
    ],
    gn.trim,
    ink,
  );
  rrect(g, c - 13 * s, 112 * s, 26 * s, 34 * s, 6 * s, darken(gn.skin, 0.08), ink);
  // Hair back layer
  if (gn.hairStyle === 'long') rrect(g, c - 50 * s, 60 * s, 100 * s, 90 * s, 30 * s, gn.hair, ink);
  if (gn.hairStyle === 'bun') circle(g, c, 42 * s, 20 * s, gn.hair, ink);
  // Head
  const head: Head = { x: c, y: 92 * s, r: 44 * s, facing: 1 };
  circle(g, head.x, head.y, head.r, gn.skin, ink);
  // Hair front layer
  switch (gn.hairStyle) {
    case 'short':
    case 'long':
    case 'bun':
      g.fillStyle(gn.hair, 1);
      g.slice(head.x, head.y, head.r, Math.PI, 0, false);
      g.fillPath();
      g.lineStyle(OUTLINE_W, ink, 1);
      g.beginPath();
      g.arc(head.x, head.y, head.r, Math.PI, 0, false);
      g.strokePath();
      break;
    case 'wild':
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i * Math.PI) / 6;
        circle(
          g,
          head.x + Math.cos(a) * head.r * 0.9,
          head.y + Math.sin(a) * head.r * 0.9,
          14 * s,
          gn.hair,
          ink,
        );
      }
      break;
    case 'bald':
      break;
  }
  if (gn.beard) {
    g.fillStyle(gn.hair, 1);
    g.slice(head.x, head.y + 6 * s, head.r * 0.95, 0.1 * Math.PI, 0.9 * Math.PI, false);
    g.fillPath();
  }
  paintEyes(g, { ...head, facing: 1, x: head.x - 6 * s }, gn, ink, gn.skin);
  paintMouth(g, { ...head, x: head.x - 6 * s }, gn.beard ? 'none' : 'smile', ink);
  // Hats
  const top = head.y - head.r;
  switch (gn.hat) {
    case 'crown': {
      const pts: Pt[] = [{ x: c - 32 * s, y: top + 12 * s }];
      for (let i = 0; i <= 4; i++)
        pts.push({ x: c - 32 * s + i * 16 * s, y: top - (i % 2 === 0 ? 24 : 8) * s });
      pts.push({ x: c + 32 * s, y: top + 12 * s });
      poly(g, pts, 0xffcf3a, ink);
      break;
    }
    case 'hood':
      g.fillStyle(gn.outfit, 1);
      g.slice(head.x, head.y, head.r * 1.18, Math.PI * 0.95, Math.PI * 0.05, false);
      g.fillPath();
      g.lineStyle(OUTLINE_W, ink, 1);
      g.beginPath();
      g.arc(head.x, head.y, head.r * 1.18, Math.PI * 0.95, Math.PI * 0.05, false);
      g.strokePath();
      break;
    case 'wizard':
      poly(
        g,
        [
          { x: c - 50 * s, y: top + 16 * s },
          { x: c + 12 * s, y: top - 70 * s },
          { x: c + 50 * s, y: top + 16 * s },
        ],
        darken(gn.outfit, 0.1),
        ink,
      );
      circle(g, c + 12 * s, top - 70 * s, 7 * s, gn.trim, ink);
      break;
    case 'helm':
      g.fillStyle(0xb8c2cf, 1);
      g.slice(head.x, head.y, head.r * 1.05, Math.PI, 0, false);
      g.fillPath();
      g.lineStyle(OUTLINE_W, ink, 1);
      g.lineBetween(head.x - head.r * 1.05, head.y, head.x + head.r * 1.05, head.y);
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        circle(g, c + 28 * s + Math.cos(a) * 9 * s, top + 8 * s + Math.sin(a) * 9 * s, 7 * s, 0xff8ccf, ink);
      }
      circle(g, c + 28 * s, top + 8 * s, 6 * s, 0xfff06f);
      break;
    case 'none':
      break;
  }
  if (gn.landscape !== 'neutral') {
    drawLandscapeIcon(
      g,
      PALETTE[gn.landscape].icon as LandscapeIcon,
      size * 0.8,
      size * 0.82,
      size * 0.16,
      pal.light,
      ink,
    );
  }
}
