import Phaser from 'phaser';
import { COLORS, hex, textStyle } from './theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** Optional fill color when not selected (e.g. a landscape color). */
  color?: number;
}

/**
 * A row of selectable chips (filters, tabs). Exactly one is selected.
 * Wraps onto extra rows when it doesn't fit `maxWidth`.
 */
export class Chips<T extends string> extends Phaser.GameObjects.Container {
  private selected: T;
  private readonly chips: {
    value: T;
    bg: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    w: number;
    h: number;
    color?: number;
  }[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: ChipOption<T>[],
    selected: T,
    private readonly onChange: (value: T) => void,
    opts: { maxWidth?: number; height?: number; fontSize?: number } = {},
  ) {
    super(scene, x, y);
    this.selected = selected;
    const h = opts.height ?? 60;
    const fontSize = opts.fontSize ?? 26;
    const maxWidth = opts.maxWidth ?? 1040;
    const gap = 10;
    // Measure and lay out in rows, each row centered on x.
    const measured = options.map((o) => {
      const text = scene.add.text(0, 0, o.label, textStyle(fontSize, { strokeThickness: 4 })).setOrigin(0.5);
      return { o, text, w: Math.max(90, text.width + 36) };
    });
    const rows: (typeof measured)[] = [[]];
    let rowW = 0;
    for (const m of measured) {
      if (rowW + m.w > maxWidth && rows[rows.length - 1]!.length > 0) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1]!.push(m);
      rowW += m.w + gap;
    }
    rows.forEach((row, r) => {
      const total = row.reduce((s, m) => s + m.w, 0) + gap * (row.length - 1);
      let cx = -total / 2;
      for (const m of row) {
        const bg = scene.add.graphics();
        const px = cx + m.w / 2;
        const py = r * (h + gap);
        bg.setPosition(px, py);
        m.text.setPosition(px, py);
        const zone = scene.add.zone(px, py, m.w, h).setInteractive({ useHandCursor: true });
        zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.select(m.o.value, true));
        this.add([bg, m.text, zone]);
        const chip: (typeof this.chips)[number] = { value: m.o.value, bg, text: m.text, w: m.w, h };
        if (m.o.color !== undefined) chip.color = m.o.color;
        this.chips.push(chip);
        cx += m.w + gap;
      }
    });
    this.redraw();
    scene.add.existing(this);
  }

  /** Total height of all chip rows. */
  get rowsHeight(): number {
    const ys = this.chips.map((c) => c.bg.y);
    return Math.max(...ys) - Math.min(...ys) + (this.chips[0]?.h ?? 0);
  }

  get value(): T {
    return this.selected;
  }

  select(value: T, notify = false): void {
    this.selected = value;
    this.redraw();
    if (notify) this.onChange(value);
  }

  private redraw(): void {
    for (const c of this.chips) {
      const active = c.value === this.selected;
      c.bg.clear();
      c.bg.fillStyle(COLORS.outline, 1);
      c.bg.fillRoundedRect(-c.w / 2 - 3, -c.h / 2 - 3, c.w + 6, c.h + 6, 18);
      c.bg.fillStyle(active ? COLORS.accent : (c.color ?? COLORS.panelLight), 1);
      c.bg.fillRoundedRect(-c.w / 2, -c.h / 2, c.w, c.h, 16);
      c.text.setColor(active ? hex(COLORS.outline) : '#ffffff');
      c.text.setStroke(active ? '#fff3c4' : hex(COLORS.outline), 4);
    }
  }
}
