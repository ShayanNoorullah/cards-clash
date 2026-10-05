import Phaser from 'phaser';
import { COLORS } from './theme';

/** Horizontal 0..1 slider: drag the knob or tap the track. Calls onChange while moving. */
export class Slider extends Phaser.GameObjects.Container {
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly knob: Phaser.GameObjects.Graphics;
  private value: number;
  private dragging = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly trackW: number,
    initial: number,
    private readonly onChange: (v: number) => void,
    private readonly onRelease: (v: number) => void = () => undefined,
  ) {
    super(scene, x, y);
    this.value = Phaser.Math.Clamp(initial, 0, 1);
    this.track = scene.add.graphics();
    this.knob = scene.add.graphics();
    this.add([this.track, this.knob]);
    this.setSize(trackW + 60, 80).setInteractive({ useHandCursor: true });
    const fromPointer = (p: Phaser.Input.Pointer) => {
      const local = p.x - (this.x - trackW / 2);
      this.setValue(local / trackW, true);
    };
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      fromPointer(p);
    });
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.isDown) fromPointer(p);
    });
    scene.input.on(Phaser.Input.Events.POINTER_UP, () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.onRelease(this.value);
    });
    this.draw();
    scene.add.existing(this);
  }

  setValue(v: number, notify = false): void {
    const next = Math.round(Phaser.Math.Clamp(v, 0, 1) * 20) / 20;
    if (next === this.value) return;
    this.value = next;
    this.draw();
    if (notify) this.onChange(next);
  }

  private draw(): void {
    const w = this.trackW;
    const t = this.track;
    t.clear();
    t.fillStyle(COLORS.outline, 1);
    t.fillRoundedRect(-w / 2 - 4, -14, w + 8, 28, 14);
    t.fillStyle(0x3a3550, 1);
    t.fillRoundedRect(-w / 2, -10, w, 20, 10);
    t.fillStyle(COLORS.primary, 1);
    t.fillRoundedRect(-w / 2, -10, Math.max(20, w * this.value), 20, 10);
    const k = this.knob;
    k.clear();
    const kx = -w / 2 + w * this.value;
    k.fillStyle(COLORS.outline, 1);
    k.fillCircle(kx, 0, 30);
    k.fillStyle(0xffffff, 1);
    k.fillCircle(kx, 0, 24);
    k.fillStyle(COLORS.accent, 1);
    k.fillCircle(kx, 0, 12);
  }
}
