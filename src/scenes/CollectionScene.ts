import { audio } from '../services/audio';
import Phaser from 'phaser';
import { CARD_H, CARD_W } from '../art/cardLayout';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { getContent } from '../engine/content';
import { BALANCE, levelBonus } from '../engine/balance';
import { maxCopiesFor } from '../engine/deck';
import type { CardDef } from '../engine/types';
import { saves } from '../save';
import {
  cardLevel,
  craft,
  craftCost,
  levelUp,
  levelUpCost,
  ownedCount,
  scrap,
  scrapValue,
  spareCopies,
} from '../save/collection';
import { DEFAULT_FILTER, filterCards, type CardFilter } from '../save/filters';
import { Button } from '../ui/Button';
import { CardView } from '../ui/CardView';
import { Chips } from '../ui/Chips';
import { ScrollGrid } from '../ui/ScrollGrid';
import { addTextField } from '../ui/TextField';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';

const GRID_TOP = 500;

/** 'Lv3 bonus: +1/+1, abilities +1 · Lv4: +1/+2, abilities +1' */
function levelBonusText(card: CardDef, level: number): string {
  const describe = (lvl: number) => {
    const b = levelBonus(lvl);
    const stats = card.type === 'creature' ? `+${b.atk}/+${b.def}` : 'no stat bonus';
    return b.ability > 0 ? `${stats}, abilities +${b.ability}` : stats;
  };
  const now = `Lv${level} bonus: ${describe(level)}`;
  return level < BALANCE.cardLevels.length ? `${now}   ·   Lv${level + 1}: ${describe(level + 1)}` : now;
}

const CARD_SCALE = 1.02;

/** Owned / locked cards with filters, search, and level-up / craft / scrap. */
export class CollectionScene extends Phaser.Scene {
  private filter: CardFilter = { ...DEFAULT_FILTER };
  private grid!: ScrollGrid;
  private currencyText!: Phaser.GameObjects.Text;
  private countText!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Container | null = null;
  /** DOM inputs draw above the canvas, so they are hidden while an overlay is open. */
  private search!: Phaser.GameObjects.DOMElement;

  constructor() {
    super(SCENE_KEYS.Collection);
  }

  create(): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    this.overlay = null;
    this.filter = { ...DEFAULT_FILTER };

    this.grid = new ScrollGrid(this, {
      x: 0,
      y: GRID_TOP,
      width: GAME_WIDTH,
      height: GAME_HEIGHT - GRID_TOP,
      cols: 3,
      cellHeight: CARD_H * CARD_SCALE + 30,
    });

    const header = this.add.graphics().setDepth(10);
    header.fillStyle(COLORS.panel, 0.95);
    header.fillRect(0, 0, GAME_WIDTH, GRID_TOP - 8);
    const d = 11;
    this.add
      .text(GAME_WIDTH / 2, 66, 'Collection', textStyle(70, { color: hex(COLORS.accent) }))
      .setOrigin(0.5)
      .setDepth(d);
    new Button(this, 100, 66, 'Back', {
      width: 160,
      height: 80,
      fontSize: 34,
      color: COLORS.danger,
      shadowColor: COLORS.dangerDark,
      onClick: () => goToScene(this, SCENE_KEYS.MainMenu),
    }).setDepth(d);
    new Button(this, GAME_WIDTH - 110, 66, 'Art', {
      width: 170,
      height: 80,
      fontSize: 34,
      color: COLORS.secondary,
      shadowColor: COLORS.secondaryDark,
      onClick: () => goToScene(this, SCENE_KEYS.Gallery),
    }).setDepth(d);
    this.currencyText = this.add
      .text(GAME_WIDTH / 2, 140, '', textStyle(32, { color: '#fff3c4' }))
      .setOrigin(0.5)
      .setDepth(d);

    const landscapeChips = new Chips(
      this,
      GAME_WIDTH / 2,
      200,
      [
        { value: 'all', label: 'All' },
        ...(['azure', 'golden', 'murk', 'dune', 'candy', 'neutral'] as const).map((l) => ({
          value: l,
          label: PALETTE[l].name.split(' ')[0]!,
          color: PALETTE[l].dark,
        })),
      ],
      'all',
      (v) => this.setFilter({ landscape: v }),
      { fontSize: 24, height: 56 },
    ).setDepth(d);
    new Chips(
      this,
      GAME_WIDTH / 2,
      200 + landscapeChips.rowsHeight + 14,
      [
        { value: 'all', label: 'Any rarity' },
        { value: 'common', label: 'Common' },
        { value: 'uncommon', label: 'Uncommon' },
        { value: 'rare', label: 'Rare' },
        { value: 'epic', label: 'Epic' },
        { value: 'legendary', label: 'Legendary' },
      ],
      'all',
      (v) => this.setFilter({ rarity: v }),
      { fontSize: 24, height: 56 },
    ).setDepth(d);
    const y3 = 200 + landscapeChips.rowsHeight + 14 + 70;
    new Chips(
      this,
      260,
      y3 + 10,
      [
        { value: 'all', label: 'All' },
        { value: 'owned', label: 'Owned' },
        { value: 'missing', label: 'Missing' },
      ],
      'all',
      (v) => this.setFilter({ ownership: v }),
      { fontSize: 24, height: 56, maxWidth: 480 },
    ).setDepth(d);
    this.search = addTextField(this, 790, y3 + 10, {
      width: 500,
      height: 64,
      placeholder: 'Search cards…',
      fontSize: 30,
      onChange: (q) => this.setFilter({ query: q }),
    }).setDepth(d);
    this.countText = this.add
      .text(GAME_WIDTH / 2, GRID_TOP - 30, '', textStyle(26, { color: hex(COLORS.textDim) }))
      .setOrigin(0.5)
      .setDepth(d);

    this.refresh(false);
    this.input.keyboard?.on('keydown-ESC', () =>
      this.overlay ? this.closeDetail() : goToScene(this, SCENE_KEYS.MainMenu),
    );
  }

  private setFilter(patch: Partial<CardFilter>): void {
    this.filter = { ...this.filter, ...patch };
    this.refresh(false);
  }

  private refresh(keepScroll: boolean): void {
    const { ctx } = getContent();
    const save = saves().save;
    const c = save.currencies;
    this.currencyText.setText(`Coins ${c.coins}   ·   Gems ${c.gems}   ·   Dust ${c.dust}`);
    const cards = filterCards(ctx.cards.all, this.filter, save);
    const ownedTotal = ctx.cards.all.filter((x) => !x.token && ownedCount(save, x.id) > 0).length;
    const total = ctx.cards.all.filter((x) => !x.token).length;
    this.countText.setText(`${cards.length} shown · ${ownedTotal} / ${total} collected`);
    this.grid.setItems(
      cards.map((card) => ({
        build: (scene, x, y) => this.cell(scene, x, y, card),
        onTap: () => this.openDetail(card),
        onLongPress: () => this.openDetail(card),
      })),
      keepScroll,
    );
  }

  private cell(scene: Phaser.Scene, x: number, y: number, card: CardDef): Phaser.GameObjects.Container {
    const save = saves().save;
    const owned = ownedCount(save, card.id);
    const c = scene.add.container(x, y);
    c.add(new CardView(scene, 0, 0, card).setScale(CARD_SCALE));
    const h = (CARD_H * CARD_SCALE) / 2;
    if (owned === 0) {
      c.add(scene.add.rectangle(0, 0, CARD_W * CARD_SCALE, CARD_H * CARD_SCALE, 0x0b0820, 0.6));
      c.add(scene.add.text(0, 0, 'Not owned', textStyle(34, { color: '#d0c8f0' })).setOrigin(0.5));
      c.add(
        scene.add
          .text(0, 50, `Craft ${craftCost(card)} Dust`, textStyle(24, { color: '#fff3c4' }))
          .setOrigin(0.5),
      );
    } else {
      const g = scene.add.graphics();
      g.fillStyle(COLORS.outline, 0.92);
      g.fillRoundedRect(-80, h - 6, 160, 40, 14);
      c.add(g);
      c.add(
        scene.add
          .text(0, h + 14, `×${owned}  ·  Lv${cardLevel(save, card.id)}`, textStyle(24))
          .setOrigin(0.5),
      );
    }
    return c;
  }

  // -------------------------------------------------------------------------
  // Detail
  // -------------------------------------------------------------------------

  private openDetail(card: CardDef): void {
    this.closeDetail();
    const { ctx } = getContent();
    const save = saves().save;
    const o = this.add.container(0, 0).setDepth(100);
    this.overlay = o;
    this.grid.enabled = false;
    this.search.setVisible(false);
    const dim = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0820, 0.9)
      .setOrigin(0)
      .setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.closeDetail());
    o.add(dim);

    const scale = 1.95;
    o.add(new CardView(this, GAME_WIDTH / 2, 60 + (CARD_H * scale) / 2, card).setScale(scale));

    const owned = ownedCount(save, card.id);
    const level = cardLevel(save, card.id);
    const spare = spareCopies(save, card, ctx);
    const deckMax = maxCopiesFor(card.rarity, ctx.balance);
    const next = levelUpCost(level);
    const lines = [
      `Owned: ${owned}   ·   Level ${level}   ·   Spare copies: ${spare} (decks use up to ${deckMax})`,
      next
        ? `Level ${level + 1} needs ${next.copies} spare ${next.copies === 1 ? 'copy' : 'copies'} + ${next.coins} Coins`
        : 'Maximum level reached',
      `Dust: craft ${craftCost(card)} · scrap a spare copy for ${scrapValue(card)}   (you have ${save.currencies.dust})`,
      levelBonusText(card, level),
    ];
    o.add(
      this.add
        .text(GAME_WIDTH / 2, 60 + CARD_H * scale + 30, lines.join('\n'), {
          fontFamily: FONT_FAMILY,
          fontSize: '30px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 8,
          resolution: 2,
          wordWrap: { width: GAME_WIDTH - 100, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 0),
    );

    const by = GAME_HEIGHT - 150;
    const act = (
      label: string,
      x: number,
      color: number,
      shadow: number,
      run: () => ReturnType<typeof craft>,
    ) =>
      o.add(
        new Button(this, x, by, label, {
          width: 300,
          height: 120,
          fontSize: 36,
          color,
          shadowColor: shadow,
          onClick: () => {
            const r = run();
            if (!r.ok) {
              showToast(this, r.error);
              return;
            }
            void saves()
              .commit(r.save)
              .then(() => {
                this.refresh(true);
                this.openDetail(card);
              });
          },
        }),
      );
    act('Level Up', 190, COLORS.primary, COLORS.primaryDark, () => levelUp(saves().save, card.id, ctx));
    act('Craft', 540, COLORS.secondary, COLORS.secondaryDark, () => craft(saves().save, card.id, ctx));
    act('Scrap', 890, COLORS.danger, COLORS.dangerDark, () => scrap(saves().save, card.id, ctx));
  }

  private closeDetail(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.grid.enabled = true;
    this.search?.setVisible(true);
  }
}
