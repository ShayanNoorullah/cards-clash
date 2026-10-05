import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/display';
import { Button } from './Button';
import { bodySize, COLORS, textStyle } from './theme';

export interface ModalButton {
  label: string;
  color?: number;
  shadowColor?: number;
  caption?: string;
  /** Return false to keep the modal open. */
  onClick: () => void | boolean;
}

/**
 * Centered modal panel over a dimmed backdrop that swallows input.
 * Tapping the backdrop closes it.
 */
export class Modal extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, title: string, body: string, buttons: ModalButton[]) {
    super(scene, 0, 0);
    this.setDepth(900);

    const backdrop = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setOrigin(0)
      .setInteractive();
    backdrop.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.close());
    this.add(backdrop);

    const panelW = 880;
    const btnH = 120;
    const bodyText = scene.add
      .text(0, 0, body, textStyle(bodySize(36), { wordWrap: { width: panelW - 120 }, strokeThickness: 4 }))
      .setOrigin(0.5, 0);
    const panelH = 200 + bodyText.height + buttons.length * (btnH + 40) + 40;

    const panel = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const g = scene.add.graphics();
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(-panelW / 2 - 8, -panelH / 2 - 8, panelW + 16, panelH + 16, 48);
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 42);
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, 130, { tl: 42, tr: 42, bl: 0, br: 0 });
    // Block clicks on the panel from reaching the backdrop.
    const hit = scene.add.zone(0, 0, panelW, panelH).setInteractive();
    panel.add([g, hit]);

    panel.add(scene.add.text(0, -panelH / 2 + 65, title, textStyle(60)).setOrigin(0.5));
    bodyText.setY(-panelH / 2 + 170);
    panel.add(bodyText);

    let y = -panelH / 2 + 200 + bodyText.height + btnH / 2;
    for (const b of buttons) {
      const opts = {
        width: panelW - 200,
        height: btnH,
        onClick: () => {
          if (b.onClick() !== false) this.close();
        },
        ...(b.color !== undefined ? { color: b.color } : {}),
        ...(b.shadowColor !== undefined ? { shadowColor: b.shadowColor } : {}),
        ...(b.caption !== undefined ? { caption: b.caption } : {}),
      };
      panel.add(new Button(scene, 0, y, b.label, opts));
      y += btnH + 40;
    }
    this.add(panel);

    panel.setScale(0.85).setAlpha(0);
    backdrop.setAlpha(0);
    scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 180, ease: 'Back.Out' });
    scene.tweens.add({ targets: backdrop, alpha: 1, duration: 150 });
    scene.add.existing(this);
  }

  close(): void {
    if (!this.active) return;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 120,
      onComplete: () => this.destroy(),
    });
  }
}
