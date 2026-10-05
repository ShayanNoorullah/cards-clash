import type Phaser from 'phaser';
import { GAME_WIDTH } from '../config/display';
import { COLORS, bodySize, textStyle } from './theme';

/** Shows a short message that slides up from the bottom and fades out. */
export function showToast(scene: Phaser.Scene, message: string, durationMs = 1800): void {
  const y = scene.scale.gameSize.height - 220;
  const text = scene.add
    .text(0, 0, message, textStyle(bodySize(38), { wordWrap: { width: GAME_WIDTH - 200 } }))
    .setOrigin(0.5);
  const padX = 48;
  const padY = 28;
  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.outline, 0.9);
  bg.fillRoundedRect(
    -text.width / 2 - padX,
    -text.height / 2 - padY,
    text.width + padX * 2,
    text.height + padY * 2,
    28,
  );
  const toast = scene.add
    .container(GAME_WIDTH / 2, y + 60, [bg, text])
    .setDepth(1000)
    .setAlpha(0);

  scene.tweens.chain({
    targets: toast,
    tweens: [
      { y, alpha: 1, duration: 200, ease: 'Back.Out' },
      { alpha: 0, delay: durationMs, duration: 250 },
    ],
    onComplete: () => toast.destroy(),
  });
}
