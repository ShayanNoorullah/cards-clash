import Phaser from 'phaser';
import { addBackground } from '../art/proceduralTextures';
import { GAME_HEIGHT, GAME_WIDTH, HEADING_FONT, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import { audio } from '../services/audio';
import { getSettings } from '../services/settings';
import { CardView } from '../ui/CardView';
import { COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';

const LOGO_Y = 600;
/** Cards fanned behind the logo (one legendary per landscape). */
const FAN_CARDS = ['madame_seota', 'dr_death', 'ghost_bull', 'legion_of_earlings', 'sandy'];

/** Fills a text with a vertical metallic gradient. */
function metallic(text: Phaser.GameObjects.Text, stops: [number, string][]): void {
  const grad = text.context.createLinearGradient(0, 0, 0, text.height);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  text.setFill(grad);
}

/** Cinematic title: night sky, a fan of legendary cards, a metallic logo with a shine sweep. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Title);
  }

  create(): void {
    fadeIn(this);
    const cx = GAME_WIDTH / 2;
    addBackground(this, { moon: { x: cx, y: LOGO_Y - 40, scale: 1.5 }, tint: 0xffc978 });
    audio.playMusic('menu');
    const still = getSettings().reducedMotion;

    // Fan of legendary cards behind the logo, gently floating.
    const { ctx } = getContent();
    const fan = this.add.container(cx, LOGO_Y + 560).setDepth(1);
    FAN_CARDS.forEach((id, i) => {
      const card = ctx.cards.byId.get(id);
      if (!card) return;
      const k = i - (FAN_CARDS.length - 1) / 2;
      const view = new CardView(this, k * 150, Math.abs(k) * 40, card).setScale(0.68).setAngle(k * 11);
      view.setAlpha(0);
      fan.add(view);
      this.tweens.add({
        targets: view,
        alpha: 0.92,
        y: view.y - 30,
        duration: 900,
        delay: 200 + i * 120,
        ease: 'Cubic.Out',
      });
      if (!still)
        this.tweens.add({
          targets: view,
          y: `-=${14 + Math.abs(k) * 4}`,
          angle: view.angle + (k === 0 ? 1.5 : k * 1.2),
          duration: 2600 + i * 300,
          delay: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
    });
    // Dark wash under the logo so it reads over the cards.
    const wash = this.add.graphics().setDepth(2);
    for (let i = 0; i < 12; i++) {
      wash.fillStyle(0x04050c, 0.06);
      wash.fillEllipse(cx, LOGO_Y + 10, 1100 - i * 40, 420 - i * 18);
    }

    // Logo: metallic letters, deep shadow, and a light sweep across them.
    const logo = this.add.container(cx, LOGO_Y).setDepth(3);
    const make = (y: number, word: string, size: number) =>
      this.add
        .text(0, y, word, {
          fontFamily: HEADING_FONT,
          fontStyle: '700',
          fontSize: `${size}px`,
          color: '#ffffff',
          stroke: '#1a0f04',
          strokeThickness: Math.round(size / 18),
          resolution: 2,
          shadow: { offsetX: 0, offsetY: 12, color: '#000000', blur: 24, fill: true, stroke: true },
        })
        .setOrigin(0.5)
        .setLetterSpacing(Math.round(size / 14));
    const top = make(-105, 'CARDS', 190);
    const bottom = make(95, 'CLASH', 230);
    metallic(top, [
      [0, '#fff6d8'],
      [0.45, '#f2c86a'],
      [0.55, '#b9832a'],
      [1, '#f7d98e'],
    ]);
    metallic(bottom, [
      [0, '#ffffff'],
      [0.45, '#d9def0'],
      [0.55, '#8d95b3'],
      [1, '#eef1ff'],
    ]);
    logo.add([top, bottom]);
    const rule = this.add.graphics();
    rule.lineStyle(3, COLORS.accent, 0.9);
    rule.lineBetween(-380, 0, -60, 0);
    rule.lineBetween(60, 0, 380, 0);
    rule.fillStyle(COLORS.accent, 1);
    rule.fillPoints(
      [
        { x: 0, y: -14 },
        { x: 14, y: 0 },
        { x: 0, y: 14 },
        { x: -14, y: 0 },
      ],
      true,
    );
    logo.add(rule);
    logo.setScale(1.25).setAlpha(0);
    this.tweens.add({ targets: logo, scale: 1, alpha: 1, duration: 900, ease: 'Cubic.Out' });

    if (this.game.renderer.type === Phaser.WEBGL && !still) {
      for (const word of [top, bottom]) {
        const shine = this.add
          .rectangle(cx - 700, LOGO_Y + word.y, 120, word.height * 1.4, 0xffffff, 0.55)
          .setAngle(18)
          .setDepth(4)
          .setBlendMode(Phaser.BlendModes.ADD);
        const maskSource = this.add
          .text(cx, LOGO_Y + word.y, word.text, word.style)
          .setOrigin(0.5)
          .setLetterSpacing(word.letterSpacing)
          .setVisible(false);
        shine.setMask(maskSource.createBitmapMask());
        this.tweens.add({
          targets: shine,
          x: cx + 700,
          duration: 1400,
          delay: 1400 + (word === bottom ? 140 : 0),
          repeat: -1,
          repeatDelay: 3200,
          ease: 'Sine.InOut',
        });
      }
    }

    this.add
      .text(
        cx,
        LOGO_Y + 270,
        'FOUR LANES  ·  FIVE LANDS  ·  ONE CHAMPION',
        textStyle(34, { color: hex(COLORS.accent) }),
      )
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setDepth(3);

    // Call to action.
    const prompt = this.add
      .text(cx, GAME_HEIGHT - 430, 'TAP TO START', textStyle(58, { color: '#f4efe3' }))
      .setOrigin(0.5)
      .setLetterSpacing(10)
      .setDepth(3);
    const glow = this.add.graphics().setDepth(2);
    glow.fillStyle(COLORS.accent, 0.12);
    glow.fillRoundedRect(cx - 330, GAME_HEIGHT - 480, 660, 100, 50);
    glow.lineStyle(2, COLORS.accent, 0.7);
    glow.strokeRoundedRect(cx - 330, GAME_HEIGHT - 480, 660, 100, 50);
    if (!still)
      this.tweens.add({
        targets: [prompt, glow],
        alpha: 0.35,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });

    this.add
      .text(
        cx,
        GAME_HEIGHT - 70,
        `v${__APP_VERSION__}  ·  No ads. No purchases.`,
        textStyle(26, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0.5)
      .setDepth(3);

    const start = () => {
      audio.play('click');
      goToScene(this, SCENE_KEYS.MainMenu);
    };
    this.input.once(Phaser.Input.Events.POINTER_UP, start);
    this.input.keyboard?.once('keydown', start);
  }
}
