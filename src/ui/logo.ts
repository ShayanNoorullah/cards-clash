import Phaser from 'phaser';
import { HEADING_FONT } from '../config/display';
import { getSettings } from '../services/settings';

/** Fills a text with a vertical metallic gradient. */
export function metallic(text: Phaser.GameObjects.Text, stops: [number, string][]): void {
  const grad = text.context.createLinearGradient(0, 0, 0, text.height);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  text.setFill(grad);
}

export const GOLD: [number, string][] = [
  [0, '#fff6d8'],
  [0.45, '#f2c86a'],
  [0.55, '#b9832a'],
  [1, '#f7d98e'],
];
export const SILVER: [number, string][] = [
  [0, '#ffffff'],
  [0.45, '#d9def0'],
  [0.55, '#8d95b3'],
  [1, '#eef1ff'],
];

/**
 * Sweeps a band of light across a game object every few seconds (WebGL only;
 * skipped with Reduced motion). `maskOf` makes a hidden copy used as the mask.
 */
export function addShine(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  mask: Phaser.GameObjects.GameObject & { createBitmapMask: () => Phaser.Display.Masks.BitmapMask },
  depth: number,
  delay = 1200,
): void {
  if (scene.game.renderer.type !== Phaser.WEBGL || getSettings().reducedMotion) return;
  const shine = scene.add
    .rectangle(x - w / 2 - 120, y, 110, h * 1.5, 0xffffff, 0.5)
    .setAngle(18)
    .setDepth(depth)
    .setBlendMode(Phaser.BlendModes.ADD);
  shine.setMask(mask.createBitmapMask());
  scene.tweens.add({
    targets: shine,
    x: x + w / 2 + 120,
    duration: 1300,
    delay,
    repeat: -1,
    repeatDelay: 3600,
    ease: 'Sine.InOut',
  });
}

/** The one-line "CARDS CLASH" wordmark: gold + silver metal, deep shadow, light sweep. */
export function addWordmark(scene: Phaser.Scene, x: number, y: number, size: number, depth = 5): void {
  const style = (fill: string): Phaser.Types.GameObjects.Text.TextStyle => ({
    fontFamily: HEADING_FONT,
    fontStyle: '700',
    fontSize: `${size}px`,
    color: fill,
    stroke: '#1a0f04',
    strokeThickness: Math.round(size / 16),
    resolution: 2,
    shadow: { offsetX: 0, offsetY: size / 12, color: '#000000', blur: size / 5, fill: true, stroke: true },
  });
  const spacing = Math.round(size / 14);
  const a = scene.add
    .text(0, y, 'CARDS', style('#ffffff'))
    .setOrigin(1, 0.5)
    .setLetterSpacing(spacing)
    .setDepth(depth);
  const b = scene.add
    .text(0, y, 'CLASH', style('#ffffff'))
    .setOrigin(0, 0.5)
    .setLetterSpacing(spacing)
    .setDepth(depth);
  const gap = size * 0.3;
  const total = a.width + b.width + gap;
  a.setX(x - total / 2 + a.width);
  b.setX(x - total / 2 + a.width + gap);
  metallic(a, GOLD);
  metallic(b, SILVER);
  for (const word of [a, b]) {
    const copy = scene.add
      .text(word.x, word.y, word.text, word.style)
      .setOrigin(word.originX, word.originY)
      .setLetterSpacing(spacing)
      .setVisible(false);
    const cx = word.originX === 1 ? word.x - word.width / 2 : word.x + word.width / 2;
    addShine(scene, cx, y, word.width, word.height, copy, depth + 1, 1500 + (word === b ? 120 : 0));
  }
}
