import { audio } from '../services/audio';
import Phaser from 'phaser';
import { addBackground } from '../art/proceduralTextures';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import creditsData from '../data/credits.json';
import { Button } from '../ui/Button';
import { COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';

const LIST_TOP = 260;
const LIST_BOTTOM = GAME_HEIGHT - 260;

/** Settings → Credits: every third-party asset with author, license and source. */
export class CreditsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Credits);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 140, 'Credits', textStyle(96, { color: hex(COLORS.accent) })).setOrigin(0.5);

    const list = this.add.container(0, LIST_TOP);
    let y = 0;
    const intro = this.add
      .text(
        cx,
        y,
        'Cards Clash is a free, non-commercial fan game. Its cards come from Card Wars (Adventure Time); card names and texts belong to their owners, and this game is not affiliated with them.\nThird-party content, assets and libraries:',
        textStyle(36, {
          color: hex(COLORS.textDim),
          wordWrap: { width: GAME_WIDTH - 140 },
          strokeThickness: 4,
        }),
      )
      .setOrigin(0.5, 0);
    list.add(intro);
    y += intro.height + 40;

    for (const entry of creditsData.entries) {
      const card = this.add.container(cx, y);
      const title = this.add
        .text(0, 28, entry.name, textStyle(44, { color: hex(COLORS.accent) }))
        .setOrigin(0.5, 0);
      const details = this.add
        .text(
          0,
          28 + title.height + 8,
          `${entry.author}\n${entry.license}\n${entry.url}`,
          textStyle(30, {
            strokeThickness: 3,
            wordWrap: { width: GAME_WIDTH - 200, useAdvancedWrap: true },
            lineSpacing: 6,
          }),
        )
        .setOrigin(0.5, 0);
      const h = 28 + title.height + 8 + details.height + 28;
      const bg = this.add.graphics();
      bg.fillStyle(COLORS.panel, 0.85);
      bg.fillRoundedRect(-(GAME_WIDTH - 120) / 2, 0, GAME_WIDTH - 120, h, 28);
      card.add([bg, title, details]);
      list.add(card);
      y += h + 24;
    }

    // Clip the list to its viewport and make it drag/wheel scrollable.
    const viewH = LIST_BOTTOM - LIST_TOP;
    const maskShape = this.make.graphics({}, false);
    maskShape.fillRect(0, LIST_TOP, GAME_WIDTH, viewH);
    list.setMask(maskShape.createGeometryMask());
    const minY = Math.min(LIST_TOP, LIST_TOP - (y - viewH));
    const clamp = (v: number) => Phaser.Math.Clamp(v, minY, LIST_TOP);

    const zone = this.add.zone(0, LIST_TOP, GAME_WIDTH, viewH).setOrigin(0).setInteractive();
    let dragStart: { pointerY: number; listY: number } | null = null;
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      dragStart = { pointerY: p.y, listY: list.y };
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (dragStart && p.isDown) list.y = clamp(dragStart.listY + (p.y - dragStart.pointerY));
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      dragStart = null;
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        list.y = clamp(list.y - dy);
      },
    );

    const back = () => goToScene(this, SCENE_KEYS.MainMenu);
    new Button(this, cx, GAME_HEIGHT - 140, 'Back', {
      width: 500,
      height: 130,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: back,
    });
    this.input.keyboard?.on('keydown-ESC', back);
  }
}
