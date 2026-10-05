/**
 * Android hardware/gesture Back: closes the top dialog, else presses the
 * screen's "Back" button, else opens the match menu; on the main menu a
 * second press within 2 s exits the app. Only installed in the native app.
 */
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type Phaser from 'phaser';
import { SCENE_KEYS } from '../config/display';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { showToast } from '../ui/Toast';
import { logger } from './logger';

const log = logger.child('Back');
const EXIT_WINDOW_MS = 2000;

function walk(
  list: Phaser.GameObjects.GameObject[],
  visit: (o: Phaser.GameObjects.GameObject) => boolean,
): boolean {
  // Topmost first: later children are drawn on top.
  for (let i = list.length - 1; i >= 0; i--) {
    const o = list[i]!;
    if (visit(o)) return true;
    const children = (o as Phaser.GameObjects.Container).list;
    if (Array.isArray(children) && (o as Phaser.GameObjects.Container).visible && walk(children, visit))
      return true;
  }
  return false;
}

/** Handles one Back press in `scene`. Returns false when nothing could handle it. */
export function handleBack(scene: Phaser.Scene): boolean {
  const top = scene.children.list;
  if (walk(top, (o) => o instanceof Modal && o.active && (o.close(), true))) return true;
  // A full-screen DOM prompt (deck name, deck code, ...) has its own Cancel.
  if (walk(top, (o) => o instanceof Button && o.label === 'Cancel' && o.press())) return true;
  if (walk(top, (o) => o instanceof Button && o.label === 'Back' && o.press())) return true;
  if (scene.scene.key === SCENE_KEYS.Match)
    return walk(top, (o) => o instanceof Button && o.label === '≡' && o.press());
  return false;
}

export function installBackButton(game: Phaser.Game): void {
  if (!Capacitor.isNativePlatform()) return;
  let lastExitPress = 0;
  void App.addListener('backButton', () => {
    const scenes = game.scene.getScenes(true);
    const scene = scenes[scenes.length - 1];
    if (!scene) return;
    if (handleBack(scene)) return;
    // Main menu / title: press twice to leave.
    const now = Date.now();
    if (now - lastExitPress < EXIT_WINDOW_MS) {
      log.info('Exit from Back');
      void App.exitApp();
      return;
    }
    lastExitPress = now;
    showToast(scene, 'Press Back again to exit');
  });
}
