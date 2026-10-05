import Phaser from 'phaser';
import { CARD_TITLE_FONT, GAME_WIDTH } from '../../config/display';
import { Rng } from '../../engine/rng';
import { bakeRegion } from '../../art/frames';
import type { GameState, PlayerId, RulesContext, TargetRef } from '../../engine/types';
import { other } from '../../engine/types';
import { COLORS } from '../../ui/theme';
import { dur } from '../fx';
import { BOTTOM, LANE_W, LANE_X, TOKEN_H, TOKEN_W, TOP, type SideLayout } from '../layout';
import { BoardProjection, PLANE, type BoardViewMode } from '../projection';
import { CreatureToken } from './CreatureToken';
import { HandView, type HandCallbacks } from './HandView';
import { HeroPanel } from './HeroPanel';
import { LaneView } from './LaneView';
import { attachPress } from './press';

export interface BoardCallbacks extends HandCallbacks {
  onCreatureTap: (player: PlayerId, lane: number) => void;
  onCreatureLongPress: (player: PlayerId, lane: number) => void;
  onHeroTap: (player: PlayerId) => void;
  onHeroLongPress: (player: PlayerId) => void;
  onDeckTap: (player: PlayerId) => void;
  onLaneTap: (player: PlayerId, lane: number) => void;
  onBuildingTap: (player: PlayerId, lane: number) => void;
  onFloopTap: (lane: number) => void;
}

/** Field below the lanes: a grassy arena with a few bushes and mushrooms on the edges. */
function drawArena(g: Phaser.GameObjects.Graphics, proj: BoardProjection): void {
  g.clear();
  const top = 180;
  const bottom = 1175;
  const bands = 20;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x0f1f17),
      Phaser.Display.Color.ValueToColor(0x1f3d26),
      100,
      t * 100,
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, top + ((bottom - top) * i) / bands, GAME_WIDTH, (bottom - top) / bands + 1);
  }
  // A lighter worn circle in the middle of the arena.
  const centre = proj.project(GAME_WIDTH / 2, PLANE.mid);
  g.fillStyle(0xbfd8ff, 0.07);
  g.fillEllipse(centre.x, centre.y, 1000 * centre.s, 760 * (proj.mode === '3d' ? 0.7 : 1));
  // Edge decorations (seeded, so the arena always looks the same).
  const rng = new Rng('arena');
  for (let i = 0; i < 14; i++) {
    const left = i % 2 === 0;
    const y = top + 40 + rng.next() * (bottom - top - 80);
    const p = proj.project(left ? 0 : GAME_WIDTH, y);
    const margin = left ? p.x : GAME_WIDTH - p.x;
    if (margin < 50) continue;
    const x = left ? rng.next() * (margin - 30) + 15 : GAME_WIDTH - rng.next() * (margin - 30) - 15;
    const s = p.s * (0.7 + rng.next() * 0.5);
    if (rng.chance(0.6)) {
      g.fillStyle(0x0c1d12, 1);
      g.fillCircle(x - 16 * s, y, 22 * s);
      g.fillCircle(x + 16 * s, y, 22 * s);
      g.fillCircle(x, y - 14 * s, 26 * s);
      g.fillStyle(0x1a3a22, 1);
      g.fillCircle(x - 4 * s, y - 18 * s, 12 * s);
    } else {
      g.fillStyle(0xf4ecdd, 1);
      g.fillRect(x - 5 * s, y - 6 * s, 10 * s, 20 * s);
      g.fillStyle(0x7a2a3a, 1);
      g.fillEllipse(x, y - 8 * s, 40 * s, 22 * s);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(x - 8 * s, y - 11 * s, 3 * s);
      g.fillCircle(x + 7 * s, y - 9 * s, 3 * s);
    }
  }
}

/**
 * The whole board from one player's point of view (viewer at the bottom).
 * Positions live on the board plane and go through a 2D or 3D projection.
 * `sync` reconciles every view with the authoritative state; the animator
 * moves things in between, and the next sync fixes any difference.
 */
export class BoardView {
  viewer: PlayerId = 0;
  readonly hand: HandView;
  private proj: BoardProjection;
  private readonly arena: Phaser.GameObjects.Image;
  private readonly divider: Phaser.GameObjects.Graphics;
  private readonly heroes: [HeroPanel, HeroPanel];
  private readonly lanes: [LaneView[], LaneView[]];
  private readonly tokens = new Map<string, CreatureToken>();
  private readonly markers: Phaser.GameObjects.GameObject[] = [];
  private readonly floops: Phaser.GameObjects.Container;
  private lastState: GameState;
  interactive = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: RulesContext,
    state: GameState,
    names: [string, string],
    private readonly cb: BoardCallbacks,
    mode: BoardViewMode = '3d',
  ) {
    this.proj = new BoardProjection(mode);
    this.lastState = state;
    this.arena = scene.add.image(0, 0, '__DEFAULT').setDepth(0);
    this.divider = scene.add.graphics().setDepth(4);

    // Taps on empty lane space: hit-tested through the projection.
    const zone = scene.add
      .zone(GAME_WIDTH / 2, (PLANE.top + PLANE.bottom) / 2, GAME_WIDTH, PLANE.bottom - PLANE.top)
      .setInteractive()
      .setDepth(2);
    attachPress(
      zone,
      () => {
        const p = scene.input.activePointer;
        const hit = this.laneAtScreen(p.x, p.y);
        if (hit) cb.onLaneTap(hit.player, hit.lane);
      },
      () => {
        const p = scene.input.activePointer;
        const hit = this.laneAtScreen(p.x, p.y);
        if (hit && this.lanes[hit.player][hit.lane]!.buildingCardId()) cb.onBuildingTap(hit.player, hit.lane);
      },
      () => this.interactive,
    );

    const heroDef = (p: PlayerId) => ctx.heroes.byId.get(state.players[p].heroId)!;
    this.heroes = [
      new HeroPanel(scene, 0, heroDef(0), names[0], true),
      new HeroPanel(scene, 0, heroDef(1), names[1], true),
    ];
    this.lanes = [[], []];
    for (const p of [0, 1] as const) {
      const panel = this.heroes[p].setDepth(20);
      panel.portrait.setInteractive({ useHandCursor: true });
      attachPress(
        panel.portrait,
        () => cb.onHeroTap(p),
        () => cb.onHeroLongPress(p),
        () => this.interactive,
      );
      panel.deckIcon.setInteractive({ useHandCursor: true });
      attachPress(
        panel.deckIcon,
        () => cb.onDeckTap(p),
        () => undefined,
        () => this.interactive,
      );
      for (let lane = 0; lane < LANE_X.length; lane++) {
        const lv = new LaneView(scene, lane, () => {
          if (this.interactive) cb.onBuildingTap(p, lane);
        }).setDepth(3);
        this.lanes[p].push(lv);
      }
    }
    this.floops = scene.add.container(0, 0).setDepth(120);
    this.hand = new HandView(scene, ctx, cb);
    this.layoutAll();
  }

  get viewMode(): BoardViewMode {
    return this.proj.mode;
  }

  /** Switches between the flat and the perspective board, keeping everything in place. */
  setViewMode(mode: BoardViewMode): void {
    if (mode === this.proj.mode) return;
    this.proj = new BoardProjection(mode);
    this.layoutAll();
    this.sync(this.lastState);
  }

  side(player: PlayerId): SideLayout {
    return player === this.viewer ? BOTTOM : TOP;
  }

  setViewer(viewer: PlayerId): void {
    this.viewer = viewer;
    this.layoutAll();
    for (const t of this.tokens.values()) t.destroy();
    this.tokens.clear();
    this.hand.destroyAll();
  }

  private layoutAll(): void {
    bakeRegion(
      this.scene,
      `arena-${this.proj.mode}`,
      { x0: 0, y0: 170, x1: GAME_WIDTH, y1: 1185 },
      (g) => drawArena(g, this.proj),
      this.arena,
    );
    const d = this.divider;
    d.clear();
    d.lineStyle(6, 0xffffff, 0.35);
    const a = this.proj.project(LANE_X[0]! - LANE_W / 2, PLANE.mid);
    const b = this.proj.project(LANE_X[LANE_X.length - 1]! + LANE_W / 2, PLANE.mid);
    d.lineBetween(a.x, a.y, b.x, b.y);
    for (const p of [0, 1] as const) {
      const s = this.side(p);
      this.heroes[p].setY(s.heroY);
      this.lanes[p].forEach((lv) => lv.layout(this.proj, s, p !== this.viewer));
    }
    this.clearFloopButtons();
  }

  // -------------------------------------------------------------------------
  // Positions
  // -------------------------------------------------------------------------

  creaturePos(player: PlayerId, lane: number): { x: number; y: number } {
    const p = this.proj.project(LANE_X[lane]!, this.side(player).creatureY);
    return { x: p.x, y: p.y };
  }

  /** Perspective scale at a creature's spot (1 in 2D). */
  creatureScale(player: PlayerId, lane: number): number {
    return this.proj.project(LANE_X[lane]!, this.side(player).creatureY).s;
  }

  tilePos(player: PlayerId, lane: number): { x: number; y: number } {
    const s = this.side(player);
    const p = this.proj.project(LANE_X[lane]!, (s.bandTop + s.bandBottom) / 2);
    return { x: p.x, y: p.y };
  }

  heroPos(player: PlayerId): { x: number; y: number } {
    return this.heroes[player].heroPoint();
  }

  deckPos(player: PlayerId): { x: number; y: number } {
    const d = this.heroes[player].deckIcon;
    return { x: d.x, y: this.heroes[player].y };
  }

  targetPos(t: TargetRef): { x: number; y: number } {
    if (t.kind === 'hero') return this.heroPos(t.player);
    if (t.kind === 'landscape' || t.kind === 'building') return this.tilePos(t.player, t.lane);
    return this.creaturePos(t.player, t.lane);
  }

  heroPanel(player: PlayerId): HeroPanel {
    return this.heroes[player];
  }

  laneView(player: PlayerId, lane: number): LaneView {
    return this.lanes[player][lane]!;
  }

  /** Player side and lane under a screen point, or null. */
  laneAtScreen(x: number, y: number): { player: PlayerId; lane: number } | null {
    if (y < PLANE.top - 20 || y > PLANE.bottom + 20) return null;
    const { px, py } = this.proj.unproject(x, y);
    for (let i = 0; i < LANE_X.length; i++) {
      if (Math.abs(px - LANE_X[i]!) <= LANE_W / 2 + 7) {
        return { player: py >= PLANE.mid ? this.viewer : other(this.viewer), lane: i };
      }
    }
    return null;
  }

  /** Lane (0..3) of the viewer's side under a screen point, or null. */
  viewerLaneAt(x: number, y: number): number | null {
    const hit = this.laneAtScreen(x, y);
    return hit && hit.player === this.viewer ? hit.lane : null;
  }

  isOverBoard(y: number): boolean {
    return y > PLANE.top && y < PLANE.bottom;
  }

  // -------------------------------------------------------------------------
  // Tokens
  // -------------------------------------------------------------------------

  tokenByIid(iid: string): CreatureToken | undefined {
    return this.tokens.get(iid);
  }

  spawnToken(player: PlayerId, lane: number, cardId: string, iid: string): CreatureToken | null {
    const card = this.ctx.cards.byId.get(cardId);
    if (!card) return null;
    this.tokens.get(iid)?.destroy();
    const pos = this.creaturePos(player, lane);
    const t = new CreatureToken(this.scene, pos.x, pos.y, card, iid);
    t.baseScale = this.creatureScale(player, lane);
    t.setScale(t.baseScale).setDepth(this.tokenDepth(player));
    t.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, -TOKEN_H * 0.55, TOKEN_W, TOKEN_H),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    attachPress(
      t,
      () => {
        const at = this.findToken(iid);
        if (at) this.cb.onCreatureTap(at.player, at.lane);
      },
      () => {
        const at = this.findToken(iid);
        if (at) this.cb.onCreatureLongPress(at.player, at.lane);
      },
      () => this.interactive,
    );
    t.setData('owner', player);
    t.setData('lane', lane);
    this.tokens.set(iid, t);
    return t;
  }

  /** Near creatures draw over far ones. */
  private tokenDepth(player: PlayerId): number {
    return player === this.viewer ? 110 : 100;
  }

  private findToken(iid: string): { player: PlayerId; lane: number } | null {
    const t = this.tokens.get(iid);
    if (!t) return null;
    return { player: t.getData('owner') as PlayerId, lane: t.getData('lane') as number };
  }

  removeToken(iid: string): void {
    this.tokens.get(iid)?.destroy();
    this.tokens.delete(iid);
  }

  setTokenLane(iid: string, lane: number): void {
    this.tokens.get(iid)?.setData('lane', lane);
  }

  // -------------------------------------------------------------------------
  // Sync
  // -------------------------------------------------------------------------

  /** Reconciles every view with `state` (instantly; animations happen before). */
  sync(state: GameState): void {
    this.lastState = state;
    const seen = new Set<string>();
    for (const p of [0, 1] as const) {
      const ps = state.players[p];
      this.heroes[p].refresh(ps, this.ctx, p !== this.viewer);
      ps.lanes.forEach((lane, i) => {
        this.lanes[p][i]!.refresh(lane, this.ctx);
        const c = lane.creature;
        if (!c) return;
        seen.add(c.iid);
        let token = this.tokens.get(c.iid);
        if (!token) token = this.spawnToken(p, i, c.cardId, c.iid) ?? undefined;
        if (!token) return;
        token.setData('lane', i).setData('owner', p);
        const pos = this.creaturePos(p, i);
        token.baseScale = this.creatureScale(p, i);
        this.scene.tweens.killTweensOf(token);
        token.setPosition(pos.x, pos.y).setScale(token.baseScale).setAngle(0).setDepth(this.tokenDepth(p));
        token.refresh(state, this.ctx, c, i);
      });
    }
    for (const iid of [...this.tokens.keys()]) if (!seen.has(iid)) this.removeToken(iid);
    this.hand.sync(state.players[this.viewer].hand);
  }

  // -------------------------------------------------------------------------
  // Floop buttons
  // -------------------------------------------------------------------------

  /** Green FLOOP buttons on the viewer's lanes whose creature can floop right now. */
  setFloopButtons(lanes: readonly number[]): void {
    this.clearFloopButtons();
    for (const lane of lanes) {
      const p = this.proj.project(LANE_X[lane]!, this.side(this.viewer).floopY);
      const c = this.scene.add.container(p.x, p.y).setScale(p.s);
      const g = this.scene.add.graphics();
      g.fillStyle(0x0c3a1a, 1);
      g.fillRoundedRect(-82, -26, 164, 56, 28);
      g.fillStyle(0x2fae4b, 1);
      g.fillRoundedRect(-78, -24, 156, 48, 24);
      g.fillStyle(0xffffff, 0.25);
      g.fillRoundedRect(-70, -20, 140, 16, 8);
      const t = this.scene.add
        .text(0, 1, 'FLOOP', {
          fontFamily: CARD_TITLE_FONT,
          fontSize: '28px',
          fontStyle: '700',
          color: '#ffffff',
          stroke: '#0c3a1a',
          strokeThickness: 5,
          resolution: 2,
        })
        .setOrigin(0.5);
      c.add([g, t]);
      c.setSize(164, 56).setInteractive({ useHandCursor: true });
      c.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        if (this.interactive) this.cb.onFloopTap(lane);
      });
      if (dur(500) > 0)
        this.scene.tweens.add({ targets: c, scale: p.s * 1.06, duration: 500, yoyo: true, repeat: -1 });
      this.floops.add(c);
    }
  }

  clearFloopButtons(): void {
    for (const c of this.floops.list) this.scene.tweens.killTweensOf(c);
    this.floops.removeAll(true);
  }

  // -------------------------------------------------------------------------
  // Highlights & target markers
  // -------------------------------------------------------------------------

  highlightViewerLanes(lanes: readonly number[]): void {
    this.lanes[this.viewer].forEach((lv, i) => lv.setHighlight(lanes.includes(i)));
  }

  clearLaneHighlights(): void {
    for (const side of this.lanes) for (const lv of side) lv.setHighlight(false);
  }

  /** Shows pulsing, tappable markers over each target. */
  showTargetMarkers(targets: readonly TargetRef[], onPick: (t: TargetRef) => void): void {
    this.clearTargetMarkers();
    for (const t of targets) {
      const pos = this.targetPos(t);
      const s = t.kind === 'hero' ? 1 : this.proj.project(LANE_X[t.lane]!, this.side(t.player).creatureY).s;
      const tile = t.kind === 'landscape' || t.kind === 'building';
      const w = (t.kind === 'creature' ? TOKEN_W + 10 : tile ? LANE_W - 10 : 170) * s;
      const h = (t.kind === 'creature' ? TOKEN_H + 20 : tile ? 200 : 170) * s;
      const cy = t.kind === 'creature' ? pos.y - 40 * s : pos.y;
      const g = this.scene.add.graphics().setDepth(400);
      const color = t.player === this.viewer ? 0x6dff8a : 0xff5f6d;
      g.lineStyle(10, color, 1);
      g.strokeRoundedRect(pos.x - w / 2, cy - h / 2, w, h, 24);
      g.fillStyle(color, 0.18);
      g.fillRoundedRect(pos.x - w / 2, cy - h / 2, w, h, 24);
      if (dur(600) > 0)
        this.scene.tweens.add({
          targets: g,
          alpha: { from: 1, to: 0.45 },
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
      const zone = this.scene.add.zone(pos.x, cy, w, h).setInteractive({ useHandCursor: true }).setDepth(401);
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => onPick(t));
      this.markers.push(g, zone);
    }
  }

  clearTargetMarkers(): void {
    for (const m of this.markers) m.destroy();
    this.markers.length = 0;
  }

  /** A soft glow over the whole board while a spell is being dragged. */
  showBoardGlow(on: boolean): void {
    const key = '__boardGlow';
    const existing = this.scene.children.getByName(key);
    existing?.destroy();
    if (!on) return;
    const g = this.scene.add.graphics().setName(key).setDepth(50);
    g.lineStyle(10, COLORS.accent, 0.8);
    g.strokePoints(this.proj.quad(12, PLANE.top, GAME_WIDTH - 12, PLANE.bottom), true, true);
  }

  opponentOf(player: PlayerId): PlayerId {
    return other(player);
  }
}
