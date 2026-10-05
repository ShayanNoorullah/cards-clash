import Phaser from 'phaser';
import { CARD_H, CARD_W } from '../../art/cardLayout';
import { GAME_WIDTH } from '../../config/display';
import type { CardInstance, RulesContext } from '../../engine/types';
import { CardView } from '../../ui/CardView';
import { dur } from '../fx';
import { HAND_LIFT, HAND_SCALE, HAND_Y } from '../layout';

const LONG_PRESS_MS = 450;
const DRAG_SLOP = 18;

export interface HandCallbacks {
  onTap: (iid: string) => void;
  onLongPress: (iid: string) => void;
  onDragStart: (iid: string) => void;
  onDragMove: (iid: string, x: number, y: number) => void;
  /** Return true when the drop was accepted (the card will be removed by the next sync). */
  onDrop: (iid: string, x: number, y: number) => boolean;
}

interface Slot {
  iid: string;
  view: CardView;
  glow: Phaser.GameObjects.Graphics;
  holder: Phaser.GameObjects.Container;
  home: { x: number; y: number; angle: number };
}

/** The viewer's hand, fanned along the bottom of the screen. */
export class HandView {
  private readonly slots = new Map<string, Slot>();
  private order: string[] = [];
  private selected: string | null = null;
  private playable = new Set<string>();
  private press: {
    iid: string;
    startX: number;
    startY: number;
    dragging: boolean;
    longPressed: boolean;
    timer: Phaser.Time.TimerEvent;
  } | null = null;
  enabled = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: RulesContext,
    private readonly cb: HandCallbacks,
  ) {
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => this.onUp(p));
  }

  /** Makes the hand show exactly `cards` (in order), reusing existing views. */
  sync(cards: readonly CardInstance[]): void {
    const wanted = new Set(cards.map((c) => c.iid));
    for (const [iid, slot] of this.slots) {
      if (!wanted.has(iid)) {
        slot.holder.destroy();
        this.slots.delete(iid);
      }
    }
    for (const c of cards) {
      if (this.slots.has(c.iid)) continue;
      const card = this.ctx.cards.byId.get(c.cardId);
      if (!card) continue;
      const holder = this.scene.add.container(GAME_WIDTH + 200, HAND_Y).setDepth(300);
      const glow = this.scene.add.graphics();
      const view = new CardView(this.scene, 0, 0, card);
      holder.add([glow, view]);
      holder.setScale(HAND_SCALE);
      holder.setSize(CARD_W, CARD_H);
      holder.setInteractive({ useHandCursor: true });
      holder.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) =>
        this.onDown(c.iid, p),
      );
      // Mouse hover (desktop): lift and enlarge the card a little so it can be read.
      holder.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, (p: Phaser.Input.Pointer) => {
        const slot = this.slots.get(c.iid);
        if (!slot || p.wasTouch || this.press || !this.enabled || this.selected === c.iid) return;
        this.scene.tweens.killTweensOf(slot.holder);
        slot.holder.setDepth(380);
        this.scene.tweens.add({
          targets: slot.holder,
          y: slot.home.y - 70,
          angle: 0,
          scale: HAND_SCALE * 1.12,
          duration: dur(120),
        });
      });
      holder.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
        const slot = this.slots.get(c.iid);
        if (!slot || this.press?.dragging) return;
        this.layout(true);
      });
      this.slots.set(c.iid, { iid: c.iid, view, glow, holder, home: { x: 0, y: 0, angle: 0 } });
    }
    this.order = cards.map((c) => c.iid).filter((iid) => this.slots.has(iid));
    if (this.selected && !wanted.has(this.selected)) this.selected = null;
    this.layout(true);
  }

  setPlayable(iids: Iterable<string>): void {
    this.playable = new Set(iids);
    for (const s of this.slots.values()) this.drawGlow(s);
  }

  setSelected(iid: string | null): void {
    this.selected = iid;
    this.layout(true);
  }

  get selectedIid(): string | null {
    return this.selected;
  }

  /** Screen position of a card (for draw/play animations). */
  positionOf(iid: string): { x: number; y: number } | null {
    const s = this.slots.get(iid);
    return s ? { x: s.holder.x, y: s.holder.y } : null;
  }

  destroyAll(): void {
    for (const s of this.slots.values()) s.holder.destroy();
    this.slots.clear();
    this.order = [];
  }

  private drawGlow(s: Slot): void {
    s.glow.clear();
    if (!this.playable.has(s.iid)) {
      s.view.setAlpha(0.85);
      return;
    }
    s.view.setAlpha(1);
    s.glow.lineStyle(14, s.iid === this.selected ? 0xffd23f : 0x6dff8a, 0.95);
    s.glow.strokeRoundedRect(-CARD_W / 2 - 6, -CARD_H / 2 - 6, CARD_W + 12, CARD_H + 12, 26);
  }

  private layout(animate: boolean): void {
    const n = this.order.length;
    const spacing = n <= 1 ? 0 : Math.min(200, 860 / (n - 1));
    this.order.forEach((iid, i) => {
      const s = this.slots.get(iid)!;
      const off = i - (n - 1) / 2;
      const lifted = iid === this.selected;
      s.home = {
        x: GAME_WIDTH / 2 + off * spacing,
        y: HAND_Y + Math.abs(off) * Math.abs(off) * 6 - (lifted ? HAND_LIFT : 0),
        angle: lifted ? 0 : off * 3.5,
      };
      s.holder.setDepth(300 + i + (lifted ? 50 : 0));
      this.drawGlow(s);
      this.moveHome(s, animate);
    });
  }

  private moveHome(s: Slot, animate: boolean): void {
    const d = animate ? dur(220) : 0;
    this.scene.tweens.killTweensOf(s.holder);
    if (d <= 0) {
      s.holder.setPosition(s.home.x, s.home.y).setAngle(s.home.angle).setScale(HAND_SCALE);
      return;
    }
    this.scene.tweens.add({
      targets: s.holder,
      x: s.home.x,
      y: s.home.y,
      angle: s.home.angle,
      scale: HAND_SCALE,
      duration: d,
      ease: 'Cubic.Out',
    });
  }

  private onDown(iid: string, p: Phaser.Input.Pointer): void {
    if (!this.enabled || this.press) return;
    const timer = this.scene.time.delayedCall(LONG_PRESS_MS, () => {
      if (this.press && !this.press.dragging) {
        this.press.longPressed = true;
        this.cb.onLongPress(iid);
      }
    });
    this.press = { iid, startX: p.x, startY: p.y, dragging: false, longPressed: false, timer };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const pr = this.press;
    if (!pr || !p.isDown || pr.longPressed) return;
    const s = this.slots.get(pr.iid);
    if (!s) return;
    if (!pr.dragging && Phaser.Math.Distance.Between(p.x, p.y, pr.startX, pr.startY) > DRAG_SLOP) {
      if (!this.playable.has(pr.iid)) return;
      pr.dragging = true;
      pr.timer.remove();
      this.scene.tweens.killTweensOf(s.holder);
      s.holder
        .setDepth(900)
        .setAngle(0)
        .setScale(HAND_SCALE * 0.75);
      this.cb.onDragStart(pr.iid);
    }
    if (pr.dragging) {
      s.holder.setPosition(p.x, p.y - 60);
      this.cb.onDragMove(pr.iid, p.x, p.y);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const pr = this.press;
    this.press = null;
    if (!pr) return;
    pr.timer.remove();
    const s = this.slots.get(pr.iid);
    if (pr.dragging) {
      const accepted = this.cb.onDrop(pr.iid, p.x, p.y);
      if (!accepted && s) this.layout(true);
      return;
    }
    if (!pr.longPressed) this.cb.onTap(pr.iid);
  }
}
