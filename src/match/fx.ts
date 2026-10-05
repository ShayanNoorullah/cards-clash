import type Phaser from 'phaser';
import { TEXTURE_KEYS } from '../art/proceduralTextures';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { durationScale, getSettings } from '../services/settings';
import { textStyle } from '../ui/theme';

/** Scales a base duration by the animation-speed setting. */
export function dur(ms: number): number {
  return Math.round(ms * durationScale());
}

/** Promise-based tween helper; resolves immediately when animations are instant. */
export function tweenAsync(
  scene: Phaser.Scene,
  config: Phaser.Types.Tweens.TweenBuilderConfig,
): Promise<void> {
  const duration = dur(typeof config.duration === 'number' ? config.duration : 300);
  return new Promise((resolve) => {
    if (duration <= 0) {
      const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
      for (const t of targets) {
        for (const [k, v] of Object.entries(config)) {
          if (['targets', 'duration', 'ease', 'yoyo', 'delay', 'onComplete', 'repeat', 'hold'].includes(k))
            continue;
          if (typeof v === 'number' && !config.yoyo) (t as Record<string, number>)[k] = v;
        }
      }
      resolve();
      return;
    }
    scene.tweens.add({ ...config, duration, onComplete: () => resolve() });
  });
}

export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  const d = dur(ms);
  return new Promise((resolve) => {
    if (d <= 0) resolve();
    else scene.time.delayedCall(d, () => resolve());
  });
}

/** Floating number / text that rises and fades. */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string,
  size = 64,
): void {
  const t = scene.add
    .text(x, y, text, textStyle(size, { color, strokeThickness: 10 }))
    .setOrigin(0.5)
    .setDepth(500);
  if (dur(700) <= 0) {
    scene.time.delayedCall(250, () => t.destroy());
    return;
  }
  const rise = getSettings().reducedMotion ? 20 : 90;
  scene.tweens.add({
    targets: t,
    y: y - rise,
    alpha: { from: 1, to: 0 },
    scale: { from: 1.25, to: 1 },
    duration: dur(900),
    ease: 'Cubic.Out',
    onComplete: () => t.destroy(),
  });
}

/** Particle burst (destroy, hit sparks). Skipped with reduced motion. */
export function burst(scene: Phaser.Scene, x: number, y: number, tint: number, count = 18): void {
  if (getSettings().reducedMotion || dur(500) <= 0) return;
  const emitter = scene.add.particles(x, y, TEXTURE_KEYS.particle, {
    speed: { min: 120, max: 420 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.1, end: 0 },
    lifespan: dur(650),
    tint,
    emitting: false,
  });
  emitter.setDepth(480);
  emitter.explode(count);
  scene.time.delayedCall(dur(900) + 50, () => emitter.destroy());
}

export function shake(scene: Phaser.Scene, intensity = 0.008): void {
  if (getSettings().reducedMotion || dur(200) <= 0) return;
  scene.cameras.main.shake(dur(220), intensity);
}

/** Victory confetti from the top of the screen. */
export function confetti(scene: Phaser.Scene): void {
  if (getSettings().reducedMotion) return;
  const emitter = scene.add.particles(0, -20, TEXTURE_KEYS.star, {
    x: { min: 0, max: GAME_WIDTH },
    speedY: { min: 250, max: 600 },
    speedX: { min: -120, max: 120 },
    rotate: { min: 0, max: 360 },
    scale: { min: 0.4, max: 0.9 },
    lifespan: 4000,
    quantity: 3,
    frequency: 40,
    tint: [0xff5f6d, 0xffc93c, 0x44c767, 0x5b8def, 0xb65cff],
  });
  emitter.setDepth(950);
  scene.time.delayedCall(2500, () => emitter.stop());
  scene.time.delayedCall(7000, () => emitter.destroy());
}

/** Big centered banner (turn start, Hero Ability). */
export async function banner(scene: Phaser.Scene, text: string, color: number, hold = 700): Promise<void> {
  const d = dur(hold);
  if (d <= 0) return;
  const c = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100).setDepth(700);
  const g = scene.add.graphics();
  g.fillStyle(0x120c2b, 0.85);
  g.fillRoundedRect(-480, -80, 960, 160, 40);
  g.lineStyle(6, color, 1);
  g.strokeRoundedRect(-480, -80, 960, 160, 40);
  const t = scene.add
    .text(0, 0, text, textStyle(64, { color: `#${color.toString(16).padStart(6, '0')}` }))
    .setOrigin(0.5);
  if (t.width > 900) t.setScale(900 / t.width);
  c.add([g, t]);
  c.setScale(0.6).setAlpha(0);
  await tweenAsync(scene, { targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
  await wait(scene, hold);
  await tweenAsync(scene, { targets: c, alpha: 0, duration: 200 });
  c.destroy();
}
