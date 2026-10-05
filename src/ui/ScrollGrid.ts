import Phaser from 'phaser';

export interface GridItem {
  /** Builds the cell's display object centered at (x, y) when it scrolls into view. */
  build: (scene: Phaser.Scene, x: number, y: number) => Phaser.GameObjects.Container;
  onTap?: () => void;
  onLongPress?: () => void;
}

export interface ScrollGridOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  cols: number;
  cellHeight: number;
}

const TAP_SLOP = 14;
const LONG_PRESS_MS = 450;

/**
 * A vertically scrolling, virtualized grid: only rows near the viewport exist,
 * so hundreds of cards stay cheap on budget phones. Drag, fling and mouse wheel
 * scroll; tap and long-press are forwarded to items.
 */
export class ScrollGrid {
  private readonly content: Phaser.GameObjects.Container;
  private items: GridItem[] = [];
  private readonly rows = new Map<number, Phaser.GameObjects.Container[]>();
  private scrollY = 0;
  private velocity = 0;
  private press: {
    startY: number;
    startScroll: number;
    lastY: number;
    lastT: number;
    moved: boolean;
    long: boolean;
    timer: Phaser.Time.TimerEvent;
  } | null = null;
  enabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly o: ScrollGridOptions,
  ) {
    this.content = scene.add.container(0, 0);
    const mask = scene.make.graphics({}, false);
    mask.fillRect(o.x, o.y, o.width, o.height);
    this.content.setMask(mask.createGeometryMask());

    const inside = (p: Phaser.Input.Pointer) =>
      p.x >= o.x && p.x <= o.x + o.width && p.y >= o.y && p.y <= o.y + o.height;
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (!this.enabled || !inside(p)) return;
      // Cells are not interactive, so anything interactive under the pointer
      // (an overlay, a button, a header) takes the press instead of the grid.
      if (scene.input.hitTestPointer(p).length > 0) return;
      this.velocity = 0;
      const timer = scene.time.delayedCall(LONG_PRESS_MS, () => {
        if (this.press && !this.press.moved) {
          this.press.long = true;
          this.itemAt(p.x, this.press.startY)?.onLongPress?.();
        }
      });
      this.press = {
        startY: p.y,
        startScroll: this.scrollY,
        lastY: p.y,
        lastT: p.event.timeStamp,
        moved: false,
        long: false,
        timer,
      };
    });
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const d = this.press;
      if (!d || !p.isDown) return;
      if (Math.abs(p.y - d.startY) > TAP_SLOP) {
        d.moved = true;
        d.timer.remove();
      }
      const dt = Math.max(1, p.event.timeStamp - d.lastT);
      this.velocity = ((d.lastY - p.y) / dt) * 16;
      d.lastY = p.y;
      d.lastT = p.event.timeStamp;
      if (d.moved) this.setScroll(d.startScroll - (p.y - d.startY));
    });
    scene.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      const d = this.press;
      this.press = null;
      if (!d) return;
      d.timer.remove();
      if (d.moved || d.long || !this.enabled) return;
      this.velocity = 0;
      this.itemAt(p.x, p.y)?.onTap?.();
    });
    scene.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        if (this.enabled && inside(p)) this.setScroll(this.scrollY + dy);
      },
    );
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.tick, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.tick, this),
    );
  }

  private tick(): void {
    if (!this.press && Math.abs(this.velocity) > 0.3) {
      this.setScroll(this.scrollY + this.velocity);
      this.velocity *= 0.93;
    }
  }

  private get cellWidth(): number {
    return this.o.width / this.o.cols;
  }

  private get maxScroll(): number {
    const rows = Math.ceil(this.items.length / this.o.cols);
    return Math.max(0, rows * this.o.cellHeight - this.o.height + 20);
  }

  /** Replaces the items; `keepScroll` keeps the position (e.g. after a refresh). */
  setItems(items: GridItem[], keepScroll = false): void {
    for (const objs of this.rows.values()) for (const obj of objs) obj.destroy();
    this.rows.clear();
    this.items = items;
    if (!keepScroll) {
      this.scrollY = 0;
      this.velocity = 0;
    }
    this.setScroll(this.scrollY);
  }

  get count(): number {
    return this.items.length;
  }

  setScroll(value: number): void {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.content.y = -this.scrollY;
    this.refreshRows();
  }

  private refreshRows(): void {
    const { cols, cellHeight, height, y: top, x: left } = this.o;
    const first = Math.max(0, Math.floor(this.scrollY / cellHeight) - 1);
    const last = Math.min(
      Math.ceil(this.items.length / cols) - 1,
      Math.floor((this.scrollY + height) / cellHeight) + 1,
    );
    for (const [row, objs] of this.rows) {
      if (row < first || row > last) {
        for (const obj of objs) obj.destroy();
        this.rows.delete(row);
      }
    }
    for (let row = first; row <= last; row++) {
      if (this.rows.has(row)) continue;
      const objs: Phaser.GameObjects.Container[] = [];
      for (let col = 0; col < cols; col++) {
        const item = this.items[row * cols + col];
        if (!item) continue;
        const obj = item.build(
          this.scene,
          left + this.cellWidth * (col + 0.5),
          top + row * cellHeight + cellHeight / 2,
        );
        this.content.add(obj);
        objs.push(obj);
      }
      this.rows.set(row, objs);
    }
  }

  private itemAt(x: number, y: number): GridItem | undefined {
    const { x: left, y: top, width, height, cols, cellHeight } = this.o;
    if (x < left || x > left + width || y < top || y > top + height) return undefined;
    const row = Math.floor((y - top + this.scrollY) / cellHeight);
    const col = Math.floor((x - left) / this.cellWidth);
    return this.items[row * cols + col];
  }

  setDepth(depth: number): this {
    this.content.setDepth(depth);
    return this;
  }
}
