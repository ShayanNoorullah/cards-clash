import Phaser from 'phaser';
import { startAutoSync } from '../online/client/cloudSync';
import { CARD_BODY_FONT, CARD_TITLE_FONT, HEADING_FONT, FONT_FAMILY, SCENE_KEYS } from '../config/display';
import { saves } from '../save';
import { logger } from '../services/logger';

const log = logger.child('Boot');

/**
 * First scene: waits for the bundled web font so Phaser text never renders with
 * a fallback font, then hands over to Preload.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#120c2b');
    void Promise.all([this.waitForFonts(), this.loadSave()]).then(() => {
      log.info('Boot complete');
      this.scene.start(SCENE_KEYS.Preload);
    });
  }

  private async loadSave(): Promise<void> {
    try {
      const save = await saves().load();
      log.info(`Save loaded (${saves().loadedFrom}), ${Object.keys(save.collection).length} cards owned`);
      startAutoSync();
    } catch (err) {
      log.error('Save could not be loaded', err);
    }
  }

  private async waitForFonts(): Promise<void> {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
    const load = Promise.all([
      document.fonts.load(`600 48px ${FONT_FAMILY}`),
      document.fonts.load(`700 48px ${HEADING_FONT}`),
      document.fonts.load(`700 48px ${CARD_TITLE_FONT}`),
      document.fonts.load(`600 48px ${CARD_TITLE_FONT}`),
      document.fonts.load(`600 48px ${CARD_BODY_FONT}`),
      document.fonts.load(`700 48px ${CARD_BODY_FONT}`),
      document.fonts.load(`italic 500 48px ${CARD_BODY_FONT}`),
      document.fonts.load(`italic 600 48px ${CARD_BODY_FONT}`),
    ]).then(
      () => undefined,
      (err: unknown) => log.warn('Font load failed, using fallback font', err),
    );
    await Promise.race([load, timeout]);
  }
}
