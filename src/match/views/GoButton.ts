import Phaser from 'phaser';
import { bakeRegion } from '../../art/frames';
import { CARD_TITLE_FONT } from '../../config/display';
import { audio } from '../../services/audio';
import { dur } from '../fx';

/** The big round "GO" button that ends the turn (greyed out while it can't be used). */
export class GoButton extends Phaser.GameObjects.Container {
  /** Baked per state: a Graphics would be re-tessellated every frame. */
  private readonly disc: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly caption: Phaser.GameObjects.Text;
  private enabled = true;
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly radius: number,
    onClick: () => void,
  ) {
    super(scene, x, y);
    this.disc = scene.add.image(0, 0, '__DEFAULT');
    this.label = scene.add
      .text(0, -8, 'GO', {
        fontFamily: CARD_TITLE_FONT,
        fontSize: `${Math.round(radius * 0.72)}px`,
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#0c3a1a',
        strokeThickness: 8,
        resolution: 2,
      })
      .setOrigin(0.5);
    this.caption = scene.add
      .text(0, radius * 0.48, 'END TURN', {
        fontFamily: CARD_TITLE_FONT,
        fontSize: `${Math.round(radius * 0.2)}px`,
        fontStyle: '600',
        color: '#e6ffe0',
        resolution: 2,
      })
      .setOrigin(0.5);
    this.add([this.disc, this.label, this.caption]);
    this.setSize(radius * 2, radius * 2).setInteractive({
      hitArea: new Phaser.Geom.Circle(radius, radius, radius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true,
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (this.enabled) this.draw(true);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.draw(false));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.draw(false);
      if (this.enabled) {
        audio.play('click');
        onClick();
      }
    });
    this.draw(false);
    scene.add.existing(this);
  }

  private draw(pressed: boolean): void {
    const r = this.radius;
    const on = this.enabled;
    bakeRegion(
      this.scene,
      `go-${r}-${on ? 1 : 0}-${pressed ? 1 : 0}`,
      { x0: -r - 2, y0: -r - 2, x1: r + 2, y1: r + 10 },
      (g) => this.paint(g, on, pressed),
      this.disc,
    );
    this.label.setY(-8 + (pressed ? 4 : 0)).setAlpha(on ? 1 : 0.6);
    this.caption.setAlpha(on ? 1 : 0.5);
  }

  private paint(g: Phaser.GameObjects.Graphics, on: boolean, pressed: boolean): void {
    const r = this.radius;
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(0, 8, r);
    g.fillStyle(on ? 0xc99a2e : 0x55506a, 1);
    g.fillCircle(0, pressed ? 4 : 0, r);
    g.fillStyle(on ? 0x0c3a1a : 0x2a2738, 1);
    g.fillCircle(0, pressed ? 4 : 0, r * 0.86);
    g.fillStyle(on ? 0x2fae4b : 0x5b5a70, 1);
    g.fillCircle(0, pressed ? 4 : 0, r * 0.8);
    g.fillStyle(0xffffff, on ? 0.28 : 0.12);
    g.fillEllipse(0, (pressed ? 4 : 0) - r * 0.38, r * 1.1, r * 0.5);
  }

  setEnabled(on: boolean): this {
    if (on === this.enabled) return this;
    this.enabled = on;
    this.draw(false);
    this.pulse?.stop();
    this.pulse = null;
    this.setScale(1);
    if (on && this.scene && dur(700) > 0)
      this.pulse = this.scene.tweens.add({
        targets: this,
        scale: 1.05,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    return this;
  }
}
