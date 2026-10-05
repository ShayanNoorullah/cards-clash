import { getSettings } from '../../services/settings';
import Phaser from 'phaser';
import { ART_KEYS, bakeRegion } from '../../art/frames';
import { darken, lighten } from '../../art/color';
import { PALETTE } from '../../art/palette';
import { CARD_TITLE_FONT } from '../../config/display';
import type { BuildingInPlay, Lane, RulesContext } from '../../engine/types';
import { LANE_W, LANE_X, type SideLayout } from '../layout';
import type { BoardProjection } from '../projection';

const FLIPPED = 0x5b5a70;

/**
 * One lane of one player: its half of the landscape strip (drawn through the
 * board projection), the building chip and the highlight. The container sits
 * at the building chip; the strip is drawn relative to it.
 */
export class LaneView extends Phaser.GameObjects.Container {
  /** The strip, baked to a texture (a Graphics would be re-tessellated every frame). */
  private readonly field: Phaser.GameObjects.Image;
  private readonly stamp: Phaser.GameObjects.Image;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly building: Phaser.GameObjects.Container;
  private shownKey = '';
  private buildingIid: string | null = null;
  private proj!: BoardProjection;
  private side!: SideLayout;
  private far = false;
  private lastLane: Lane | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly laneIndex: number,
    onBuildingTap: () => void,
  ) {
    super(scene, 0, 0);
    this.field = scene.add.image(0, 0, '__DEFAULT');
    this.stamp = scene.add.image(0, 0, ART_KEYS.landIcon('neutral')).setAlpha(0.32);
    this.highlight = scene.add.graphics().setVisible(false);
    this.building = scene.add.container(0, 0);
    this.building.setSize(124, 52).setInteractive({ useHandCursor: true });
    this.building.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onBuildingTap);
    this.add([this.field, this.stamp, this.highlight, this.building]);
    scene.add.existing(this);
  }

  /** Places the lane for a projection and side (call again when either changes). */
  layout(proj: BoardProjection, side: SideLayout, far: boolean): void {
    this.proj = proj;
    this.side = side;
    this.far = far;
    const chip = proj.project(LANE_X[this.laneIndex]!, side.buildingY);
    this.setPosition(chip.x, chip.y);
    this.building.setScale(chip.s);
    const mid = proj.project(LANE_X[this.laneIndex]!, (side.bandTop + side.bandBottom) / 2);
    this.stamp.setPosition(mid.x - chip.x, mid.y - chip.y).setScale(1.6 * mid.s);
    this.shownKey = '';
    if (this.lastLane) this.drawField(this.lastLane);
  }

  private bandPoints(inset = 0): { x: number; y: number }[] {
    const x = LANE_X[this.laneIndex]!;
    return this.proj
      .quad(
        x - LANE_W / 2 + inset,
        this.side.bandTop + inset,
        x + LANE_W / 2 - inset,
        this.side.bandBottom - inset,
      )
      .map((p) => ({ x: p.x - this.x, y: p.y - this.y }));
  }

  private drawField(lane: Lane): void {
    const flipped = lane.landscape === null || lane.flipped;
    const key = flipped ? 'flipped' : (lane.landscape ?? 'none');
    if (key === this.shownKey) return;
    this.shownKey = key;
    // Local bounds of the strip (with its shadow), and a texture key that
    // changes with everything the drawing depends on.
    const pts = this.bandPoints(-3);
    const bounds = {
      x0: Math.min(...pts.map((p) => p.x)) - 4,
      y0: Math.min(...pts.map((p) => p.y)) - 4,
      x1: Math.max(...pts.map((p) => p.x)) + 4,
      y1: Math.max(...pts.map((p) => p.y)) + 4,
    };
    const texKey = `lane-${this.proj.mode}-${this.laneIndex}-${this.far ? 'f' : 'n'}-${Math.round(this.side.bandTop)}-${key}`;
    bakeRegion(this.scene, texKey, bounds, (g) => this.paintField(g, lane, flipped), this.field);
    this.stamp
      .setTexture(ART_KEYS.landIcon(flipped ? 'neutral' : lane.landscape!))
      .setVisible(!flipped && getSettings().colorblindIcons);
  }

  private paintField(g: Phaser.GameObjects.Graphics, lane: Lane, flipped: boolean): void {
    const base = flipped ? FLIPPED : PALETTE[lane.landscape!].color;
    const color = darken(base, this.far ? 0.52 : 0.38);
    g.fillStyle(0x0b0820, 0.45);
    g.fillPoints(this.bandPoints(-3), true);
    g.fillStyle(color, 1);
    g.fillPoints(this.bandPoints(), true);
    // Mown-field stripes across the strip.
    const x = LANE_X[this.laneIndex]!;
    const rows = 8;
    const h = (this.side.bandBottom - this.side.bandTop) / rows;
    g.fillStyle(lighten(color, 0.12), 0.55);
    for (let i = 0; i < rows; i += 2) {
      const y0 = this.side.bandTop + i * h;
      g.fillPoints(
        this.proj
          .quad(x - LANE_W / 2 + 6, y0, x + LANE_W / 2 - 6, y0 + h, 3)
          .map((p) => ({ x: p.x - this.x, y: p.y - this.y })),
        true,
      );
    }
    if (flipped) {
      g.lineStyle(6, 0x2a2350, 0.5);
      const a = this.proj.project(x - LANE_W / 3, this.side.bandTop + 60);
      const b = this.proj.project(x + LANE_W / 3, this.side.bandBottom - 60);
      const c = this.proj.project(x + LANE_W / 3, this.side.bandTop + 60);
      const d = this.proj.project(x - LANE_W / 3, this.side.bandBottom - 60);
      g.lineBetween(a.x - this.x, a.y - this.y, b.x - this.x, b.y - this.y);
      g.lineBetween(c.x - this.x, c.y - this.y, d.x - this.x, d.y - this.y);
    }
  }

  refresh(lane: Lane, ctx: RulesContext): void {
    this.lastLane = lane;
    this.drawField(lane);
    this.setBuilding(lane.building, ctx);
  }

  private setBuilding(b: BuildingInPlay | null, ctx: RulesContext): void {
    if ((b?.iid ?? null) === this.buildingIid) return;
    this.buildingIid = b?.iid ?? null;
    this.building.removeAll(true);
    this.building.setData('cardId', b?.cardId ?? null);
    if (!b) return;
    const card = ctx.cards.byId.get(b.cardId);
    if (!card) return;
    const pal = PALETTE[card.landscape];
    const g = this.scene.add.graphics();
    g.fillStyle(0x0c0c0e, 1);
    g.fillRoundedRect(-62, -26, 124, 52, 10);
    g.fillStyle(pal.ink, 1);
    g.fillRoundedRect(-59, -23, 118, 46, 8);
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(-59, -23, 118, 10);
    const t = this.scene.add
      .text(0, 0, card.name.toUpperCase(), {
        fontFamily: CARD_TITLE_FONT,
        fontSize: '16px',
        fontStyle: '700',
        color: '#ffffff',
        align: 'center',
        resolution: 2,
        wordWrap: { width: 110, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
    if (t.height > 42) t.setScale(42 / t.height);
    this.building.add([g, t]);
  }

  buildingCardId(): string | null {
    return (this.building.getData('cardId') as string | null | undefined) ?? null;
  }

  setHighlight(on: boolean, color = 0x7dff8a): void {
    this.highlight.clear();
    this.highlight.setVisible(on);
    if (!on) return;
    this.highlight.fillStyle(color, 0.3);
    this.highlight.fillPoints(this.bandPoints(4), true);
    this.highlight.lineStyle(6, color, 1);
    this.highlight.strokePoints(this.bandPoints(4), true, true);
  }

  /** Flip animation: fade the strip out, swap it (via the next refresh), fade back in. */
  flipTween(onMid: () => void, duration: number): Promise<void> {
    return new Promise((resolve) => {
      if (duration <= 0) {
        onMid();
        resolve();
        return;
      }
      this.scene.tweens.add({
        targets: [this.field, this.stamp],
        alpha: 0.1,
        duration: duration / 2,
        onComplete: () => {
          onMid();
          this.scene.tweens.add({
            targets: this.field,
            alpha: 1,
            duration: duration / 2,
            onComplete: () => resolve(),
          });
          this.scene.tweens.add({ targets: this.stamp, alpha: 0.32, duration: duration / 2 });
        },
      });
    });
  }
}
