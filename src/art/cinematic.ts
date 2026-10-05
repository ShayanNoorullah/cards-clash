/**
 * Cinematic card art: moody landscape scenes and creatures drawn as dark
 * silhouettes with rim lighting and glowing eyes (the look of a modern
 * fantasy card game rather than a cartoon). Driven by the same genomes as
 * before, so every card keeps its identity. Pure drawing on a Graphics.
 */
import type Phaser from 'phaser';
import { Rng } from '../engine/rng';
import type { CardLandscape } from '../engine/types';
import { darken, lighten, mix } from './color';
import type { BuildingGenome, CreatureGenome, HeroGenome, SpellGenome } from './genome';
import { paintMotif } from './painters';

type G = Phaser.GameObjects.Graphics;
type Pt = { x: number; y: number };

type Terrain = 'peaks' | 'hills' | 'swamp' | 'dunes' | 'candy' | 'volcano' | 'ruins';

interface Theme {
  skyTop: number;
  skyMid: number;
  horizon: number;
  light: number;
  ground: number;
  mote: number;
  celestial: 'moon' | 'sun' | 'eclipse';
  terrain: Terrain;
}

export const THEMES: Record<CardLandscape, Theme> = {
  azure: {
    skyTop: 0x050b1f,
    skyMid: 0x123060,
    horizon: 0x4f8fc0,
    light: 0xd6ecff,
    ground: 0x07112a,
    mote: 0xe6f4ff,
    celestial: 'moon',
    terrain: 'peaks',
  },
  golden: {
    skyTop: 0x170c1f,
    skyMid: 0x5a2638,
    horizon: 0xe8913e,
    light: 0xffd27a,
    ground: 0x1b1006,
    mote: 0xffd98c,
    celestial: 'sun',
    terrain: 'hills',
  },
  murk: {
    skyTop: 0x06080a,
    skyMid: 0x1b2a22,
    horizon: 0x5a7a3e,
    light: 0xbdff8f,
    ground: 0x060a06,
    mote: 0xa6ff70,
    celestial: 'moon',
    terrain: 'swamp',
  },
  dune: {
    skyTop: 0x170812,
    skyMid: 0x6a2228,
    horizon: 0xf2913c,
    light: 0xffbf66,
    ground: 0x2a1106,
    mote: 0xffcf96,
    celestial: 'sun',
    terrain: 'dunes',
  },
  candy: {
    skyTop: 0x10061c,
    skyMid: 0x47194f,
    horizon: 0xdd6fae,
    light: 0xffc8ec,
    ground: 0x19081e,
    mote: 0xffdcf4,
    celestial: 'moon',
    terrain: 'candy',
  },
  ember: {
    skyTop: 0x070203,
    skyMid: 0x380909,
    horizon: 0xb03619,
    light: 0xff7a32,
    ground: 0x0c0403,
    mote: 0xffa448,
    celestial: 'eclipse',
    terrain: 'volcano',
  },
  neutral: {
    skyTop: 0x070910,
    skyMid: 0x1e2537,
    horizon: 0x6f7c9b,
    light: 0xe8edff,
    ground: 0x0a0c13,
    mote: 0xe2e8ff,
    celestial: 'moon',
    terrain: 'ruins',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bands(g: G, x: number, y: number, w: number, h: number, top: number, bottom: number, n = 24): void {
  for (let i = 0; i < n; i++) {
    g.fillStyle(mix(top, bottom, i / (n - 1)), 1);
    g.fillRect(x, y + (h * i) / n, w, h / n + 1);
  }
}

/** Soft radial glow made of stacked translucent circles. */
function glow(g: G, x: number, y: number, r: number, color: number, strength = 1): void {
  const steps = 14;
  for (let i = steps; i > 0; i--) {
    const t = i / steps;
    g.fillStyle(color, 0.035 * strength * (1.2 - t));
    g.fillCircle(x, y, r * t);
  }
}

function ridgePoints(rng: Rng, w: number, base: number, amp: number, step: number, rough: number): Pt[] {
  const pts: Pt[] = [];
  const phase = rng.next() * 10;
  for (let x = -step; x <= w + step; x += step) {
    const y =
      base -
      Math.sin(x / (w * 0.18) + phase) * amp * 0.5 -
      Math.sin(x / (w * 0.07) + phase * 2) * amp * 0.25 -
      (rng.next() - 0.5) * amp * rough;
    pts.push({ x, y });
  }
  return pts;
}

function fillRidge(g: G, pts: Pt[], bottom: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints([{ x: pts[0]!.x, y: bottom }, ...pts, { x: pts[pts.length - 1]!.x, y: bottom }], true);
}

/** Where the moon/sun sits for a given art seed (shared by backdrop and creature lighting). */
export function celestialPos(w: number, h: number, seed: number): Pt {
  const rng = new Rng(seed ^ 0x51ed);
  return { x: w * (0.22 + rng.next() * 0.56), y: h * (0.16 + rng.next() * 0.14) };
}

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

export function paintScene(g: G, w: number, h: number, landscape: CardLandscape, seed: number): void {
  const th = THEMES[landscape];
  const rng = new Rng(seed);
  const horizonY = h * 0.66;
  bands(g, 0, 0, w, horizonY * 0.6, th.skyTop, th.skyMid, 16);
  bands(g, 0, horizonY * 0.6, w, horizonY * 0.4 + 2, th.skyMid, th.horizon, 14);
  bands(g, 0, horizonY, w, h - horizonY, darken(th.horizon, 0.55), th.ground, 10);

  // Stars in the dark upper sky.
  for (let i = 0; i < 40; i++) {
    g.fillStyle(0xffffff, 0.15 + rng.next() * 0.5);
    g.fillCircle(rng.next() * w, rng.next() * horizonY * 0.5, rng.next() < 0.1 ? w * 0.006 : w * 0.0032);
  }

  // Moon / sun / eclipse, with its glow and a few light shafts.
  const c = celestialPos(w, h, seed);
  const r = w * (th.celestial === 'sun' ? 0.16 : 0.1);
  glow(g, c.x, c.y, r * 5, th.light, 1.4);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (rng.next() - 0.5) * 1.3;
    const len = h * 1.1;
    const spread = 0.05 + rng.next() * 0.05;
    g.fillStyle(th.light, 0.045);
    g.fillTriangle(
      c.x,
      c.y,
      c.x + Math.cos(a - spread) * len,
      c.y + Math.sin(a - spread) * len,
      c.x + Math.cos(a + spread) * len,
      c.y + Math.sin(a + spread) * len,
    );
  }
  if (th.celestial === 'eclipse') {
    g.fillStyle(th.light, 0.9);
    g.fillCircle(c.x, c.y, r * 1.08);
    g.fillStyle(0x050102, 1);
    g.fillCircle(c.x + r * 0.08, c.y, r);
  } else {
    g.fillStyle(mix(th.light, 0xffffff, 0.45), 1);
    g.fillCircle(c.x, c.y, r);
    if (th.celestial === 'moon') {
      g.fillStyle(darken(th.light, 0.25), 0.35);
      g.fillCircle(c.x - r * 0.3, c.y - r * 0.15, r * 0.22);
      g.fillCircle(c.x + r * 0.25, c.y + r * 0.3, r * 0.15);
    }
  }

  // Far range, fog, mid range, near ground.
  const far = mix(th.horizon, th.skyMid, 0.55);
  const mid = mix(th.ground, th.horizon, 0.3);
  paintTerrain(g, rng, w, h, th, horizonY, far, mid);

  // Drifting motes (snow, fireflies, spores, embers...).
  for (let i = 0; i < 26; i++) {
    const x = rng.next() * w;
    const y = rng.next() * h;
    const s = w * (0.004 + rng.next() * 0.006);
    g.fillStyle(th.mote, 0.12);
    g.fillCircle(x, y, s * 3);
    g.fillStyle(th.mote, 0.7);
    g.fillCircle(x, y, s);
  }

  // Vignette.
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    g.fillStyle(0x000000, 0.05);
    g.fillRect(0, 0, w * 0.1 * (1 - t), h);
    g.fillRect(w - w * 0.1 * (1 - t), 0, w * 0.1 * (1 - t), h);
    g.fillRect(0, h - h * 0.12 * (1 - t), w, h * 0.12 * (1 - t));
  }
}

function paintTerrain(
  g: G,
  rng: Rng,
  w: number,
  h: number,
  th: Theme,
  horizonY: number,
  far: number,
  mid: number,
): void {
  const fog = (y: number, alpha: number) => {
    for (let i = 0; i < 6; i++) {
      g.fillStyle(th.light, alpha);
      g.fillEllipse(
        rng.next() * w,
        y + (rng.next() - 0.5) * h * 0.04,
        w * (0.4 + rng.next() * 0.5),
        h * 0.06,
      );
    }
  };
  switch (th.terrain) {
    case 'peaks': {
      const pts: Pt[] = [];
      for (let x = -40; x <= w + 40; x += w / 7)
        pts.push(
          { x, y: horizonY - h * (0.08 + rng.next() * 0.2) },
          { x: x + w / 14, y: horizonY - h * 0.02 },
        );
      fillRidge(g, pts, h, far);
      // Snow caps catching the light.
      g.fillStyle(lighten(far, 0.35), 0.5);
      for (let i = 0; i < pts.length - 1; i += 2) {
        const p = pts[i]!;
        g.fillTriangle(p.x, p.y, p.x - w * 0.025, p.y + h * 0.045, p.x + w * 0.02, p.y + h * 0.04);
      }
      fog(horizonY, 0.05);
      fillRidge(g, ridgePoints(rng, w, horizonY + h * 0.08, h * 0.08, w / 18, 0.9), h, mid);
      break;
    }
    case 'hills': {
      fillRidge(g, ridgePoints(rng, w, horizonY, h * 0.06, w / 30, 0.1), h, far);
      fog(horizonY + h * 0.02, 0.06);
      const near = ridgePoints(rng, w, horizonY + h * 0.1, h * 0.05, w / 30, 0.1);
      fillRidge(g, near, h, mid);
      g.lineStyle(Math.max(1, w * 0.003), darken(mid, 0.3), 0.9);
      for (let i = 0; i < 60; i++) {
        const x = rng.next() * w;
        const y = horizonY + h * (0.12 + rng.next() * 0.2);
        g.lineBetween(x, y, x + (rng.next() - 0.5) * w * 0.02, y - h * (0.03 + rng.next() * 0.04));
      }
      break;
    }
    case 'swamp': {
      fillRidge(g, ridgePoints(rng, w, horizonY, h * 0.03, w / 20, 0.4), h, far);
      fog(horizonY, 0.07);
      for (let i = 0; i < 5; i++) {
        const x = rng.next() * w;
        const base = horizonY + h * 0.06;
        const th2 = w * 0.012;
        g.fillStyle(darken(mid, 0.2), 1);
        g.fillRect(x - th2 / 2, base - h * (0.25 + rng.next() * 0.15), th2, h * 0.4);
        g.lineStyle(th2 * 0.6, darken(mid, 0.2), 1);
        for (let b = 0; b < 3; b++) {
          const by = base - h * (0.12 + rng.next() * 0.2);
          const dir = rng.next() < 0.5 ? -1 : 1;
          g.lineBetween(x, by, x + dir * w * (0.04 + rng.next() * 0.05), by - h * 0.05);
        }
      }
      fillRidge(g, ridgePoints(rng, w, horizonY + h * 0.1, h * 0.02, w / 25, 0.3), h, mid);
      g.fillStyle(th.light, 0.08);
      g.fillEllipse(w * 0.5, horizonY + h * 0.2, w * 0.8, h * 0.05);
      break;
    }
    case 'dunes': {
      fillRidge(g, ridgePoints(rng, w, horizonY, h * 0.04, w / 30, 0.05), h, far);
      g.fillStyle(darken(far, 0.15), 1);
      const ox = w * (0.2 + rng.next() * 0.6);
      g.fillTriangle(ox, horizonY - h * 0.2, ox - w * 0.025, horizonY + 2, ox + w * 0.025, horizonY + 2);
      const px = w * (0.1 + rng.next() * 0.3);
      g.fillTriangle(px, horizonY - h * 0.1, px - w * 0.09, horizonY + 2, px + w * 0.09, horizonY + 2);
      fog(horizonY, 0.05);
      fillRidge(g, ridgePoints(rng, w, horizonY + h * 0.1, h * 0.08, w / 30, 0.02), h, mid);
      break;
    }
    case 'candy': {
      fillRidge(g, ridgePoints(rng, w, horizonY, h * 0.07, w / 30, 0.05), h, far);
      for (let i = 0; i < 3; i++) {
        const x = rng.next() * w;
        const top = horizonY - h * (0.1 + rng.next() * 0.1);
        g.fillStyle(darken(far, 0.2), 1);
        g.fillRect(x - w * 0.004, top, w * 0.008, horizonY - top + 4);
        g.fillCircle(x, top, w * 0.035);
        g.lineStyle(w * 0.004, lighten(far, 0.15), 0.5);
        g.strokeCircle(x, top, w * 0.02);
      }
      fog(horizonY, 0.07);
      fillRidge(g, ridgePoints(rng, w, horizonY + h * 0.1, h * 0.06, w / 30, 0.05), h, mid);
      break;
    }
    case 'volcano': {
      const vx = w * (0.3 + rng.next() * 0.4);
      const top = horizonY - h * 0.28;
      g.fillStyle(far, 1);
      g.fillPoints(
        [
          { x: vx - w * 0.55, y: horizonY + 4 },
          { x: vx - w * 0.07, y: top },
          { x: vx + w * 0.07, y: top },
          { x: vx + w * 0.55, y: horizonY + 4 },
        ],
        true,
      );
      glow(g, vx, top, w * 0.18, th.light, 1.6);
      g.lineStyle(Math.max(2, w * 0.006), th.light, 0.8);
      g.lineBetween(vx, top, vx - w * 0.06, horizonY - h * 0.05);
      g.lineBetween(vx + w * 0.02, top, vx + w * 0.1, horizonY - h * 0.08);
      fog(horizonY, 0.04);
      fillRidge(g, ridgePoints(rng, w, horizonY + h * 0.09, h * 0.06, w / 20, 0.8), h, mid);
      break;
    }
    case 'ruins': {
      fillRidge(g, ridgePoints(rng, w, horizonY, h * 0.05, w / 25, 0.3), h, far);
      g.fillStyle(darken(far, 0.2), 1);
      for (let i = 0; i < 4; i++) {
        const x = w * (0.1 + i * 0.25 + rng.next() * 0.08);
        const ph = h * (0.1 + rng.next() * 0.16);
        g.fillRect(x, horizonY - ph, w * 0.035, ph + 4);
        if (rng.next() < 0.5) g.fillRect(x - w * 0.01, horizonY - ph - h * 0.015, w * 0.055, h * 0.015);
      }
      fog(horizonY, 0.06);
      fillRidge(g, ridgePoints(rng, w, horizonY + h * 0.1, h * 0.04, w / 25, 0.4), h, mid);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Silhouette creatures
// ---------------------------------------------------------------------------

type Prim =
  | { k: 'e'; x: number; y: number; w: number; h: number }
  | { k: 'c'; x: number; y: number; r: number }
  | { k: 'p'; pts: Pt[] };

function drawPrims(g: G, prims: Prim[], color: number, alpha: number, dx: number, dy: number): void {
  g.fillStyle(color, alpha);
  for (const p of prims) {
    if (p.k === 'e') g.fillEllipse(p.x + dx, p.y + dy, p.w, p.h);
    else if (p.k === 'c') g.fillCircle(p.x + dx, p.y + dy, p.r);
    else
      g.fillPoints(
        p.pts.map((q) => ({ x: q.x + dx, y: q.y + dy })),
        true,
      );
  }
}

const tri = (a: Pt, b: Pt, c: Pt): Prim => ({ k: 'p', pts: [a, b, c] });
const quad = (a: Pt, b: Pt, c: Pt, d: Pt): Prim => ({ k: 'p', pts: [a, b, c, d] });

interface Body {
  prims: Prim[];
  /** Where the eyes go and how big the head is. */
  head: { x: number; y: number; r: number };
  /** Glowing rune marks (body centre and size). */
  core: { x: number; y: number; w: number; h: number };
}

function buildBody(gn: CreatureGenome, cx: number, ground: number, s: number, rng: Rng): Body {
  const P: Prim[] = [];
  let head = { x: cx, y: ground - 120 * s, r: 26 * s };
  let core = { x: cx, y: ground - 70 * s, w: 80 * s, h: 50 * s };
  const wings = () => {
    for (const dir of [-1, 1]) {
      const bx = cx + dir * 20 * s;
      const by = ground - 110 * s;
      P.push({
        k: 'p',
        pts: [
          { x: bx, y: by },
          { x: bx + dir * 70 * s, y: by - 70 * s },
          { x: bx + dir * 120 * s, y: by - 50 * s },
          { x: bx + dir * 100 * s, y: by - 20 * s },
          { x: bx + dir * 110 * s, y: by + 5 * s },
          { x: bx + dir * 80 * s, y: by + 5 * s },
          { x: bx + dir * 70 * s, y: by + 25 * s },
          { x: bx + dir * 30 * s, y: by + 20 * s },
        ],
      });
    }
  };
  switch (gn.body) {
    case 'beast': {
      if (gn.wings) wings();
      P.push({ k: 'e', x: cx - 8 * s, y: ground - 62 * s, w: 150 * s, h: 72 * s });
      for (const lx of [-55, -25, 25, 50]) {
        const x = cx + lx * s;
        P.push(
          quad(
            { x: x - 11 * s, y: ground - 70 * s },
            { x: x + 11 * s, y: ground - 70 * s },
            { x: x + 6 * s, y: ground },
            { x: x - 7 * s, y: ground },
          ),
        );
      }
      // Neck and head forward.
      P.push(
        quad(
          { x: cx + 40 * s, y: ground - 90 * s },
          { x: cx + 75 * s, y: ground - 118 * s },
          { x: cx + 92 * s, y: ground - 95 * s },
          { x: cx + 55 * s, y: ground - 50 * s },
        ),
      );
      head = { x: cx + 88 * s, y: ground - 112 * s, r: 25 * s };
      P.push({ k: 'e', x: head.x, y: head.y, w: 56 * s, h: 42 * s });
      P.push(
        tri(
          { x: head.x + 10 * s, y: head.y - 10 * s },
          { x: head.x + 48 * s, y: head.y + 8 * s },
          { x: head.x + 8 * s, y: head.y + 16 * s },
        ),
      );
      if (gn.tail)
        for (let i = 0; i < 6; i++)
          P.push({
            k: 'c',
            x: cx - 80 * s - i * 12 * s,
            y: ground - 75 * s - Math.sin(i * 0.7) * 22 * s,
            r: (9 - i) * s,
          });
      if (gn.headGear === 'spikes')
        for (let i = 0; i < 5; i++) {
          const x = cx - 50 * s + i * 22 * s;
          P.push(
            tri(
              { x: x - 9 * s, y: ground - 92 * s },
              { x: x + 2 * s, y: ground - 120 * s },
              { x: x + 10 * s, y: ground - 92 * s },
            ),
          );
        }
      core = { x: cx - 8 * s, y: ground - 62 * s, w: 100 * s, h: 40 * s };
      break;
    }
    case 'bird': {
      wings();
      P.push({ k: 'e', x: cx, y: ground - 82 * s, w: 70 * s, h: 82 * s });
      head = { x: cx + 6 * s, y: ground - 134 * s, r: 22 * s };
      P.push({ k: 'c', x: head.x, y: head.y, r: 24 * s });
      P.push(
        tri(
          { x: head.x + 18 * s, y: head.y - 6 * s },
          { x: head.x + 52 * s, y: head.y + 6 * s },
          { x: head.x + 18 * s, y: head.y + 10 * s },
        ),
      );
      P.push(
        tri(
          { x: cx - 20 * s, y: ground - 50 * s },
          { x: cx - 70 * s, y: ground - 10 * s },
          { x: cx - 5 * s, y: ground - 40 * s },
        ),
      );
      for (const lx of [-10, 12])
        P.push(
          quad(
            { x: cx + lx * s - 3 * s, y: ground - 46 * s },
            { x: cx + lx * s + 3 * s, y: ground - 46 * s },
            { x: cx + lx * s + 4 * s, y: ground },
            { x: cx + lx * s - 5 * s, y: ground },
          ),
        );
      core = { x: cx, y: ground - 82 * s, w: 46 * s, h: 56 * s };
      break;
    }
    case 'serpent': {
      const seg = 14;
      for (let i = 0; i < seg; i++) {
        const t = i / (seg - 1);
        const x = cx - 80 * s + t * 120 * s + Math.sin(t * 5) * 12 * s;
        const y = ground - 12 * s - Math.max(0, t - 0.45) * 220 * s - Math.sin(t * 6) * 8 * s;
        P.push({ k: 'c', x, y, r: (16 + t * 8) * s });
      }
      head = { x: cx + 46 * s, y: ground - 140 * s, r: 24 * s };
      if (gn.headGear === 'spikes' || gn.headGear === 'horns' || gn.headGear === 'ears')
        P.push({ k: 'e', x: head.x - 4 * s, y: head.y + 8 * s, w: 92 * s, h: 70 * s });
      P.push({ k: 'e', x: head.x + 8 * s, y: head.y, w: 58 * s, h: 38 * s });
      P.push(
        tri(
          { x: head.x + 22 * s, y: head.y + 8 * s },
          { x: head.x + 26 * s, y: head.y + 28 * s },
          { x: head.x + 30 * s, y: head.y + 8 * s },
        ),
      );
      core = { x: cx, y: ground - 40 * s, w: 60 * s, h: 30 * s };
      break;
    }
    case 'golem': {
      const rock = (x: number, y: number, r: number) => {
        const pts: Pt[] = [];
        for (let i = 0; i < 7; i++) {
          const a = (Math.PI * 2 * i) / 7;
          const rr = r * (0.8 + rng.next() * 0.35);
          pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.9 });
        }
        P.push({ k: 'p', pts });
      };
      for (const lx of [-28, 28])
        P.push(
          quad(
            { x: cx + lx * s - 18 * s, y: ground - 60 * s },
            { x: cx + lx * s + 18 * s, y: ground - 60 * s },
            { x: cx + lx * s + 22 * s, y: ground },
            { x: cx + lx * s - 22 * s, y: ground },
          ),
        );
      rock(cx, ground - 105 * s, 62 * s);
      rock(cx - 70 * s, ground - 130 * s, 30 * s);
      rock(cx + 70 * s, ground - 130 * s, 30 * s);
      P.push(
        quad(
          { x: cx - 92 * s, y: ground - 120 * s },
          { x: cx - 62 * s, y: ground - 120 * s },
          { x: cx - 70 * s, y: ground - 40 * s },
          { x: cx - 100 * s, y: ground - 45 * s },
        ),
      );
      P.push(
        quad(
          { x: cx + 62 * s, y: ground - 120 * s },
          { x: cx + 92 * s, y: ground - 120 * s },
          { x: cx + 100 * s, y: ground - 45 * s },
          { x: cx + 70 * s, y: ground - 40 * s },
        ),
      );
      rock(cx, ground - 178 * s, 30 * s);
      head = { x: cx, y: ground - 178 * s, r: 26 * s };
      core = { x: cx, y: ground - 105 * s, w: 70 * s, h: 60 * s };
      break;
    }
    case 'biped': {
      if (gn.wings) wings();
      for (const lx of [-16, 16])
        P.push(
          quad(
            { x: cx + lx * s - 10 * s, y: ground - 80 * s },
            { x: cx + lx * s + 10 * s, y: ground - 80 * s },
            { x: cx + lx * s + 8 * s, y: ground },
            { x: cx + lx * s - 9 * s, y: ground },
          ),
        );
      // Cloaked torso.
      P.push({
        k: 'p',
        pts: [
          { x: cx - 40 * s, y: ground - 150 * s },
          { x: cx + 40 * s, y: ground - 150 * s },
          { x: cx + 55 * s, y: ground - 40 * s },
          { x: cx + 20 * s, y: ground - 55 * s },
          { x: cx, y: ground - 35 * s },
          { x: cx - 20 * s, y: ground - 55 * s },
          { x: cx - 55 * s, y: ground - 40 * s },
        ],
      });
      P.push({ k: 'e', x: cx - 42 * s, y: ground - 146 * s, w: 34 * s, h: 24 * s });
      P.push({ k: 'e', x: cx + 42 * s, y: ground - 146 * s, w: 34 * s, h: 24 * s });
      // Arm holding a staff or blade.
      P.push(
        quad(
          { x: cx + 44 * s, y: ground - 145 * s },
          { x: cx + 56 * s, y: ground - 140 * s },
          { x: cx + 70 * s, y: ground - 92 * s },
          { x: cx + 60 * s, y: ground - 88 * s },
        ),
      );
      P.push(
        quad(
          { x: cx + 66 * s, y: ground - 200 * s },
          { x: cx + 72 * s, y: ground - 200 * s },
          { x: cx + 70 * s, y: ground },
          { x: cx + 64 * s, y: ground },
        ),
      );
      head = { x: cx, y: ground - 172 * s, r: 23 * s };
      P.push({ k: 'c', x: head.x, y: head.y, r: 24 * s });
      core = { x: cx, y: ground - 105 * s, w: 50 * s, h: 60 * s };
      break;
    }
    default: {
      // Blob → a looming wraith with dripping tendrils.
      const top = ground - 160 * s;
      P.push({ k: 'e', x: cx, y: top + 60 * s, w: 130 * s, h: 130 * s });
      const pts: Pt[] = [{ x: cx - 65 * s, y: top + 60 * s }];
      for (let i = 0; i <= 8; i++) {
        const x = cx - 65 * s + (130 * s * i) / 8;
        pts.push({ x, y: ground - (i % 2 === 0 ? 0 : 26 * s) - rng.next() * 10 * s });
      }
      pts.push({ x: cx + 65 * s, y: top + 60 * s });
      P.push({ k: 'p', pts });
      head = { x: cx, y: top + 45 * s, r: 34 * s };
      core = { x: cx, y: top + 95 * s, w: 70 * s, h: 50 * s };
    }
  }
  // Head gear.
  const h = head;
  switch (gn.headGear) {
    case 'horns':
      for (const d of [-1, 1])
        P.push(
          tri(
            { x: h.x + d * h.r * 0.4, y: h.y - h.r * 0.6 },
            { x: h.x + d * h.r * 1.5, y: h.y - h.r * 2.1 },
            { x: h.x + d * h.r * 0.9, y: h.y - h.r * 0.3 },
          ),
        );
      break;
    case 'ears':
      for (const d of [-1, 1])
        P.push(
          tri(
            { x: h.x + d * h.r * 0.2, y: h.y - h.r * 0.7 },
            { x: h.x + d * h.r * 0.9, y: h.y - h.r * 1.9 },
            { x: h.x + d * h.r * 0.95, y: h.y - h.r * 0.4 },
          ),
        );
      break;
    case 'spikes':
      if (gn.body !== 'beast')
        for (let i = -2; i <= 2; i++)
          P.push(
            tri(
              { x: h.x + i * h.r * 0.45 - h.r * 0.2, y: h.y - h.r * 0.7 },
              { x: h.x + i * h.r * 0.5, y: h.y - h.r * (1.7 - Math.abs(i) * 0.25) },
              { x: h.x + i * h.r * 0.45 + h.r * 0.2, y: h.y - h.r * 0.7 },
            ),
          );
      break;
    case 'antennae':
      for (const d of [-1, 1])
        P.push(
          quad(
            { x: h.x + d * h.r * 0.3, y: h.y - h.r * 0.8 },
            { x: h.x + d * h.r * 0.42, y: h.y - h.r * 0.8 },
            { x: h.x + d * h.r * 1.1, y: h.y - h.r * 2.2 },
            { x: h.x + d * h.r * 0.98, y: h.y - h.r * 2.2 },
          ),
        );
      break;
    case 'leaf':
      P.push({ k: 'e', x: h.x + h.r * 0.3, y: h.y - h.r * 1.2, w: h.r * 1.4, h: h.r * 0.6 });
      break;
    default:
      break;
  }
  return { prims: P, head, core };
}

/**
 * A creature as a rim-lit silhouette standing in its landscape scene. With
 * `backdrop: false` only the creature is drawn (board figures).
 */
export function paintCreatureCinematic(
  g: G,
  w: number,
  h: number,
  gn: CreatureGenome,
  backdrop = true,
): void {
  const th = THEMES[gn.landscape];
  if (backdrop) paintScene(g, w, h, gn.landscape, gn.decorSeed);
  const rng = new Rng(gn.decorSeed ^ 0x2a);
  const s = gn.size * (h / 200);
  const cx = w / 2;
  const ground = h * 0.92;
  const body = buildBody(gn, cx, ground, s, rng);
  const light = backdrop ? celestialPos(w, h, gn.decorSeed) : { x: 0, y: 0 };
  const dir = light.x < cx ? -1 : 1;
  const rim = mix(th.light, 0xffffff, 0.55);
  const eye = gn.glow ? 0xffe28a : mix(lighten(gn.accentColor, 0.3), th.light, 0.45);
  const dark = darken(mix(th.ground, gn.bodyColor, 0.16), 0.15);

  // Aura behind (stronger for Epic/Legendary), ground shadow and mist.
  glow(g, body.core.x, body.core.y - 20 * s, 150 * s, gn.glow ? 0xffd27a : th.light, gn.glow ? 1.6 : 0.6);
  g.fillStyle(0x000000, 0.45);
  g.fillEllipse(cx, ground + 2, 210 * s, 26 * s);

  // Rim light: a bright copy toward the light, a mid-tone band, then the dark body
  // shifted away from the light, leaving a lit edge with some volume.
  const off = Math.max(2, 4.2 * s);
  drawPrims(g, body.prims, rim, 0.25, dir * off * 1.8, -off * 1.8);
  drawPrims(g, body.prims, rim, 1, dir * off, -off);
  drawPrims(g, body.prims, mix(dark, rim, 0.3), 1, dir * off * 0.35, -off * 0.35);
  drawPrims(g, body.prims, dark, 1, -dir * off * 0.45, off * 0.45);

  // Glowing rune markings.
  if (gn.pattern !== 'none' || gn.glow) {
    g.lineStyle(Math.max(1.5, 2.6 * s), eye, 0.55);
    const c = body.core;
    for (let i = 0; i < 3; i++) {
      const y = c.y - c.h * 0.3 + i * c.h * 0.3;
      g.lineBetween(c.x - c.w * 0.25, y, c.x + c.w * 0.25 * (i === 1 ? 0.4 : 1), y - c.h * 0.08);
    }
    glow(g, c.x, c.y, c.w * 0.5, eye, 0.5);
  }

  // Crown: a metallic band that catches the light.
  if (gn.headGear === 'crown') {
    const hd = body.head;
    const pts: Pt[] = [
      { x: hd.x - hd.r, y: hd.y - hd.r * 0.7 },
      { x: hd.x - hd.r, y: hd.y - hd.r * 1.6 },
      { x: hd.x - hd.r * 0.5, y: hd.y - hd.r * 1.1 },
      { x: hd.x, y: hd.y - hd.r * 1.9 },
      { x: hd.x + hd.r * 0.5, y: hd.y - hd.r * 1.1 },
      { x: hd.x + hd.r, y: hd.y - hd.r * 1.6 },
      { x: hd.x + hd.r, y: hd.y - hd.r * 0.7 },
    ];
    g.fillStyle(0x6b4a12, 1);
    g.fillPoints(pts, true);
    g.fillStyle(0xf2c66a, 1);
    g.fillPoints(
      pts.map((p) => ({ x: p.x + dir * 1.5, y: p.y - 1.5 })),
      true,
    );
    glow(g, hd.x, hd.y - hd.r * 1.9, hd.r * 0.8, 0xffe6a0, 1.4);
  }

  // Eyes.
  const hd = body.head;
  const n = gn.eyes;
  for (let i = 0; i < n; i++) {
    const ex =
      hd.x +
      (n === 1 ? 0 : (i - (n - 1) / 2) * hd.r * 0.62) +
      (gn.body === 'beast' || gn.body === 'serpent' ? hd.r * 0.2 : 0);
    const ey = hd.y - hd.r * 0.05;
    glow(g, ex, ey, hd.r * 0.9, eye, 1.3);
    g.fillStyle(lighten(eye, 0.35), 1);
    if (gn.eyeStyle === 'angry')
      g.fillTriangle(
        ex - hd.r * 0.24,
        ey - hd.r * 0.1,
        ex + hd.r * 0.24,
        ey - hd.r * 0.02,
        ex - hd.r * 0.2,
        ey + hd.r * 0.12,
      );
    else if (gn.eyeStyle === 'sleepy') g.fillEllipse(ex, ey, hd.r * 0.42, hd.r * 0.1);
    else g.fillEllipse(ex, ey, hd.r * 0.3, hd.r * 0.2);
  }

  // Low mist in front of the feet.
  if (backdrop)
    for (let i = 0; i < 5; i++) {
      g.fillStyle(th.light, 0.05);
      g.fillEllipse(rng.next() * w, ground + (rng.next() - 0.3) * h * 0.05, w * 0.5, h * 0.05);
    }
}

// ---------------------------------------------------------------------------
// Spells and buildings
// ---------------------------------------------------------------------------

export function paintSpellCinematic(g: G, w: number, h: number, gn: SpellGenome): void {
  const th = THEMES[gn.landscape];
  paintScene(g, w, h, gn.landscape, gn.decorSeed);
  const cx = w / 2;
  const cy = h * 0.5;
  const r = Math.min(w, h) * 0.36;
  const col = mix(gn.glowColor, th.light, 0.4);
  g.fillStyle(0x000000, 0.35);
  g.fillRect(0, 0, w, h);
  glow(g, cx, cy, r * 2.4, col, 2);
  // Rune circle.
  g.lineStyle(Math.max(1.5, r * 0.025), col, 0.8);
  g.strokeCircle(cx, cy, r);
  g.lineStyle(Math.max(1, r * 0.012), col, 0.55);
  g.strokeCircle(cx, cy, r * 0.84);
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24 + gn.rotation;
    const r1 = r * 0.86;
    const r2 = r * (i % 3 === 0 ? 0.98 : 0.93);
    g.lineBetween(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
  }
  for (let i = 0; i < gn.rays; i++) {
    const a = (Math.PI * 2 * i) / gn.rays + gn.rotation;
    g.fillStyle(col, 0.12);
    g.fillTriangle(
      cx,
      cy,
      cx + Math.cos(a - 0.08) * r * 2.2,
      cy + Math.sin(a - 0.08) * r * 2.2,
      cx + Math.cos(a + 0.08) * r * 2.2,
      cy + Math.sin(a + 0.08) * r * 2.2,
    );
  }
  glow(g, cx, cy, r * 0.9, 0xffffff, 1.2);
  paintMotif(g, gn.motif, cx, cy, r * 1.1, lighten(col, 0.35), darken(gn.primary, 0.6));
}

export function paintBuildingCinematic(g: G, w: number, h: number, gn: BuildingGenome): void {
  const th = THEMES[gn.landscape];
  paintScene(g, w, h, gn.landscape, gn.decorSeed);
  const rng = new Rng(gn.decorSeed ^ 0x77);
  const cx = w / 2;
  const ground = h * 0.92;
  const dark = mix(th.ground, gn.wallColor, 0.18);
  const rim = mix(th.light, 0xffffff, 0.3);
  const win = 0xffcf6a;
  const P: Prim[] = [];
  const windows: Pt[] = [];
  const u = h / 170;
  switch (gn.structure) {
    case 'tower':
    case 'obelisk': {
      const tw = (gn.structure === 'obelisk' ? 36 : 54) * u;
      const th2 = 130 * u;
      P.push(
        quad(
          { x: cx - tw / 2, y: ground - th2 },
          { x: cx + tw / 2, y: ground - th2 },
          { x: cx + tw * 0.62, y: ground },
          { x: cx - tw * 0.62, y: ground },
        ),
      );
      P.push(
        tri(
          { x: cx - tw * 0.65, y: ground - th2 },
          { x: cx, y: ground - th2 - 40 * u },
          { x: cx + tw * 0.65, y: ground - th2 },
        ),
      );
      for (let i = 0; i < Math.max(1, gn.windows); i++)
        windows.push({ x: cx, y: ground - th2 * (0.25 + i * 0.22) });
      break;
    }
    case 'castle':
    case 'wall': {
      const cw = 150 * u;
      const ch = (gn.structure === 'wall' ? 50 : 70) * u;
      P.push({
        k: 'p',
        pts: [
          { x: cx - cw / 2, y: ground - ch },
          { x: cx + cw / 2, y: ground - ch },
          { x: cx + cw / 2, y: ground },
          { x: cx - cw / 2, y: ground },
        ],
      });
      for (let i = 0; i < 7; i++) {
        const x = cx - cw / 2 + (i * cw) / 6.5;
        P.push({
          k: 'p',
          pts: [
            { x, y: ground - ch - 12 * u },
            { x: x + 12 * u, y: ground - ch - 12 * u },
            { x: x + 12 * u, y: ground - ch },
            { x, y: ground - ch },
          ],
        });
      }
      if (gn.structure === 'castle')
        for (const dx of [-1, 1]) {
          const x = cx + dx * cw * 0.42;
          P.push({
            k: 'p',
            pts: [
              { x: x - 18 * u, y: ground - 120 * u },
              { x: x + 18 * u, y: ground - 120 * u },
              { x: x + 18 * u, y: ground },
              { x: x - 18 * u, y: ground },
            ],
          });
          P.push(
            tri(
              { x: x - 24 * u, y: ground - 120 * u },
              { x, y: ground - 158 * u },
              { x: x + 24 * u, y: ground - 120 * u },
            ),
          );
          windows.push({ x, y: ground - 95 * u });
        }
      for (let i = 0; i < gn.windows; i++)
        windows.push({ x: cx - cw * 0.3 + i * cw * 0.2, y: ground - ch * 0.5 });
      break;
    }
    case 'pit':
    case 'altar': {
      P.push({ k: 'e', x: cx, y: ground - 10 * u, w: 160 * u, h: 36 * u });
      P.push({
        k: 'p',
        pts: [
          { x: cx - 50 * u, y: ground - 50 * u },
          { x: cx + 50 * u, y: ground - 50 * u },
          { x: cx + 62 * u, y: ground - 10 * u },
          { x: cx - 62 * u, y: ground - 10 * u },
        ],
      });
      glow(g, cx, ground - 60 * u, 90 * u, gn.structure === 'pit' ? 0x9dff6a : th.light, 2.2);
      break;
    }
    default: {
      // House, windmill, banner: a peaked hall with a tall mast.
      P.push({
        k: 'p',
        pts: [
          { x: cx - 55 * u, y: ground - 60 * u },
          { x: cx + 55 * u, y: ground - 60 * u },
          { x: cx + 55 * u, y: ground },
          { x: cx - 55 * u, y: ground },
        ],
      });
      P.push(
        tri(
          { x: cx - 66 * u, y: ground - 58 * u },
          { x: cx, y: ground - 110 * u },
          { x: cx + 66 * u, y: ground - 58 * u },
        ),
      );
      P.push({
        k: 'p',
        pts: [
          { x: cx + 40 * u, y: ground - 160 * u },
          { x: cx + 45 * u, y: ground - 160 * u },
          { x: cx + 45 * u, y: ground - 60 * u },
          { x: cx + 40 * u, y: ground - 60 * u },
        ],
      });
      if (gn.structure === 'windmill')
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i + 0.4;
          const hx = cx + 42 * u;
          const hy = ground - 160 * u;
          P.push(
            quad(
              { x: hx, y: hy },
              { x: hx + Math.cos(a) * 70 * u, y: hy + Math.sin(a) * 70 * u },
              { x: hx + Math.cos(a + 0.25) * 68 * u, y: hy + Math.sin(a + 0.25) * 68 * u },
              { x: hx, y: hy },
            ),
          );
        }
      else
        P.push(
          tri(
            { x: cx + 45 * u, y: ground - 160 * u },
            { x: cx + 95 * u, y: ground - 145 * u },
            { x: cx + 45 * u, y: ground - 130 * u },
          ),
        );
      for (let i = 0; i < Math.max(1, gn.windows); i++)
        windows.push({ x: cx - 30 * u + i * 30 * u, y: ground - 32 * u });
    }
  }
  glow(g, cx, ground - 60 * u, 140 * u, th.light, 0.6);
  drawPrims(g, P, rim, 0.9, -2 * u, -2 * u);
  drawPrims(g, P, dark, 1, 0, 0);
  for (const p of windows) {
    glow(g, p.x, p.y, 22 * u, win, 1.4);
    g.fillStyle(win, 1);
    g.fillRect(p.x - 4 * u, p.y - 6 * u, 8 * u, 12 * u);
  }
  // Torches by the door.
  for (const dx of [-1, 1]) {
    const x = cx + dx * 70 * u;
    g.fillStyle(dark, 1);
    g.fillRect(x - 2 * u, ground - 30 * u, 4 * u, 30 * u);
    glow(g, x, ground - 34 * u, 26 * u, 0xffa040, 1.6);
    g.fillStyle(0xffd27a, 1);
    g.fillCircle(x, ground - 34 * u, 4 * u);
  }
  void rng;
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------

/** A shadowed champion bust: rim light, glowing eyes, hood/crown/helm. */
export function paintHeroCinematic(g: G, size: number, gn: HeroGenome): void {
  const th = THEMES[gn.landscape];
  const S = size;
  bands(g, 0, 0, S, S, th.skyMid, th.ground, 20);
  glow(g, S * 0.5, S * 0.42, S * 0.75, th.light, 1.6);
  const rng = new Rng(gn.decorSeed);
  for (let i = 0; i < 14; i++) {
    g.fillStyle(th.mote, 0.5);
    g.fillCircle(rng.next() * S, rng.next() * S, S * 0.006);
  }
  const rim = mix(th.light, 0xffffff, 0.35);
  const cloth = mix(0x07080e, gn.outfit, 0.3);
  const face = mix(gn.skin, 0x000000, 0.62);
  const lit = mix(gn.skin, th.light, 0.25);
  const cx = S * 0.5;
  const headY = S * 0.43;
  const hr = S * 0.15;
  const off = S * 0.012;

  const shoulders: Prim[] = [
    {
      k: 'p',
      pts: [
        { x: cx - S * 0.42, y: S },
        { x: cx - S * 0.36, y: S * 0.72 },
        { x: cx - S * 0.12, y: S * 0.6 },
        { x: cx + S * 0.12, y: S * 0.6 },
        { x: cx + S * 0.36, y: S * 0.72 },
        { x: cx + S * 0.42, y: S },
      ],
    },
    { k: 'e', x: cx - S * 0.33, y: S * 0.72, w: S * 0.24, h: S * 0.13 },
    { k: 'e', x: cx + S * 0.33, y: S * 0.72, w: S * 0.24, h: S * 0.13 },
  ];
  drawPrims(g, shoulders, rim, 0.9, -off, -off);
  drawPrims(g, shoulders, cloth, 1, 0, 0);
  // Trim across the collar.
  g.lineStyle(S * 0.012, mix(gn.trim, 0xe6c27a, 0.5), 0.9);
  g.lineBetween(cx - S * 0.13, S * 0.61, cx, S * 0.72);
  g.lineBetween(cx + S * 0.13, S * 0.61, cx, S * 0.72);
  g.fillStyle(mix(gn.trim, 0xe6c27a, 0.5), 1);
  g.fillCircle(cx, S * 0.73, S * 0.025);

  // Neck and head (face mostly in shadow, lit along one side).
  g.fillStyle(face, 1);
  g.fillRect(cx - S * 0.05, headY + hr * 0.7, S * 0.1, S * 0.12);
  g.fillStyle(rim, 0.9);
  g.fillEllipse(cx - off, headY - off, hr * 1.7, hr * 2.1);
  g.fillStyle(face, 1);
  g.fillEllipse(cx, headY, hr * 1.7, hr * 2.1);
  g.fillStyle(lit, 0.35);
  g.fillEllipse(cx - hr * 0.35, headY - hr * 0.1, hr * 0.7, hr * 1.6);

  const dark = darken(cloth, 0.2);
  switch (gn.hat) {
    case 'hood':
    case 'wizard': {
      const tip = gn.hat === 'wizard' ? S * 0.02 : headY - hr * 1.4;
      const hood: Prim[] = [
        {
          k: 'p',
          pts: [
            { x: cx - hr * 1.35, y: headY + hr * 1.3 },
            { x: cx - hr * 1.2, y: headY - hr * 0.6 },
            { x: cx, y: tip },
            { x: cx + hr * 1.2, y: headY - hr * 0.6 },
            { x: cx + hr * 1.35, y: headY + hr * 1.3 },
            { x: cx + hr * 0.75, y: headY + hr * 0.4 },
            { x: cx + hr * 0.7, y: headY - hr * 0.45 },
            { x: cx - hr * 0.7, y: headY - hr * 0.45 },
            { x: cx - hr * 0.75, y: headY + hr * 0.4 },
          ],
        },
      ];
      drawPrims(g, hood, rim, 0.9, -off, -off);
      drawPrims(g, hood, dark, 1, 0, 0);
      break;
    }
    case 'helm': {
      const helm: Prim[] = [
        {
          k: 'p',
          pts: [
            { x: cx - hr * 1.0, y: headY + hr * 0.9 },
            { x: cx - hr * 1.05, y: headY - hr * 0.6 },
            { x: cx, y: headY - hr * 1.35 },
            { x: cx + hr * 1.05, y: headY - hr * 0.6 },
            { x: cx + hr * 1.0, y: headY + hr * 0.9 },
          ],
        },
      ];
      drawPrims(g, helm, rim, 1, -off, -off);
      drawPrims(g, helm, mix(0x2a2f3c, gn.outfit, 0.15), 1, 0, 0);
      g.fillStyle(0x000000, 1);
      g.fillRect(cx - hr * 0.8, headY - hr * 0.15, hr * 1.6, hr * 0.28);
      break;
    }
    default: {
      // Hair silhouette.
      if (gn.hairStyle !== 'bald') {
        const hair = mix(gn.hair, 0x000000, 0.55);
        g.fillStyle(rim, 0.8);
        g.fillEllipse(cx - off, headY - hr * 0.55 - off, hr * 1.9, hr * 1.2);
        g.fillStyle(hair, 1);
        g.fillEllipse(cx, headY - hr * 0.55, hr * 1.9, hr * 1.2);
        if (gn.hairStyle === 'long') {
          g.fillRect(cx - hr * 0.95, headY - hr * 0.4, hr * 0.35, hr * 2.2);
          g.fillRect(cx + hr * 0.6, headY - hr * 0.4, hr * 0.35, hr * 2.2);
        } else if (gn.hairStyle === 'bun') g.fillCircle(cx, headY - hr * 1.25, hr * 0.42);
        else if (gn.hairStyle === 'wild')
          for (let i = -2; i <= 2; i++)
            g.fillTriangle(
              cx + i * hr * 0.4 - hr * 0.2,
              headY - hr,
              cx + i * hr * 0.5,
              headY - hr * 1.6,
              cx + i * hr * 0.4 + hr * 0.2,
              headY - hr,
            );
      }
    }
  }
  if (gn.beard) {
    g.fillStyle(mix(gn.hair, 0x000000, 0.5), 1);
    g.fillTriangle(cx - hr * 0.75, headY + hr * 0.3, cx + hr * 0.75, headY + hr * 0.3, cx, headY + hr * 1.6);
  }
  if (gn.hat === 'crown' || gn.hat === 'flower') {
    const y = headY - hr * 0.95;
    const pts: Pt[] = [
      { x: cx - hr * 0.9, y: y + hr * 0.25 },
      { x: cx - hr * 0.9, y: y - hr * 0.35 },
      { x: cx - hr * 0.45, y: y - hr * 0.05 },
      { x: cx, y: y - hr * 0.6 },
      { x: cx + hr * 0.45, y: y - hr * 0.05 },
      { x: cx + hr * 0.9, y: y - hr * 0.35 },
      { x: cx + hr * 0.9, y: y + hr * 0.25 },
    ];
    g.fillStyle(gn.hat === 'flower' ? 0x2f6a3a : 0x7a5414, 1);
    g.fillPoints(pts, true);
    g.fillStyle(gn.hat === 'flower' ? 0xff9ad6 : 0xf2c66a, 1);
    g.fillPoints(
      pts.map((p) => ({ x: p.x - off * 0.6, y: p.y - off * 0.6 })),
      true,
    );
    glow(g, cx, y - hr * 0.6, hr * 0.6, 0xffe6a0, 1.2);
  }
  // Glowing eyes.
  const eye = mix(th.light, 0xffffff, 0.3);
  for (const d of [-1, 1]) {
    const ex = cx + d * hr * 0.36;
    const ey = headY + hr * (gn.hat === 'helm' ? -0.02 : 0.02);
    glow(g, ex, ey, hr * 0.5, th.light, 1.4);
    g.fillStyle(eye, 1);
    if (gn.eyeStyle === 'angry')
      g.fillTriangle(ex - hr * 0.16, ey - hr * 0.07, ex + hr * 0.16, ey, ex - hr * 0.12, ey + hr * 0.06);
    else g.fillEllipse(ex, ey, hr * 0.24, hr * (gn.eyeStyle === 'sleepy' ? 0.06 : 0.12));
  }
  // Soft bottom fade so the bust sits in the frame.
  for (let i = 0; i < 8; i++) {
    g.fillStyle(0x000000, 0.06);
    g.fillRect(0, S - S * 0.12 * (1 - i / 8), S, S * 0.12 * (1 - i / 8));
  }
}
