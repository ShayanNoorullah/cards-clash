import { audio } from '../services/audio';
import Phaser from 'phaser';
import { ArtCache } from '../art/ArtCache';
import { CARD_H } from '../art/cardLayout';
import { ART_KEYS } from '../art/frames';
import { PALETTE } from '../art/palette';
import { addBackground } from '../art/proceduralTextures';
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config/display';
import { playableHeroes } from '../engine/cards';
import { getContent } from '../engine/content';
import { maxCopiesFor } from '../engine/deck';
import { PLAYABLE_LANDSCAPES, type CardDef, type CardLandscape, type LandscapeType } from '../engine/types';
import { heroUnlocked, heroUnlockLevel } from '../progression/levels';
import { saves } from '../save';
import { ownedCount } from '../save/collection';
import {
  addCard,
  autoFill,
  canAdd,
  castable,
  deckIssues,
  deckSize,
  encodeDeck,
  manaCurve,
  removeCard,
} from '../save/decks';
import { DEFAULT_FILTER, filterCards, type CardFilter } from '../save/filters';
import type { DeckSlot } from '../save/saveData';
import { Button } from '../ui/Button';
import { CardView } from '../ui/CardView';
import { Chips } from '../ui/Chips';
import { ScrollGrid } from '../ui/ScrollGrid';
import { addTextField } from '../ui/TextField';
import { COLORS, hex, textStyle } from '../ui/theme';
import { showToast } from '../ui/Toast';
import { fadeIn, goToScene } from '../ui/transitions';
import { inspectCard, openOverlay, pickFromList, promptText, showDeckCode } from './deckUi';

const GRID_TOP = 600;
const GRID_BOTTOM = 1390;
const LIST_TOP = 1450;
const CARD_SCALE = 0.62;

type View = 'castable' | 'all' | CardLandscape;

/** Edit one deck slot. Every change is saved immediately. */
export class DeckBuilderScene extends Phaser.Scene {
  private slotIndex = 0;
  private deck!: DeckSlot;
  private view: View = 'castable';
  private query = '';
  private grid!: ScrollGrid;
  private list!: ScrollGrid;
  private header!: Phaser.GameObjects.Container;
  private search!: Phaser.GameObjects.DOMElement;

  constructor() {
    super(SCENE_KEYS.DeckBuilder);
  }

  create(data?: { slot?: number }): void {
    fadeIn(this);
    addBackground(this);
    audio.playMusic('menu');
    this.slotIndex = data?.slot ?? 0;
    const slot = saves().save.decks[this.slotIndex];
    if (!slot) {
      goToScene(this, SCENE_KEYS.Decks);
      return;
    }
    this.deck = structuredClone(slot);
    this.view = 'castable';
    this.query = '';

    const bg = this.add.graphics().setDepth(5);
    bg.fillStyle(COLORS.panel, 0.95);
    bg.fillRect(0, 0, GAME_WIDTH, GRID_TOP - 6);
    bg.fillStyle(COLORS.panel, 0.95);
    bg.fillRect(0, GRID_BOTTOM + 4, GAME_WIDTH, GAME_HEIGHT - GRID_BOTTOM);
    this.header = this.add.container(0, 0).setDepth(6);

    this.grid = new ScrollGrid(this, {
      x: 0,
      y: GRID_TOP,
      width: GAME_WIDTH,
      height: GRID_BOTTOM - GRID_TOP,
      cols: 3,
      cellHeight: CARD_H * CARD_SCALE + 40,
    });
    this.list = new ScrollGrid(this, {
      x: 20,
      y: LIST_TOP,
      width: GAME_WIDTH - 40,
      height: GAME_HEIGHT - LIST_TOP - 10,
      cols: 2,
      cellHeight: 66,
    }).setDepth(7);

    const views: { value: View; label: string; color?: number }[] = [
      { value: 'castable', label: 'Castable' },
      { value: 'all', label: 'All' },
      ...(['azure', 'golden', 'murk', 'dune', 'candy', 'neutral'] as const).map((l) => ({
        value: l as View,
        label: PALETTE[l].name.split(' ')[0]!,
        color: PALETTE[l].dark,
      })),
    ];
    new Chips(
      this,
      GAME_WIDTH / 2,
      430,
      views,
      'castable',
      (v) => {
        this.view = v;
        this.refreshGrid(false);
      },
      { fontSize: 22, height: 52 },
    ).setDepth(7);
    this.search = addTextField(this, GAME_WIDTH / 2, 555, {
      width: 700,
      height: 60,
      placeholder: 'Search…',
      fontSize: 28,
      onChange: (q) => {
        this.query = q;
        this.refreshGrid(false);
      },
    }).setDepth(7);

    this.renderHeader();
    this.refreshGrid(false);
    this.refreshList();
    this.input.keyboard?.on('keydown-ESC', () => goToScene(this, SCENE_KEYS.Decks));
  }

  private get dom(): Phaser.GameObjects.DOMElement[] {
    return [this.search];
  }

  private async commit(next: DeckSlot, refreshGrid = true): Promise<void> {
    this.deck = { ...next, updatedAt: Date.now() };
    await saves().update((s) => void (s.decks[this.slotIndex] = this.deck));
    this.renderHeader();
    if (refreshGrid) this.refreshGrid(true);
    this.refreshList();
  }

  // -------------------------------------------------------------------------
  // Header: name, hero, landscapes, count, curve, status, tools
  // -------------------------------------------------------------------------

  private renderHeader(): void {
    const { ctx } = getContent();
    const save = saves().save;
    const h = this.header;
    h.removeAll(true);
    const deck = this.deck;

    h.add(
      new Button(this, 90, 60, 'Back', {
        width: 150,
        height: 76,
        fontSize: 32,
        color: COLORS.danger,
        shadowColor: COLORS.dangerDark,
        onClick: () => goToScene(this, SCENE_KEYS.Decks),
      }),
    );
    const name = this.add
      .text(GAME_WIDTH / 2 + 40, 60, `${deck.name}  ✎`, textStyle(46))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    name.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
      promptText(
        this,
        'Rename deck',
        'Up to 24 characters.',
        deck.name,
        'Save',
        (v) => {
          if (!v) return 'The name cannot be empty.';
          void this.commit({ ...this.deck, name: v.slice(0, 24) }, false);
          return null;
        },
        this.dom,
        24,
      ),
    );
    h.add(name);

    // Hero
    const hero = ctx.heroes.byId.get(deck.heroId)!;
    const portrait = ArtCache.heroImage(this, 110, 200, hero)
      .setDisplaySize(150, 150)
      .setInteractive({ useHandCursor: true });
    portrait.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
      pickFromList(
        this,
        'Choose a hero',
        playableHeroes(ctx.heroes).map((x) => {
          const unlocked = heroUnlocked(x.id, saves().save.progression.level);
          return {
            label: unlocked ? x.name : `🔒 ${x.name}`,
            caption: unlocked ? x.ultimate.text : `Unlocks at level ${heroUnlockLevel(x.id)}`,
            color: unlocked ? PALETTE[x.landscape].dark : 0x3a3550,
            onPick: () => {
              if (!unlocked) showToast(this, `${x.name} unlocks at player level ${heroUnlockLevel(x.id)}.`);
              else void this.commit({ ...this.deck, heroId: x.id }, false);
            },
          };
        }),
        this.dom,
      ),
    );
    h.add(portrait);
    h.add(this.add.text(110, 290, hero.name, textStyle(22)).setOrigin(0.5));

    // Landscapes: tap to cycle the type.
    deck.landscapes.forEach((l, i) => {
      const x = 255 + i * 98;
      const img = this.add
        .image(x, 185, ART_KEYS.landIcon(l))
        .setDisplaySize(96, 96)
        .setInteractive({ useHandCursor: true });
      img.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        const next = PLAYABLE_LANDSCAPES[(PLAYABLE_LANDSCAPES.indexOf(l) + 1) % PLAYABLE_LANDSCAPES.length]!;
        const landscapes = [...this.deck.landscapes] as LandscapeType[];
        landscapes[i] = next;
        void this.commit({ ...this.deck, landscapes });
      });
      h.add(img);
    });
    h.add(
      this.add
        .text(440, 255, 'Tap a landscape to change it', textStyle(20, { color: hex(COLORS.textDim) }))
        .setOrigin(0.5),
    );

    // Count + curve
    const size = deckSize(deck);
    h.add(
      this.add
        .text(
          752,
          130,
          `${size}/${ctx.balance.deckSize}`,
          textStyle(52, { color: size === ctx.balance.deckSize ? '#8dff7a' : '#ffffff' }),
        )
        .setOrigin(0.5),
    );
    const curve = manaCurve(deck, ctx);
    const maxBar = Math.max(4, ...curve);
    const g = this.add.graphics();
    curve.forEach((n, cost) => {
      const x = 652 + cost * 34;
      const bh = (n / maxBar) * 80;
      g.fillStyle(0x2a2350, 1);
      g.fillRect(x - 13, 190, 26, 80);
      g.fillStyle(0x4f8cff, 1);
      g.fillRect(x - 13, 270 - bh, 26, bh);
      h.add(this.add.text(x, 286, cost === 6 ? '6+' : String(cost), textStyle(18)).setOrigin(0.5));
    });
    h.add(g);

    // Status
    const issues = deckIssues(deck, save, ctx);
    const status =
      issues.errors.length > 0
        ? `⚠ ${issues.errors[0]}`
        : issues.warnings.length > 0
          ? `Playable · ⚠ ${issues.warnings.length} warning(s)`
          : '✓ Ready to play';
    const st = this.add
      .text(
        GAME_WIDTH / 2,
        335,
        status,
        textStyle(26, {
          color: issues.errors.length ? '#ff9a9a' : issues.warnings.length ? '#ffd27a' : '#8dff7a',
          wordWrap: { width: 980 },
        }),
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    st.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.showIssues());
    h.add(st);

    // Tools
    h.add(
      new Button(this, 975, 200, 'Auto-fill', {
        width: 180,
        height: 70,
        fontSize: 26,
        color: COLORS.primary,
        shadowColor: COLORS.primaryDark,
        onClick: () => this.autoFill(),
      }),
    );
    h.add(
      new Button(this, 975, 60, 'Code', {
        width: 180,
        height: 70,
        fontSize: 28,
        color: COLORS.secondary,
        shadowColor: COLORS.secondaryDark,
        onClick: () => showDeckCode(this, encodeDeck(this.deck), this.dom),
      }),
    );
    h.add(
      new Button(this, 975, 280, 'Clear', {
        width: 180,
        height: 60,
        fontSize: 24,
        color: COLORS.danger,
        shadowColor: COLORS.dangerDark,
        onClick: () => void this.commit({ ...this.deck, cards: {} }),
      }),
    );
  }

  private showIssues(): void {
    const { ctx } = getContent();
    const issues = deckIssues(this.deck, saves().save, ctx);
    const o = openOverlay(this, this.dom, true);
    const lines = [...issues.errors.map((e) => `✗ ${e}`), ...issues.warnings.map((w) => `⚠ ${w}`)];
    o.container.add(
      this.add
        .text(GAME_WIDTH / 2, 160, 'Deck check', textStyle(60, { color: hex(COLORS.accent) }))
        .setOrigin(0.5),
    );
    o.container.add(
      this.add
        .text(80, 260, lines.length ? lines.slice(0, 22).join('\n') : '✓ This deck is ready to play!', {
          fontFamily: FONT_FAMILY,
          fontSize: '30px',
          color: '#ffffff',
          lineSpacing: 8,
          wordWrap: { width: GAME_WIDTH - 160, useAdvancedWrap: true },
        })
        .setOrigin(0, 0),
    );
  }

  private autoFill(): void {
    const { ctx } = getContent();
    const before = deckSize(this.deck);
    const filled = autoFill(this.deck, saves().save, ctx, Date.now());
    const added = deckSize(filled) - before;
    showToast(
      this,
      added > 0 ? `Added ${added} card(s).` : 'Nothing to add: the deck is full or no castable cards remain.',
    );
    void this.commit(filled);
  }

  // -------------------------------------------------------------------------
  // Card pool and deck list
  // -------------------------------------------------------------------------

  private filter(): CardFilter {
    const v = this.view;
    return {
      ...DEFAULT_FILTER,
      ownership: 'owned',
      query: this.query,
      landscape: v === 'castable' || v === 'all' ? 'all' : v,
      ...(v === 'castable' ? { castableWith: (c: CardDef) => castable(c, this.deck.landscapes) } : {}),
    };
  }

  private refreshGrid(keepScroll: boolean): void {
    const { ctx } = getContent();
    const save = saves().save;
    const cards = filterCards(ctx.cards.all, this.filter(), save);
    this.grid.setItems(
      cards.map((card) => ({
        build: (scene, x, y) => this.poolCell(scene, x, y, card),
        onTap: () => {
          const why = canAdd(this.deck, card.id, saves().save, ctx);
          if (why) {
            showToast(this, why);
            return;
          }
          void this.commit(addCard(this.deck, card.id, Date.now()));
        },
        onLongPress: () =>
          inspectCard(
            this,
            card,
            [`In deck ${this.deck.cards[card.id] ?? 0} · owned ${ownedCount(saves().save, card.id)}`],
            this.dom,
          ),
      })),
      keepScroll,
    );
  }

  private poolCell(scene: Phaser.Scene, x: number, y: number, card: CardDef): Phaser.GameObjects.Container {
    const { ctx } = getContent();
    const c = scene.add.container(x, y - 12);
    const view = new CardView(scene, 0, 0, card).setScale(CARD_SCALE);
    const inDeck = this.deck.cards[card.id] ?? 0;
    const limit = Math.min(maxCopiesFor(card.rarity, ctx.balance), ownedCount(saves().save, card.id));
    if (inDeck >= limit) view.setAlpha(0.45);
    c.add(view);
    const g = scene.add.graphics();
    g.fillStyle(inDeck > 0 ? COLORS.accent : COLORS.outline, 0.95);
    g.fillRoundedRect(-58, (CARD_H * CARD_SCALE) / 2 + 2, 116, 34, 12);
    c.add(g);
    c.add(
      scene.add
        .text(
          0,
          (CARD_H * CARD_SCALE) / 2 + 19,
          `${inDeck}/${limit}`,
          textStyle(22, { color: inDeck > 0 ? '#120c2b' : '#ffffff', strokeThickness: inDeck > 0 ? 0 : 3 }),
        )
        .setOrigin(0.5),
    );
    return c;
  }

  private refreshList(): void {
    const { ctx } = getContent();
    const entries = Object.entries(this.deck.cards)
      .map(([id, n]) => ({ card: ctx.cards.byId.get(id)!, n }))
      .filter((e) => e.card)
      .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
    this.list.setItems(
      entries.map(({ card, n }) => ({
        build: (scene, x, y) => {
          const c = scene.add.container(x, y);
          const w = (GAME_WIDTH - 60) / 2;
          const g = scene.add.graphics();
          g.fillStyle(PALETTE[card.landscape].dark, 1);
          g.fillRoundedRect(-w / 2, -28, w, 56, 14);
          c.add(g);
          c.add(scene.add.image(-w / 2 + 28, 0, ART_KEYS.costGem).setDisplaySize(44, 44));
          c.add(scene.add.text(-w / 2 + 28, 0, String(card.cost), textStyle(24)).setOrigin(0.5));
          const label = scene.add
            .text(-w / 2 + 62, 0, card.name, textStyle(24, { strokeThickness: 4 }))
            .setOrigin(0, 0.5);
          if (label.width > w - 140) label.setScale((w - 140) / label.width);
          c.add(label);
          c.add(
            scene.add.text(w / 2 - 20, 0, `×${n}`, textStyle(28, { color: '#fff3c4' })).setOrigin(1, 0.5),
          );
          return c;
        },
        onTap: () => void this.commit(removeCard(this.deck, card.id, Date.now())),
        onLongPress: () => inspectCard(this, card, ['Tap a row to remove one copy.'], this.dom),
      })),
      true,
    );
    const total = deckSize(this.deck);
    const key = '__listTitle';
    (this.children.getByName(key) as Phaser.GameObjects.Text | null)?.destroy();
    this.add
      .text(
        GAME_WIDTH / 2,
        LIST_TOP - 30,
        total === 0
          ? 'Your deck is empty — tap cards above to add them'
          : `Deck list (${total}) — tap a row to remove`,
        textStyle(26, { color: hex(COLORS.textDim) }),
      )
      .setOrigin(0.5)
      .setName(key)
      .setDepth(7);
  }
}
