import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/display';
import { Rng } from '../engine/rng';
import { COLORS } from '../ui/theme';
import { addAtmosphere, atmosphereTasks, type AtmosphereOptions } from './atmosphere';
import { bake, cardPartTasks } from './frames';
import { drawLandscapeIcon } from './landscapeIcons';
import { LANDSCAPE_VISUALS, type LandscapeVisual } from './landscapes';

/**
 * Procedural placeholder textures. Each task bakes Graphics into a named texture
 * once during Preload, so later scenes just use cheap Images/Sprites.
 * Any key listed in src/data/asset-manifest.json is loaded from a file instead
 * and its procedural task is skipped.
 */
export interface TextureTask {
  key: string;
  build: (scene: Phaser.Scene) => void;
}

export const TEXTURE_KEYS = {
  background: 'bg-gradient',
  particle: 'fx-particle',
  star: 'fx-star',
  cardBack: 'card-back-classic',
  hills: 'title-hills',
  landscapeIcon: (id: string) => `ls-icon-${id}`,
} as const;

function lerpColor(a: number, b: number, t: number): number {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(a),
    Phaser.Display.Color.ValueToColor(b),
    100,
    Math.round(t * 100),
  );
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

function buildBackground(scene: Phaser.Scene): void {
  // A thin vertical strip stretched to full width at runtime keeps memory tiny.
  const h = 256;
  bake(scene, TEXTURE_KEYS.background, 4, h, (g) => {
    for (let y = 0; y < h; y++) {
      g.fillStyle(lerpColor(COLORS.bgTop, COLORS.bgBottom, y / (h - 1)), 1);
      g.fillRect(0, y, 4, 1);
    }
  });
}

function buildParticle(scene: Phaser.Scene): void {
  bake(scene, TEXTURE_KEYS.particle, 32, 32, (g) => {
    for (let r = 16; r > 0; r -= 2) {
      g.fillStyle(0xffffff, (1 - r / 16) * 0.6 + 0.1);
      g.fillCircle(16, 16, r);
    }
  });
}

function buildStar(scene: Phaser.Scene): void {
  bake(scene, TEXTURE_KEYS.star, 48, 48, (g) => {
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 5;
      const r = i % 2 === 0 ? 22 : 9;
      pts.push({ x: 24 + Math.cos(a) * r, y: 24 + Math.sin(a) * r });
    }
    g.fillStyle(0xffffff, 1);
    g.fillPoints(pts, true);
  });
}

function buildLandscapeIcon(scene: Phaser.Scene, ls: LandscapeVisual): void {
  const size = 128;
  bake(scene, TEXTURE_KEYS.landscapeIcon(ls.id), size, size, (g) => {
    g.fillStyle(COLORS.outline, 1);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.fillStyle(ls.dark, 1);
    g.fillCircle(size / 2, size / 2, size / 2 - 6);
    drawLandscapeIcon(g, ls.icon, size / 2, size / 2, size * 0.62, ls.light);
  });
}

function buildHills(scene: Phaser.Scene): void {
  // Rolling hills, one band per landscape, seeded so they look the same every launch.
  const w = GAME_WIDTH;
  const h = 760;
  const rng = new Rng('title-hills');
  bake(scene, TEXTURE_KEYS.hills, w, h, (g) => {
    LANDSCAPE_VISUALS.forEach((ls, i) => {
      const baseY = 120 + i * 105;
      const amp = rng.int(26, 60);
      const freq = 1.2 + rng.next() * 1.4;
      const phase = rng.next() * Math.PI * 2;
      const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: h }];
      for (let x = 0; x <= w; x += 20) {
        pts.push({ x, y: baseY + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp });
      }
      pts.push({ x: w, y: h });
      g.fillStyle(ls.dark, 1);
      g.fillPoints(
        pts.map((p) => ({ x: p.x, y: p.y + 10 })),
        true,
      );
      g.fillStyle(ls.color, 1);
      g.fillPoints(pts, true);
    });
  });
}

/** Ordered list of all procedural textures generated during Preload. */
export function getTextureTasks(): TextureTask[] {
  return [
    { key: TEXTURE_KEYS.background, build: buildBackground },
    { key: TEXTURE_KEYS.particle, build: buildParticle },
    { key: TEXTURE_KEYS.star, build: buildStar },
    { key: TEXTURE_KEYS.hills, build: buildHills },
    ...atmosphereTasks(),
    ...LANDSCAPE_VISUALS.map((ls) => ({
      key: TEXTURE_KEYS.landscapeIcon(ls.id),
      build: (scene: Phaser.Scene) => buildLandscapeIcon(scene, ls),
    })),
    // Hero portraits are baked (or loaded) on first use: there are too many to prepare up front.
    ...cardPartTasks(),
  ];
}

/** Adds the animated night backdrop (sky, moon, mountains, fog, embers) behind the scene. */
export function addBackground(scene: Phaser.Scene, opts?: AtmosphereOptions): void {
  addAtmosphere(scene, opts);
}
