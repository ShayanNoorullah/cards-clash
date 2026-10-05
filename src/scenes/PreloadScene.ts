import Phaser from 'phaser';
import { MANIFEST } from '../art/manifest';
import { getTextureTasks } from '../art/proceduralTextures';
import { devStartScene } from '../config/dev';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { TIP_KEYS, t } from '../i18n/strings';
import { logger } from '../services/logger';
import { COLORS, hex, textStyle } from '../ui/theme';

const log = logger.child('Preload');

/**
 * Loads file assets (none yet; real art arrives through the asset manifest) and
 * generates procedural textures, spread across frames so the bar animates.
 * Progress = 30% file loading + 70% texture generation.
 */
export class PreloadScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;
  private percentText!: Phaser.GameObjects.Text;
  private fileProgress = 0;
  private genProgress = 0;

  constructor() {
    super(SCENE_KEYS.Preload);
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(hex(COLORS.outline));
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.text(cx, cy - 200, 'CARDS CLASH', textStyle(96, { color: hex(COLORS.accent) })).setOrigin(0.5);
    this.add.text(cx, cy - 90, 'Loading...', textStyle(44)).setOrigin(0.5);
    this.percentText = this.add.text(cx, cy + 90, '0%', textStyle(40)).setOrigin(0.5);
    // A random tip, rotating every few seconds on slow devices.
    let tipIndex = Phaser.Math.Between(0, TIP_KEYS.length - 1);
    const tipText = this.add
      .text(
        cx,
        cy + 260,
        `Tip: ${t(TIP_KEYS[tipIndex]!)}`,
        textStyle(34, { color: hex(COLORS.textDim), wordWrap: { width: 820 } }),
      )
      .setOrigin(0.5, 0);
    this.time.addEvent({
      delay: 3500,
      loop: true,
      callback: () => {
        tipIndex = (tipIndex + 1) % TIP_KEYS.length;
        tipText.setText(`Tip: ${t(TIP_KEYS[tipIndex]!)}`);
      },
    });

    this.bar = this.add.graphics();
    this.drawBar();

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.fileProgress = value;
      this.drawBar();
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      log.error(`Failed to load asset "${file.key}" from ${String(file.url)}`);
    });
    // Real art from the asset manifest replaces procedural textures with the same key.
    for (const [key, path] of Object.entries(MANIFEST.images)) this.load.image(key, path);
  }

  create(): void {
    this.fileProgress = 1;
    // Keys already loaded from the manifest keep their real image.
    const tasks = getTextureTasks().filter((t) => !this.textures.exists(t.key));
    let index = 0;
    const started = performance.now();

    const step = (): void => {
      // Generate as many textures as fit in ~8 ms, then yield to keep the bar smooth.
      const frameStart = performance.now();
      while (index < tasks.length && performance.now() - frameStart < 8) {
        const task = tasks[index];
        if (task) task.build(this);
        index++;
      }
      this.genProgress = tasks.length === 0 ? 1 : index / tasks.length;
      this.drawBar();
      if (index < tasks.length) {
        this.time.delayedCall(0, step);
        return;
      }
      log.info(`Generated ${tasks.length} textures in ${Math.round(performance.now() - started)} ms`);
      // Small pause so the full bar is visible for a moment.
      const dev = devStartScene();
      this.time.delayedCall(250, () =>
        dev ? this.scene.start(dev.key, dev.data) : this.scene.start(SCENE_KEYS.Title),
      );
    };
    step();
  }

  private drawBar(): void {
    const total = this.fileProgress * 0.3 + this.genProgress * 0.7;
    const w = 760;
    const h = 56;
    const x = (GAME_WIDTH - w) / 2;
    const y = GAME_HEIGHT / 2 - h / 2;
    const g = this.bar;
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(x - 8, y - 8, w + 16, h + 16, 34);
    g.fillStyle(COLORS.panelLight, 1);
    g.fillRoundedRect(x, y, w, h, 28);
    if (total > 0) {
      g.fillStyle(COLORS.accent, 1);
      g.fillRoundedRect(x, y, Math.max(h, w * total), h, 28);
      g.fillStyle(0xffffff, 0.3);
      g.fillRoundedRect(x + 10, y + 8, Math.max(h, w * total) - 20, h * 0.3, 10);
    }
    this.percentText.setText(`${Math.round(total * 100)}%`);
  }
}
