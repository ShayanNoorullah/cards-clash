import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { CARD_H, CARD_W, TILE } from '../art/cardLayout';
import { ART_KEYS, CARD_BACK_STYLES, CARD_LANDSCAPES } from '../art/frames';
import { ICON_IDS, type IconId } from '../art/icons';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import { KEYWORD_INFO, STATUS_INFO, TRIGGER_INFO } from '../engine/keywords';
import type { CardDef, HeroDef } from '../engine/types';
import { Button } from '../ui/Button';
import { cardIcons, heroSummary, rarityLabel, requirementLabel } from '../ui/cardText';
import { CardView } from '../ui/CardView';
import { COLORS, hex, textStyle } from '../ui/theme';
import { fadeIn, goToScene } from '../ui/transitions';

type Tab = 'all' | CardDef['landscape'] | 'tokens' | 'heroes' | 'art';

interface TabDef {
  id: Tab;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'all', label: 'All' },
  { id: 'azure', label: 'Plains' },
  { id: 'golden', label: 'Corn' },
  { id: 'murk', label: 'Swamp' },
  { id: 'dune', label: 'Sand' },
  { id: 'candy', label: 'Nice' },
  { id: 'neutral', label: 'Rainbow' },
  { id: 'heroes', label: 'Heroes' },
  { id: 'art', label: 'Art' },
];

/** One grid cell: builds its display object when it scrolls into view. */
interface GridItem {
  build: (scene: Phaser.Scene, x: number, y: number) => Phaser.GameObjects.Container;
  onTap?: () => void;
}

const COLS = 2;
const CARD_SCALE = 1.52;
const CELL_W = GAME_WIDTH / COLS;
const CELL_H = CARD_H * CARD_SCALE + 34;
const GRID_TOP = 380;
const GRID_BOTTOM = GAME_HEIGHT - 20;
const TAP_SLOP = 14;

const TRIGGER_ICON_INFO: Partial<Record<IconId, { name: string; description: string }>> = {
  floop: {
    name: 'Floop',
    description:
      'Pay the MP cost and exhaust this creature to use its ability. It will not attack this turn.',
  },
  aura: {
    name: 'Aura / While in Play',
    description: 'An ongoing effect that lasts while this card is in play.',
  },
  spellPower: { name: 'Spell Power', description: 'Your spells deal extra damage while this is in play.' },
};

function iconInfo(id: IconId): { name: string; description: string } | undefined {
  return (
    KEYWORD_INFO.find((k) => k.id === id) ??
    STATUS_INFO.find((k) => k.id === id) ??
    TRIGGER_INFO.find((k) => k.id === id) ??
    TRIGGER_ICON_INFO[id]
  );
}

/** Scrollable, virtualized gallery of every card, hero and art asset. */
export class GalleryScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private items: GridItem[] = [];
  private rows = new Map<number, Phaser.GameObjects.Container[]>();
  private scrollY = 0;
  private velocity = 0;
  private dragging: {
    startY: number;
    startScroll: number;
    lastY: number;
    lastT: number;
    moved: boolean;
  } | null = null;
  private countText!: Phaser.GameObjects.Text;
  private tabButtons: { tab: Tab; bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }[] = [];
  private currentTab: Tab = 'all';
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(SCENE_KEYS.Gallery);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    this.rows = new Map();
    this.tabButtons = [];
    this.overlay = null;

    this.content = this.add.container(0, 0);
    const mask = this.make.graphics({}, false);
    mask.fillRect(0, GRID_TOP, GAME_WIDTH, GRID_BOTTOM - GRID_TOP);
    this.content.setMask(mask.createGeometryMask());

    // Header (drawn above the grid)
    const header = this.add.graphics().setDepth(10);
    header.fillStyle(COLORS.panel, 0.94);
    header.fillRect(0, 0, GAME_WIDTH, GRID_TOP - 6);
    this.add
      .text(GAME_WIDTH / 2, 70, 'Card Gallery', textStyle(72, { color: hex(COLORS.accent) }))
      .setOrigin(0.5)
      .setDepth(11);
    new Button(this, 110, 70, 'Back', {
      width: 170,
      height: 86,
      fontSize: 36,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    }).setDepth(11);
    this.countText = this.add
      .text(GAME_WIDTH / 2, 348, '', textStyle(30, { color: hex(COLORS.textDim) }))
      .setOrigin(0.5)
      .setDepth(11);
    this.buildTabs();

    // Input: drag / fling / wheel scrolling and taps.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.overlay || p.y < GRID_TOP) return;
      this.velocity = 0;
      this.dragging = {
        startY: p.y,
        startScroll: this.scrollY,
        lastY: p.y,
        lastT: p.event.timeStamp,
        moved: false,
      };
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const d = this.dragging;
      if (!d || !p.isDown) return;
      if (Math.abs(p.y - d.startY) > TAP_SLOP) d.moved = true;
      const dt = Math.max(1, p.event.timeStamp - d.lastT);
      this.velocity = ((d.lastY - p.y) / dt) * 16;
      d.lastY = p.y;
      d.lastT = p.event.timeStamp;
      this.setScroll(d.startScroll - (p.y - d.startY));
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (p: Phaser.Input.Pointer) => {
      const d = this.dragging;
      this.dragging = null;
      if (!d || d.moved) return;
      this.velocity = 0;
      this.handleTap(p.x, p.y);
    });
    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
        if (!this.overlay) this.setScroll(this.scrollY + dy);
      },
    );
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.overlay) this.closeOverlay();
      else goToScene(this, SCENE_KEYS.MainMenu);
    });

    this.selectTab('all');
  }

  override update(): void {
    if (!this.dragging && Math.abs(this.velocity) > 0.3) {
      this.setScroll(this.scrollY + this.velocity);
      this.velocity *= 0.93;
    }
  }

  // -------------------------------------------------------------------------
  // Tabs & items
  // -------------------------------------------------------------------------

  private buildTabs(): void {
    const perRow = 6;
    const w = 164;
    const h = 64;
    TABS.forEach((t, i) => {
      const row = Math.floor(i / perRow);
      const inRow = row === 0 ? perRow : TABS.length - perRow;
      const col = i % perRow;
      const x = GAME_WIDTH / 2 + (col - (inRow - 1) / 2) * (w + 10);
      const y = 170 + row * (h + 14);
      const bg = this.add.graphics().setDepth(11);
      const label = this.add
        .text(x, y, t.label, textStyle(28, { strokeThickness: 4 }))
        .setOrigin(0.5)
        .setDepth(12);
      const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(12);
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        if (!this.overlay) this.selectTab(t.id);
      });
      bg.setData('rect', { x: x - w / 2, y: y - h / 2, w, h });
      this.tabButtons.push({ tab: t.id, bg, label });
    });
  }

  private drawTabs(): void {
    for (const { tab, bg, label } of this.tabButtons) {
      const r = bg.getData('rect') as { x: number; y: number; w: number; h: number };
      const active = tab === this.currentTab;
      const pal = tab in PALETTE ? PALETTE[tab as CardDef['landscape']] : null;
      bg.clear();
      bg.fillStyle(COLORS.outline, 1);
      bg.fillRoundedRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 20);
      bg.fillStyle(active ? COLORS.accent : (pal?.dark ?? COLORS.panelLight), 1);
      bg.fillRoundedRect(r.x, r.y, r.w, r.h, 18);
      label.setColor(active ? hex(COLORS.outline) : '#ffffff');
      label.setStroke(active ? '#fff3c4' : hex(COLORS.outline), 4);
    }
  }

  private selectTab(tab: Tab): void {
    this.currentTab = tab;
    this.drawTabs();
    const { ctx } = getContent();
    const cards = ctx.cards.all;
    let items: GridItem[];
    let label: string;
    if (tab === 'heroes') {
      items = ctx.heroes.all.map((h) => this.heroItem(h));
      label = `${items.length} heroes`;
    } else if (tab === 'art') {
      items = this.artItems();
      label = 'Landscapes, card backs and ability icons';
    } else {
      const list =
        tab === 'all'
          ? cards.filter((c) => !c.token)
          : tab === 'tokens'
            ? cards.filter((c) => c.token)
            : cards.filter((c) => !c.token && c.landscape === tab);
      items = list.map((c) => this.cardItem(c));
      label = `${items.length} ${tab === 'tokens' ? 'tokens' : 'cards'}`;
    }
    this.countText.setText(label);
    this.setItems(items);
  }

  private cardItem(card: CardDef): GridItem {
    return {
      build: (scene, x, y) => {
        const c = scene.add.container(x, y);
        c.add(new CardView(scene, 0, 0, card).setScale(CARD_SCALE));
        return c;
      },
      onTap: () => this.inspectCard(card),
    };
  }

  private heroItem(hero: HeroDef): GridItem {
    return {
      build: (scene, x, y) => {
        const w = CARD_W * CARD_SCALE;
        const h = CARD_H * CARD_SCALE;
        const c = scene.add.container(x, y);
        const pal = PALETTE[hero.landscape];
        const g = scene.add.graphics();
        g.fillStyle(COLORS.outline, 1);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, 30);
        g.fillStyle(pal.dark, 1);
        g.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 26);
        c.add(g);
        c.add(ArtCache.heroImage(scene, 0, -h / 2 + 170, hero).setDisplaySize(280, 280));
        c.add(scene.add.text(0, -h / 2 + 340, hero.name, textStyle(40)).setOrigin(0.5));
        c.add(
          scene.add
            .text(0, -h / 2 + 386, hero.title, textStyle(24, { color: hex(pal.light), strokeThickness: 4 }))
            .setOrigin(0.5),
        );
        c.add(
          scene.add
            .text(0, -h / 2 + 420, heroSummary(hero), {
              fontFamily: FONT_FAMILY,
              fontSize: '24px',
              color: '#ffffff',
              align: 'center',
              resolution: 2,
              wordWrap: { width: w - 60, useAdvancedWrap: true },
            })
            .setOrigin(0.5, 0),
        );
        return c;
      },
    };
  }

  private artItems(): GridItem[] {
    const items: GridItem[] = [];
    const framed = (key: string, w: number, h: number, caption: string): GridItem => ({
      build: (scene, x, y) => {
        const c = scene.add.container(x, y);
        c.add(scene.add.image(0, -20, key).setDisplaySize(w, h));
        c.add(
          scene.add.text(0, h / 2 + 10, caption, textStyle(30, { strokeThickness: 5 })).setOrigin(0.5, 0),
        );
        return c;
      },
    });
    for (const l of CARD_LANDSCAPES) {
      items.push(framed(ART_KEYS.tile(l), TILE.w * 1.8, TILE.h * 1.8, `${PALETTE[l].name} tile`));
    }
    items.push(framed(ART_KEYS.tileFlipped, TILE.w * 1.8, TILE.h * 1.8, 'Flipped landscape'));
    for (const s of CARD_BACK_STYLES) {
      items.push(framed(ART_KEYS.cardBack(s), CARD_W * 1.2, CARD_H * 1.2, `Card back: ${s}`));
    }
    // Icon sheets: 6 icons per cell with names.
    for (let i = 0; i < ICON_IDS.length; i += 6) {
      const ids = ICON_IDS.slice(i, i + 6);
      items.push({
        build: (scene, x, y) => {
          const c = scene.add.container(x, y);
          ids.forEach((id, j) => {
            const yy = -CELL_H / 2 + 70 + j * 104;
            c.add(scene.add.image(-150, yy, ART_KEYS.icon(id)).setDisplaySize(84, 84));
            c.add(
              scene.add
                .text(-90, yy, iconInfo(id)?.name ?? id, textStyle(32, { strokeThickness: 5 }))
                .setOrigin(0, 0.5),
            );
          });
          return c;
        },
      });
    }
    return items;
  }

  // -------------------------------------------------------------------------
  // Virtualized grid
  // -------------------------------------------------------------------------

  private get maxScroll(): number {
    const rows = Math.ceil(this.items.length / COLS);
    return Math.max(0, rows * CELL_H - (GRID_BOTTOM - GRID_TOP) + 20);
  }

  private setItems(items: GridItem[]): void {
    for (const objs of this.rows.values()) for (const o of objs) o.destroy();
    this.rows.clear();
    this.items = items;
    this.scrollY = 0;
    this.velocity = 0;
    this.setScroll(0);
  }

  private setScroll(value: number): void {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.content.y = -this.scrollY;
    this.refreshRows();
  }

  private refreshRows(): void {
    const first = Math.max(0, Math.floor(this.scrollY / CELL_H) - 1);
    const last = Math.min(
      Math.ceil(this.items.length / COLS) - 1,
      Math.floor((this.scrollY + GRID_BOTTOM - GRID_TOP) / CELL_H) + 1,
    );
    for (const [row, objs] of this.rows) {
      if (row < first || row > last) {
        for (const o of objs) o.destroy();
        this.rows.delete(row);
      }
    }
    for (let row = first; row <= last; row++) {
      if (this.rows.has(row)) continue;
      const objs: Phaser.GameObjects.Container[] = [];
      for (let col = 0; col < COLS; col++) {
        const item = this.items[row * COLS + col];
        if (!item) continue;
        const obj = item.build(this, CELL_W * (col + 0.5), GRID_TOP + row * CELL_H + CELL_H / 2 + 6);
        this.content.add(obj);
        objs.push(obj);
      }
      this.rows.set(row, objs);
    }
  }

  private handleTap(x: number, y: number): void {
    if (y < GRID_TOP || y > GRID_BOTTOM) return;
    const row = Math.floor((y - GRID_TOP - 6 + this.scrollY) / CELL_H);
    const col = Math.floor(x / CELL_W);
    this.items[row * COLS + col]?.onTap?.();
  }

  // -------------------------------------------------------------------------
  // Inspect overlay
  // -------------------------------------------------------------------------

  private inspectCard(card: CardDef): void {
    const o = this.add.container(0, 0).setDepth(100);
    const dim = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setOrigin(0)
      .setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.closeOverlay());
    o.add(dim);

    const scale = 2.3;
    const view = new CardView(this, GAME_WIDTH / 2, 70 + (CARD_H * scale) / 2, card).setScale(scale);
    o.add(view);

    const lines: string[] = [`${rarityLabel(card)} · ${requirementLabel(card)}`, `“${card.flavorText}”`, ''];
    for (const id of cardIcons(card)) {
      const info = iconInfo(id);
      if (info) lines.push(`${info.name}: ${info.description}`);
    }
    const infoText = this.add
      .text(GAME_WIDTH / 2, 70 + CARD_H * scale + 30, lines.join('\n'), {
        fontFamily: FONT_FAMILY,
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
        resolution: 2,
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 120, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);
    if (infoText.height > GAME_HEIGHT - infoText.y - 90) infoText.setFontSize(26);
    o.add(infoText);
    o.add(
      this.add
        .text(
          GAME_WIDTH / 2,
          GAME_HEIGHT - 50,
          'Tap anywhere to close',
          textStyle(28, { color: hex(COLORS.textDim) }),
        )
        .setOrigin(0.5),
    );

    o.setAlpha(0);
    view.setScale(scale * 0.8);
    this.tweens.add({ targets: o, alpha: 1, duration: 140 });
    this.tweens.add({ targets: view, scale, duration: 180, ease: 'Back.Out' });
    this.overlay = o;
  }

  private closeOverlay(): void {
    const o = this.overlay;
    if (!o) return;
    this.overlay = null;
    // Stop the fading backdrop from swallowing taps meant for the tabs/grid.
    for (const child of o.list) (child as Phaser.GameObjects.Rectangle).disableInteractive?.();
    this.tweens.add({ targets: o, alpha: 0, duration: 120, onComplete: () => o.destroy() });
  }
}
