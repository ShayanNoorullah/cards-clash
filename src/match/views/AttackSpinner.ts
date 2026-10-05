import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HEADING_FONT } from '../../config/display';
import type { StrikeRoll } from '../../engine/actions';
import { audio } from '../../services/audio';
import { getSettings } from '../../services/settings';
import { COLORS, textStyle } from '../../ui/theme';
import { dur, wait } from '../fx';
import { NEEDLE_SPEED, norm, randomDial, rollAt, type StrikeDial } from '../strikeTiming';

const RADIUS = 210;
const GREEN = 0x2f9e44;
const PERFECT = 0x8dff5a;
const MISS = 0xb8323f;

const RESULT: Record<StrikeRoll, { text: string; color: string }> = {
  perfect: { text: 'PERFECT! ×2', color: '#b8ff7a' },
  hit: { text: 'HIT!', color: '#fff3c4' },
  miss: { text: 'MISS', color: '#ff7a85' },
};

/** Degrees clockwise from 12 o'clock → Phaser radians (0 = 3 o'clock). */
const rad = (deg: number) => Phaser.Math.DegToRad(deg - 90);

/**
 * The attack timing disc: a sword sweeps round a dial with a red Miss zone, a
 * bright Perfect zone and green Hit everywhere else. Tap (or press Space) to
 * stop it; resolves with the result.
 */
export function spinForStrike(
  scene: Phaser.Scene,
  x: number,
  y: number,
  title: string,
  dial: StrikeDial = randomDial(),
): Promise<StrikeRoll> {
  return new Promise((resolve) => {
    const root = scene.add.container(0, 0).setDepth(900);
    const dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35)
      .setInteractive();
    root.add(dim);

    const disc = scene.add.container(x, y);
    root.add(disc);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(6, 10, RADIUS + 14);
    g.fillStyle(COLORS.outline, 1);
    g.fillCircle(0, 0, RADIUS + 12);
    g.fillStyle(GREEN, 1);
    g.fillCircle(0, 0, RADIUS);
    const zone = (start: number, span: number, color: number) => {
      g.fillStyle(color, 1);
      g.slice(0, 0, RADIUS, rad(start), rad(start + span), false);
      g.fillPath();
    };
    zone(dial.missStart, dial.missSpan, MISS);
    zone(dial.perfectStart, dial.perfectSpan, PERFECT);
    // Spokes and a glassy rim.
    g.lineStyle(3, 0x0b2a12, 0.6);
    for (const edge of [
      dial.missStart,
      dial.missStart + dial.missSpan,
      dial.perfectStart,
      dial.perfectStart + dial.perfectSpan,
    ]) {
      g.lineBetween(0, 0, Math.cos(rad(edge)) * RADIUS, Math.sin(rad(edge)) * RADIUS);
    }
    g.lineStyle(6, 0xffffff, 0.18);
    g.strokeCircle(0, 0, RADIUS - 6);
    disc.add(g);

    // The sword needle: blade, guard, grip.
    const needle = scene.add.container(0, 0);
    const s = scene.add.graphics();
    s.fillStyle(0x3a2a1a, 1);
    s.fillRoundedRect(-9, -8, 18, 70, 6);
    s.fillStyle(0xd9a441, 1);
    s.fillRoundedRect(-34, -18, 68, 16, 6);
    s.fillStyle(0xe8edf2, 1);
    s.fillTriangle(-12, -18, 12, -18, 0, -RADIUS + 6);
    s.fillStyle(0xffffff, 0.7);
    s.fillTriangle(-3, -18, 3, -18, 0, -RADIUS + 20);
    s.lineStyle(3, COLORS.outline, 1);
    s.strokeTriangle(-12, -18, 12, -18, 0, -RADIUS + 6);
    needle.add(s);
    const hub = scene.add.graphics();
    hub.fillStyle(COLORS.outline, 1);
    hub.fillCircle(0, 0, 34);
    hub.fillStyle(0x6c7a89, 1);
    hub.fillCircle(0, 0, 26);
    hub.fillStyle(0xd9a441, 1);
    hub.fillCircle(0, 0, 12);
    disc.add([needle, hub]);

    root.add(scene.add.text(x, y - RADIUS - 70, title, textStyle(42)).setOrigin(0.5));
    const prompt = scene.add
      .text(x, y + RADIUS + 70, 'Tap to Attack!', textStyle(56, { fontFamily: HEADING_FONT }))
      .setOrigin(0.5);
    root.add(prompt);
    const pulse = getSettings().reducedMotion
      ? null
      : scene.tweens.add({ targets: prompt, scale: 1.08, duration: 420, yoyo: true, repeat: -1 });

    // Start somewhere random so the first stop is not memorised.
    let angle = Math.random() * 360;
    let stopped = false;
    const tick = (_t: number, delta: number) => {
      if (stopped) return;
      angle = norm(angle + (NEEDLE_SPEED * delta) / 1000);
      needle.setAngle(angle);
    };
    needle.setAngle(angle);
    scene.events.on(Phaser.Scenes.Events.UPDATE, tick);

    const stop = async () => {
      if (stopped) return;
      stopped = true;
      scene.events.off(Phaser.Scenes.Events.UPDATE, tick);
      scene.input.keyboard?.off('keydown-SPACE', stop);
      pulse?.stop();
      const roll = rollAt(dial, angle);
      audio.play(roll === 'miss' ? 'error' : 'attack');
      const r = RESULT[roll];
      prompt.setText(r.text).setColor(r.color).setScale(1);
      if (roll === 'perfect' && !getSettings().reducedMotion)
        scene.cameras.main.flash(dur(160), 180, 255, 120);
      await wait(scene, Math.max(350, dur(650)));
      root.destroy();
      resolve(roll);
    };
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => void stop());
    scene.input.keyboard?.on('keydown-SPACE', stop);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, tick);
      scene.input.keyboard?.off('keydown-SPACE', stop);
    });
  });
}

export const STRIKE_LABEL: Record<Exclude<StrikeRoll, 'hit'>, { text: string; color: string }> = {
  perfect: { text: 'Perfect!', color: '#b8ff7a' },
  miss: { text: 'Miss!', color: '#ff7a85' },
};
