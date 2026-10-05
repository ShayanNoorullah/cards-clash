import { audio, type SfxId } from '../services/audio';
import Phaser from 'phaser';
import { darken, lighten, mix } from '../art/color';
import { bake } from '../art/frames';
import { HEADING_FONT } from '../config/display';
import { COLORS, textStyle } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  shadowColor?: number;
  /** Click sound (default 'click'); null for silent buttons. */
  sound?: SfxId | null;
  /** Optional small caption under the label, e.g. "Coming in M6". */
  caption?: string;
  onClick: () => void;
}

/**
 * Chunky button: a metallic-edged plate with a darker 3D "lip", press-down
 * feedback and a hover scale. Works with mouse and touch.
 */
/** Characters outside the Basic Multilingual Plane (emoji). */
const SURROGATES = /[\uD800-\uDFFF]/;

export class Button extends Phaser.GameObjects.Container {
  /** The plate, baked once per size/colour/state (a Graphics is re-tessellated every frame). */
  private readonly face: Phaser.GameObjects.Image;
  private readonly content: Phaser.GameObjects.Container;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly btnW: number;
  private readonly btnH: number;
  private readonly color: number;
  private readonly shadowColor: number;
  private readonly lip: number;
  private pressed = false;
  private enabled = true;
  private letterSpacing = 0;
  /** The label, so the Android back button can find a screen's "Back" button. */
  readonly label: string;
  private readonly onPress: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, options: ButtonOptions) {
    super(scene, x, y);
    this.label = text;
    this.onPress = () => {
      if (options.sound !== null) audio.play(options.sound ?? 'click');
      options.onClick();
    };
    this.btnW = options.width ?? 640;
    this.btnH = options.height ?? 130;
    this.color = options.color ?? COLORS.primary;
    this.shadowColor = options.shadowColor ?? COLORS.primaryDark;
    this.lip = Math.max(3, Math.round(this.btnH * 0.06));

    this.face = scene.add.image(0, 0, '__DEFAULT');
    this.content = scene.add.container(0, 0);
    this.add([this.face, this.content]);

    const fontSize = options.fontSize ?? Math.round(this.btnH * 0.4);
    const labelY = options.caption ? -this.btnH * 0.1 : 0;
    this.labelText = scene.add
      .text(0, labelY, text, textStyle(fontSize, { fontFamily: HEADING_FONT, fontStyle: '600' }))
      .setOrigin(0.5);
    // Letter spacing draws one UTF-16 unit at a time, which splits emoji (the lock icon) into "??".
    this.letterSpacing = Math.max(0, Math.round(fontSize / 24));
    this.labelText.setLetterSpacing(SURROGATES.test(text) ? 0 : this.letterSpacing);
    this.content.add(this.labelText);
    if (options.caption) {
      this.content.add(
        scene.add
          .text(
            0,
            this.btnH * 0.24,
            options.caption,
            textStyle(Math.round(fontSize * 0.45), { strokeThickness: 3 }),
          )
          .setOrigin(0.5)
          .setAlpha(0.85),
      );
    }

    this.draw();
    this.setSize(this.btnW, this.btnH + this.lip);
    this.setInteractive({ useHandCursor: true });

    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      if (this.enabled) scene.tweens.add({ targets: this, scale: 1.04, duration: 90 });
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.setPressed(false);
      scene.tweens.add({ targets: this, scale: 1, duration: 90 });
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (this.enabled) this.setPressed(true);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.enabled || !this.pressed) return;
      this.setPressed(false);
      this.onPress();
    });

    scene.add.existing(this);
  }

  /** Activates the button as if tapped (ignored while disabled or hidden). */
  press(): boolean {
    if (!this.enabled || !this.visible || !this.active) return false;
    this.onPress();
    return true;
  }

  setLabel(text: string): this {
    this.labelText.setText(text).setLetterSpacing(SURROGATES.test(text) ? 0 : this.letterSpacing);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.5);
    return this;
  }

  private setPressed(pressed: boolean): void {
    if (this.pressed === pressed) return;
    this.pressed = pressed;
    this.content.y = pressed ? this.lip * 0.6 : 0;
    this.draw();
  }

  private draw(): void {
    const w = this.btnW;
    const h = this.btnH;
    const pad = 8;
    const tw = Math.ceil(w + pad * 2);
    const th = Math.ceil(h + this.lip + pad * 2 + 4);
    const key = `btn-${w}x${h}-${this.color}-${this.shadowColor}-${this.pressed ? 1 : 0}`;
    if (!this.scene.textures.exists(key)) {
      bake(this.scene, key, tw, th, (g) => {
        g.translateCanvas(w / 2 + pad, h / 2 + pad);
        this.paint(g);
      });
    }
    this.face.setTexture(key).setOrigin((w / 2 + pad) / tw, (h / 2 + pad) / th);
  }

  private paint(g: Phaser.GameObjects.Graphics): void {
    const r = Math.min(16, this.btnH / 4);
    const x = -this.btnW / 2;
    const y = -this.btnH / 2;
    const off = this.pressed ? this.lip * 0.7 : 0;
    const w = this.btnW;
    const h = this.btnH;
    // Drop shadow, dark rim and the lip under the plate.
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x - 2, y + 6, w + 4, h + this.lip + 2, r + 2);
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(x - 4, y - 4 + off, w + 8, h + this.lip + 8 - off, r + 3);
    g.fillStyle(darken(this.shadowColor, 0.2), 1);
    g.fillRoundedRect(x, y + off, w, h + this.lip - off, r);
    // Metallic edge.
    g.fillStyle(mix(lighten(this.color, 0.35), 0xe6c27a, 0.35), 1);
    g.fillRoundedRect(x, y + off, w, h, r);
    // Gradient plate (lighter at the top).
    const inset = 3;
    const bands = Math.max(16, Math.round(h / 4));
    const top = lighten(this.color, 0.1);
    const bottom = darken(this.color, 0.38);
    for (let i = 0; i < bands; i++) {
      const by = y + off + inset + ((h - inset * 2) * i) / bands;
      const bh = (h - inset * 2) / bands + 1;
      const rr =
        i === 0
          ? { tl: r - 2, tr: r - 2, bl: 0, br: 0 }
          : i === bands - 1
            ? { tl: 0, tr: 0, bl: r - 2, br: r - 2 }
            : 0;
      g.fillStyle(mix(top, bottom, i / (bands - 1)), 1);
      g.fillRoundedRect(x + inset, by, w - inset * 2, bh, rr);
    }
    // Glassy highlight and a fine top light line.
    g.fillStyle(0xffffff, 0.1);
    g.fillRoundedRect(x + inset + 2, y + off + inset + 2, w - inset * 2 - 4, h * 0.38, {
      tl: r - 3,
      tr: r - 3,
      bl: 6,
      br: 6,
    });
    g.lineStyle(1.5, 0xffffff, 0.35);
    g.lineBetween(x + r, y + off + inset + 1, x + w - r, y + off + inset + 1);
  }
}
