/**
 * Animated dark-fantasy backdrop shared by every screen: night sky, stars,
 * a glowing moon with slow light rays, three parallax mountain ranges, drifting
 * fog, rising embers and a vignette. Textures are baked once in Preload;
 * motion is switched off with Reduced motion.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { Rng } from '../engine/rng';
import { getSettings } from '../services/settings';
import { mix } from './color';
import { bake } from './frames';

export const ATM_KEYS = {
  sky: 'atm-sky',
  stars: 'atm-stars',
  glow: 'atm-glow',
  ray: 'atm-ray',
  far: 'atm-mtn-far',
  mid: 'atm-mtn-mid',
  near: 'atm-mtn-near',
  fog: 'atm-fog',
  vignette: 'atm-vignette',
  ember: 'atm-ember',
} as const;

type G = Phaser.GameObjects.Graphics;

/** A seamless mountain ridge (integer sine frequencies tile across the width). */
function ridge(
  g: G,
  w: number,
  h: number,
  seed: string,
  base: number,
  amp: number,
  color: number,
  jagged: number,
): void {
  const rng = new Rng(seed);
  const waves = [1, 2, 3, 5, 8].map((f) => ({ f, a: rng.next() * amp, p: rng.next() * Math.PI * 2 }));
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: h }];
  for (let x = 0; x <= w; x += 6) {
    let y = base;
    for (const wv of waves)
      y -= Math.sin((x / w) * Math.PI * 2 * wv.f + wv.p) * wv.a * (wv.f > 3 ? jagged : 1);
    pts.push({ x, y });
  }
  pts.push({ x: w, y: h });
  g.fillStyle(color, 1);
  g.fillPoints(pts, true);
}

export function atmosphereTasks(): { key: string; build: (s: Phaser.Scene) => void }[] {
  return [
    {
      key: ATM_KEYS.sky,
      build: (s) =>
        bake(s, ATM_KEYS.sky, 4, 512, (g) => {
          const stops = [0x04050c, 0x0b1030, 0x1c1d4a, 0x3a2350, 0x22142e];
          for (let y = 0; y < 512; y++) {
            const t = (y / 511) * (stops.length - 1);
            const i = Math.min(stops.length - 2, Math.floor(t));
            g.fillStyle(mix(stops[i]!, stops[i + 1]!, t - i), 1);
            g.fillRect(0, y, 4, 1);
          }
        }),
    },
    {
      key: ATM_KEYS.stars,
      build: (s) =>
        bake(s, ATM_KEYS.stars, GAME_WIDTH, 900, (g) => {
          const rng = new Rng('stars');
          for (let i = 0; i < 170; i++) {
            const big = rng.chance(0.08);
            g.fillStyle(rng.chance(0.2) ? 0xffe2b0 : 0xd8e4ff, 0.25 + rng.next() * 0.6);
            g.fillCircle(rng.next() * GAME_WIDTH, rng.next() * 900 * (1 - rng.next() * 0.3), big ? 2.4 : 1.2);
          }
        }),
    },
    {
      key: ATM_KEYS.glow,
      build: (s) =>
        bake(s, ATM_KEYS.glow, 256, 256, (g) => {
          for (let r = 128; r > 0; r -= 2) {
            const t = 1 - r / 128;
            g.fillStyle(0xffffff, 0.02 + t * t * 0.09);
            g.fillCircle(128, 128, r);
          }
        }),
    },
    {
      key: ATM_KEYS.ray,
      build: (s) =>
        bake(s, ATM_KEYS.ray, 120, 1000, (g) => {
          for (let i = 0; i < 20; i++) {
            const t = i / 20;
            g.fillStyle(0xffffff, 0.05 * (1 - t));
            g.fillTriangle(60, 0, 60 - 60 * (1 - t * 0.2), 1000, 60 + 60 * (1 - t * 0.2), 1000);
          }
        }),
    },
    {
      key: ATM_KEYS.far,
      build: (s) =>
        bake(s, ATM_KEYS.far, GAME_WIDTH, 520, (g) =>
          ridge(g, GAME_WIDTH, 520, 'far', 240, 70, 0x1f2450, 1.4),
        ),
    },
    {
      key: ATM_KEYS.mid,
      build: (s) =>
        bake(s, ATM_KEYS.mid, GAME_WIDTH, 460, (g) =>
          ridge(g, GAME_WIDTH, 460, 'mid', 230, 80, 0x141836, 1.2),
        ),
    },
    {
      key: ATM_KEYS.near,
      build: (s) =>
        bake(s, ATM_KEYS.near, GAME_WIDTH, 380, (g) => {
          ridge(g, GAME_WIDTH, 380, 'near', 200, 60, 0x0a0c1d, 1.8);
          // Pine silhouettes along the near ridge.
          const rng = new Rng('pines');
          for (let i = 0; i < 26; i++) {
            const x = rng.next() * GAME_WIDTH;
            const hgt = 60 + rng.next() * 90;
            const base = 230 + rng.next() * 60;
            g.fillStyle(0x07091a, 1);
            g.fillTriangle(x, base - hgt, x - hgt * 0.28, base, x + hgt * 0.28, base);
            g.fillTriangle(
              x,
              base - hgt * 0.7,
              x - hgt * 0.34,
              base - hgt * 0.1,
              x + hgt * 0.34,
              base - hgt * 0.1,
            );
          }
        }),
    },
    {
      key: ATM_KEYS.fog,
      build: (s) =>
        bake(s, ATM_KEYS.fog, GAME_WIDTH, 220, (g) => {
          const rng = new Rng('fog');
          for (let i = 0; i < 40; i++) {
            g.fillStyle(0xb8c6ff, 0.035);
            const x = rng.next() * GAME_WIDTH;
            const y = 60 + rng.next() * 100;
            g.fillEllipse(x, y, 260 + rng.next() * 300, 60 + rng.next() * 60);
            // Wrap so the band tiles horizontally.
            g.fillEllipse(x - GAME_WIDTH, y, 260, 60);
            g.fillEllipse(x + GAME_WIDTH, y, 260, 60);
          }
        }),
    },
    {
      key: ATM_KEYS.vignette,
      build: (s) =>
        bake(s, ATM_KEYS.vignette, 270, 480, (g) => {
          for (let i = 0; i < 30; i++) {
            const t = i / 30;
            g.lineStyle(9, 0x000000, 0.035 * (1 - t) * 1.6);
            g.strokeEllipse(135, 240, 270 + 260 * (1 - t), 480 + 420 * (1 - t));
          }
        }),
    },
    {
      key: ATM_KEYS.ember,
      build: (s) =>
        bake(s, ATM_KEYS.ember, 24, 24, (g) => {
          for (let r = 12; r > 0; r--) {
            g.fillStyle(0xffffff, (1 - r / 12) * 0.5);
            g.fillCircle(12, 12, r);
          }
        }),
    },
  ];
}

export interface AtmosphereOptions {
  /** Where the moon sits (title screens put it behind the logo). */
  moon?: { x: number; y: number; scale?: number };
  /** Colour of the moonlight and embers. */
  tint?: number;
  /** Skip the mountains (e.g. the match screen, where the board covers them). */
  mountains?: boolean;
}

/** Adds the animated backdrop behind everything else in a scene. */
export function addAtmosphere(scene: Phaser.Scene, opts: AtmosphereOptions = {}): void {
  const still = getSettings().reducedMotion;
  const tint = opts.tint ?? 0xffd9a0;
  const depth = -100;
  scene.add.image(0, 0, ATM_KEYS.sky).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(depth);
  const stars = scene.add.image(0, 0, ATM_KEYS.stars).setOrigin(0).setDepth(depth).setAlpha(0.9);
  if (!still)
    scene.tweens.add({
      targets: stars,
      alpha: 0.55,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

  const moon = opts.moon ?? { x: GAME_WIDTH * 0.74, y: 330, scale: 1 };
  const ms = moon.scale ?? 1;
  const halo = scene.add
    .image(moon.x, moon.y, ATM_KEYS.glow)
    .setDepth(depth)
    .setScale(5 * ms)
    .setTint(tint)
    .setAlpha(0.55);
  halo.setBlendMode(Phaser.BlendModes.ADD);
  scene.add
    .image(moon.x, moon.y, ATM_KEYS.glow)
    .setDepth(depth)
    .setScale(1.3 * ms)
    .setTint(0xfff2d6)
    .setBlendMode(Phaser.BlendModes.ADD);
  const disc = scene.add.graphics().setDepth(depth);
  disc.fillStyle(mix(tint, 0xffffff, 0.6), 0.9);
  disc.fillCircle(moon.x, moon.y, 70 * ms);
  disc.fillStyle(mix(tint, 0x000000, 0.2), 0.25);
  disc.fillCircle(moon.x - 18 * ms, moon.y - 10 * ms, 16 * ms);
  disc.fillCircle(moon.x + 22 * ms, moon.y + 20 * ms, 11 * ms);
  if (!still)
    scene.tweens.add({
      targets: halo,
      alpha: 0.35,
      scale: 4.6 * ms,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

  // Slowly sweeping light rays from the moon.
  const rays: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < 4; i++) {
    const ray = scene.add
      .image(moon.x, moon.y, ATM_KEYS.ray)
      .setOrigin(0.5, 0)
      .setDepth(depth)
      .setAngle(-150 + i * 34)
      .setScale(1.6, 2.2)
      .setTint(tint)
      .setAlpha(0.28)
      .setBlendMode(Phaser.BlendModes.ADD);
    rays.push(ray);
    if (!still)
      scene.tweens.add({
        targets: ray,
        angle: ray.angle + 10,
        alpha: 0.1,
        duration: 7000 + i * 1300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
  }

  if (opts.mountains !== false) {
    const layer = (key: string, y: number, h: number, alpha = 1) =>
      scene.add.tileSprite(0, y, GAME_WIDTH, h, key).setOrigin(0, 0).setDepth(depth).setAlpha(alpha);
    const far = layer(ATM_KEYS.far, GAME_HEIGHT - 1060, 520, 0.95);
    const fog1 = layer(ATM_KEYS.fog, GAME_HEIGHT - 760, 220);
    const mid = layer(ATM_KEYS.mid, GAME_HEIGHT - 800, 460);
    const fog2 = layer(ATM_KEYS.fog, GAME_HEIGHT - 470, 220);
    const near = layer(ATM_KEYS.near, GAME_HEIGHT - 380, 380);
    if (!still) {
      scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, dt: number) => {
        const k = dt / 16.7;
        far.tilePositionX += 0.06 * k;
        mid.tilePositionX += 0.14 * k;
        near.tilePositionX += 0.28 * k;
        fog1.tilePositionX -= 0.35 * k;
        fog2.tilePositionX += 0.5 * k;
      });
    }
  }

  if (!still) {
    scene.add
      .particles(0, 0, ATM_KEYS.ember, {
        x: { min: 0, max: GAME_WIDTH },
        y: GAME_HEIGHT + 10,
        lifespan: { min: 7000, max: 12000 },
        speedY: { min: -120, max: -50 },
        speedX: { min: -25, max: 25 },
        scale: { start: 0.9, end: 0.1 },
        alpha: { start: 0.8, end: 0 },
        tint: [tint, 0xff8a3c, 0xffe6a8],
        frequency: 380,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(depth);
  }
  scene.add
    .image(0, 0, ATM_KEYS.vignette)
    .setOrigin(0)
    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    .setDepth(depth + 1);
  void rays;
}
