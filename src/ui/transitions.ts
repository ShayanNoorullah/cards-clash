import type Phaser from 'phaser';

const FADE_MS = 220;

/** Fades the camera out, then starts `key`. Guards against double taps. */
export function goToScene(scene: Phaser.Scene, key: string, data?: object): void {
  if (scene.data.get('__leaving')) return;
  scene.data.set('__leaving', true);
  scene.input.enabled = false;
  scene.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    scene.scene.start(key, data);
  });
}

/** Call at the start of create() so every scene fades in consistently. */
export function fadeIn(scene: Phaser.Scene): void {
  scene.data.set('__leaving', false);
  scene.input.enabled = true;
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
}
